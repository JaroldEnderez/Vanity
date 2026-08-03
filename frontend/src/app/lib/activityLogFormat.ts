/** Pure helpers for activity log summaries / UI (safe for client + server). */

export type FieldChange = {
  field: string;
  from?: unknown;
  to?: unknown;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  price: "Price",
  category: "Category",
  durationMin: "Duration (min)",
  description: "Description",
  hairColoringFlow: "Hair coloring flow",
  isActive: "Active",
  unit: "Unit",
  stock: "Stock",
  sku: "SKU",
  packageAmount: "Package amount",
  packageMeasure: "Package measure",
  phone: "Phone",
  address: "Address",
  fb: "Facebook",
  dateOfBirth: "Date of birth",
  role: "Role",
  total: "Total",
  customerId: "Customer",
  staffId: "Staff",
  discountPercent: "Discount %",
  discountLabel: "Discount label",
  discountAmount: "Discount amount",
  count: "Count",
  filename: "File",
  created: "Created",
  updated: "Updated",
};

const MONEY_FIELDS = new Set(["price", "total", "discountAmount"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  // Normalize date strings for comparison
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function formatFieldValue(field: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (MONEY_FIELDS.has(field) && typeof value === "number") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value);
  }
  if (field === "dateOfBirth") {
    const d = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-PH", { dateStyle: "medium" });
    }
  }
  return String(value);
}

/** Fields that changed between before and after (only keys present in either). */
export function getFieldChanges(
  before: unknown,
  after: unknown
): FieldChange[] {
  const b = isPlainObject(before) ? before : {};
  const a = isPlainObject(after) ? after : {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const changes: FieldChange[] = [];
  for (const field of keys) {
    const from = b[field];
    const to = a[field];
    if (valuesEqual(from, to)) continue;
    changes.push({ field, from, to });
  }
  return changes;
}

/** "Price: ₱100 → ₱200" lines for updates; for create/delete use snapshot lines. */
export function formatChangeLines(before: unknown, after: unknown): string[] {
  const hasBefore = isPlainObject(before) && Object.keys(before).length > 0;
  const hasAfter = isPlainObject(after) && Object.keys(after).length > 0;

  if (hasBefore && hasAfter) {
    return getFieldChanges(before, after).map((c) => {
      const label = fieldLabel(c.field);
      return `${label}: ${formatFieldValue(c.field, c.from)} → ${formatFieldValue(c.field, c.to)}`;
    });
  }

  const snap = hasAfter ? after : hasBefore ? before : null;
  if (!snap) return [];
  return Object.entries(snap).map(
    ([field, value]) => `${fieldLabel(field)}: ${formatFieldValue(field, value)}`
  );
}

/** Append change details to a base summary, e.g. `Updated service "Cut" · Price: ₱100 → ₱200`. */
export function withChangeDetails(
  base: string,
  before?: unknown,
  after?: unknown
): string {
  const lines = formatChangeLines(before, after);
  if (lines.length === 0) return base;
  return `${base} · ${lines.join(" · ")}`;
}
