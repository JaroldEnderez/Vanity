const BACKEND_URL = process.env.BACKEND_URL

async function proxy(request: Request, path: string[], method: string) {
  const url = `${BACKEND_URL}/${path.join("/")}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.text();

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path, "GET");
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path, "POST");
}

export async function PUT(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path, "PUT");
}

export async function DELETE(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params.path, "DELETE");
}
