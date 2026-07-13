/**
 * k6 load test for Vanity POS heavy endpoints.
 *
 * Prerequisites:
 *   - App running: npm run dev  (http://localhost:3000)
 *   - DB seeded: npm run db:seed
 *   - k6 installed: https://k6.io/docs/get-started/installation/
 *
 * Examples (run from frontend/):
 *   k6 run test.js
 *   k6 run -e VUS=10 -e DURATION=30s test.js
 *   k6 run -e SCENARIO=session test.js
 *   k6 run -e SCENARIO=sale-checkout test.js
 *   k6 run -e SCENARIO=read test.js
 *   k6 run -e BASE_URL=http://localhost:3000 -e EMAIL=downtown@vanity.com -e PASSWORD=password123 test.js
 *   k6 run -e DEBUG_POST=0 test.js   # silence POST debug logs
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.EMAIL || 'downtown@vanity.com';
const PASSWORD = __ENV.PASSWORD || 'password123';
const SCENARIO = (__ENV.SCENARIO || 'all').toLowerCase();
/** Log status + body for every POST (set DEBUG_POST=0 to disable). */
const DEBUG_POST = __ENV.DEBUG_POST !== '0';
const POST_BODY_MAX = Number(__ENV.POST_BODY_MAX) || 500;

const saleFlowDuration = new Trend('sale_flow_duration', true);
const saleFlowErrors = new Rate('sale_flow_errors');
const saleFlowOk = new Counter('sale_flow_ok');

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.15'],
    sale_flow_errors: ['rate<0.15'],
    http_req_duration: ['p(95)<5000'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Seed defaults — used only if setup cannot read /api/services or /api/staff */
const FALLBACK = {
  staffId: null,
  services: [
    { id: null, name: 'Haircut', price: 250 },
    { id: null, name: 'Hair Spa', price: 800 },
    { id: null, name: 'Blow Dry & Styling', price: 400 },
  ],
};

function url(path) {
  return `${BASE_URL}${path}`;
}

function parseJson(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

function bodyPreview(res) {
  const raw = res.body == null ? '' : String(res.body);
  if (raw.length <= POST_BODY_MAX) return raw;
  return `${raw.slice(0, POST_BODY_MAX)}…[truncated ${raw.length - POST_BODY_MAX} chars]`;
}

/** Debug: log POST status and response body (final response after redirects). */
function logPost(label, res, requestBody) {
  if (!DEBUG_POST) return;
  const vu = typeof __VU !== 'undefined' ? __VU : 'setup';
  const iter = typeof __ITER !== 'undefined' ? __ITER : '-';
  const req =
    requestBody !== undefined
      ? ` request=${JSON.stringify(requestBody).slice(0, POST_BODY_MAX)}`
      : '';
  console.log(
    `[VU ${vu} iter ${iter}] POST ${label} → status=${res.status}${req} body=${bodyPreview(res)}`
  );
}

function login(jar, quietChecks) {
  const csrfRes = http.get(url('/api/auth/csrf'), { jar });
  const csrfOk = csrfRes.status === 200;
  if (!quietChecks) {
    check(csrfRes, { 'csrf status 200': (r) => r.status === 200 });
  }
  if (!csrfOk) return false;

  const csrfToken = parseJson(csrfRes)?.csrfToken;
  if (!csrfToken) return false;

  const loginPayload = {
    email: EMAIL,
    password: PASSWORD,
    csrfToken,
    redirect: 'false',
    callbackUrl: url('/login'),
  };
  const loginRes = http.post(url('/api/auth/callback/credentials'), loginPayload, {
    jar,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    redirects: 0,
  });
  logPost('/api/auth/callback/credentials', loginRes, {
    email: EMAIL,
    redirect: 'false',
  });

  const loginOk = loginRes.status === 200 || loginRes.status === 302;
  if (!quietChecks) {
    check(loginRes, {
      'login accepted': (r) => r.status === 200 || r.status === 302,
    });
  }
  return loginOk;
}

/** Each VU has its own cookie jar; log in once on the first iteration. */
function ensureVuAuthed(jar) {
  if (__ITER > 0) return true;
  const ok = login(jar, false);
  if (!ok) {
    console.error(`[VU ${__VU}] login failed — check credentials and BASE_URL=${BASE_URL}`);
  }
  return ok;
}

function authedJson(jar, method, path, body) {
  const params = {
    jar,
    headers: JSON_HEADERS,
    tags: { name: path },
    redirects: 0,
  };
  if (method === 'GET') return http.get(url(path), params);
  const res = http.post(url(path), JSON.stringify(body), params);
  logPost(path, res, body);
  return res;
}

function pickService(services, preferHairColoring) {
  if (!services?.length) return null;
  if (preferHairColoring) {
    const color = services.find((s) => s.hairColoringFlow || /color|balayage/i.test(s.name));
    if (color) return color;
  }
  const light = services.find((s) => !s.hairColoringFlow && (s.price || 0) <= 500);
  return light || services[0];
}

/** One full POS session: create draft → add line → checkout (inventory + transaction) */
function runSessionCheckout(jar, data) {
  const staffId = data.staffId;
  const service = pickService(data.services, false);
  if (!staffId || !service?.id) {
    saleFlowErrors.add(1);
    return;
  }

  const t0 = Date.now();
  const sessionName = `k6-${__VU}-${__ITER}-${Date.now()}`;

  const createRes = authedJson(jar, 'POST', '/api/sessions', {
    staffId,
    name: sessionName,
  });
  if (
    !check(createRes, {
      'POST /api/sessions 201': (r) => r.status === 201,
    })
  ) {
    saleFlowErrors.add(1);
    return;
  }

  const session = parseJson(createRes);
  const sessionId = session?.id;
  if (!sessionId) {
    saleFlowErrors.add(1);
    return;
  }

  const itemRes = authedJson(jar, 'POST', `/api/sessions/${sessionId}/items`, {
    serviceId: service.id,
    qty: 1,
    price: service.price ?? 250,
  });
  if (
    !check(itemRes, {
      'POST session item 200': (r) => r.status === 200,
    })
  ) {
    saleFlowErrors.add(1);
    return;
  }

  const updated = parseJson(itemRes);
  const total = updated?.total ?? service.price ?? 250;

  const checkoutRes = authedJson(jar, 'POST', `/api/sessions/${sessionId}/checkout`, {
    cashReceived: total + 100,
  });
  const ok = check(checkoutRes, {
    'POST session checkout 200': (r) => r.status === 200,
    'session completed': (r) => parseJson(r)?.status === 'COMPLETED',
  });

  saleFlowDuration.add(Date.now() - t0);
  if (ok) {
    saleFlowOk.add(1);
  } else {
    saleFlowErrors.add(1);
  }
}

/** POST /api/sales (draft) then POST /api/sales/:id/checkout */
function runDirectSaleCheckout(jar, data) {
  const staffId = data.staffId;
  const service = pickService(data.services, true);
  if (!staffId || !service?.id) {
    saleFlowErrors.add(1);
    return;
  }

  const t0 = Date.now();
  const price = service.price ?? 1500;

  const createRes = authedJson(jar, 'POST', '/api/sales', {
    staffId,
    services: [{ serviceId: service.id, qty: 1, price }],
  });
  if (
    !check(createRes, {
      'POST /api/sales 201': (r) => r.status === 201,
    })
  ) {
    saleFlowErrors.add(1);
    return;
  }

  const sale = parseJson(createRes);
  const saleId = sale?.id;
  if (!saleId) {
    saleFlowErrors.add(1);
    return;
  }

  const checkoutRes = authedJson(jar, 'POST', `/api/sales/${saleId}/checkout`, {});
  const ok = check(checkoutRes, {
    'POST /api/sales/:id/checkout 200': (r) => r.status === 200,
    'sale completed': (r) => parseJson(r)?.status === 'COMPLETED',
  });

  saleFlowDuration.add(Date.now() - t0);
  if (ok) saleFlowOk.add(1);
  else saleFlowErrors.add(1);
}

/** Read-heavy endpoints (dashboard / lists) */
function runReadEndpoints(jar) {
  const endpoints = [
    { path: '/api/sessions', expect: 200 },
    { path: '/api/sales', expect: 200 },
    { path: '/api/staff', expect: 200 },
    { path: '/api/services', expect: 200 },
    { path: '/api/materials', expect: 200 },
    { path: '/api/sales/analytics?interval=hour', expect: 200 },
  ];

  for (const { path, expect } of endpoints) {
    const res = http.get(url(path), { jar, tags: { name: path }, redirects: 0 });
    check(res, { [`GET ${path}`]: (r) => r.status === expect });
  }
}

export function setup() {
  const jar = http.cookieJar();
  if (!login(jar, true)) {
    throw new Error(
      `Login failed for ${EMAIL}. Start the app, run npm run db:seed, and check credentials.`
    );
  }

  const staffRes = http.get(url('/api/staff'), { jar });
  const servicesRes = http.get(url('/api/services'), { jar });

  let staffId = null;
  let services = [];

  if (staffRes.status === 200) {
    const staff = parseJson(staffRes);
    if (Array.isArray(staff) && staff.length > 0) {
      staffId = staff[0].id;
    }
  }

  if (servicesRes.status === 200) {
    const list = parseJson(servicesRes);
    if (Array.isArray(list) && list.length > 0) {
      services = list.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        hairColoringFlow: s.hairColoringFlow,
      }));
    }
  }

  if (!staffId || services.length === 0) {
    console.warn(
      'Setup could not load staff/services from API. Run db:seed and ensure branch has data.'
    );
  }

  return {
    staffId,
    services: services.length ? services : FALLBACK.services,
  };
}

export default function (data) {
  const jar = http.cookieJar();
  if (!ensureVuAuthed(jar)) return;

  switch (SCENARIO) {
    case 'session':
      runSessionCheckout(jar, data);
      break;
    case 'sale-checkout':
    case 'sales':
      runDirectSaleCheckout(jar, data);
      break;
    case 'read':
      runReadEndpoints(jar);
      break;
    case 'all':
    default:
      // Weight toward write/heavy paths
      if (__ITER % 3 === 0) {
        runReadEndpoints(jar);
      } else if (__ITER % 3 === 1) {
        runSessionCheckout(jar, data);
      } else {
        runDirectSaleCheckout(jar, data);
      }
      break;
  }

  sleep(Number(__ENV.SLEEP) || 0.3);
}
