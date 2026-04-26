export type CustomerExportRow = {
  Name: string;
  Address: string;
  Contact: string;
  Fb: string;
  "Date of birth": string;
  "Created at": string;
  Id: string;
};

export type CustomerForExport = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fb: string | null;
  dateOfBirth: Date | null;
  createdAt: Date;
};

function formatDateOnly(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

function formatDateTimeIso(d: Date): string {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString();
}

export function flattenCustomersToRows(
  customers: CustomerForExport[]
): CustomerExportRow[] {
  return customers.map((c) => ({
    Name: c.name ?? "",
    Address: c.address?.trim() ?? "",
    Contact: c.phone?.trim() ?? "",
    Fb: c.fb?.trim() ?? "",
    "Date of birth": formatDateOnly(c.dateOfBirth),
    "Created at": formatDateTimeIso(c.createdAt),
    Id: c.id,
  }));
}

const CSV_COLUMNS: (keyof CustomerExportRow)[] = [
  "Name",
  "Address",
  "Contact",
  "Fb",
  "Date of birth",
  "Created at",
  "Id",
];

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Excel opens CSV with auto-conversion: plain digits become numbers (9.81E+08, leading zeros lost).
 * Emit an Excel text formula so the cell displays exactly as stored (e.g. 0981291341).
 */
function escapeCsvContactForExcel(value: string): string {
  if (value === "") return "";
  const formula = `="${value.replace(/"/g, '""')}"`;
  return `"${formula.replace(/"/g, '""')}"`;
}

/** UTF-8 BOM so Excel recognizes encoding on double-click open. */
export function buildCustomersCsvBuffer(rows: CustomerExportRow[]): Buffer {
  const header = CSV_COLUMNS.map((k) => escapeCsvCell(k)).join(",");
  const lines = [
    header,
    ...rows.map((row) =>
      CSV_COLUMNS.map((col) => {
        const v = row[col] ?? "";
        return col === "Contact" ? escapeCsvContactForExcel(v) : escapeCsvCell(v);
      }).join(",")
    ),
  ];
  const body = lines.join("\r\n") + (lines.length > 1 ? "\r\n" : "");
  return Buffer.from("\ufeff" + body, "utf8");
}
