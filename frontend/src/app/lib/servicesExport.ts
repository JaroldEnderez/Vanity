import { labelServiceCategory } from "@/src/app/types/service";

export type ServiceForExport = {
  id: string;
  name: string;
  category: string;
  hairColoringFlow: boolean;
  description: string | null;
  durationMin: number | null;
  price: number;
  isActive: boolean;
  usesMaterials: boolean;
  materials?: Array<{
    quantity: number;
    material: { name: string; unit: string };
  }>;
};

export type ServiceExportRow = {
  Name: string;
  Category: string;
  Price: string;
  "Duration (min)": string;
  Description: string;
  "Hair coloring flow": string;
  "Uses materials": string;
  Materials: string;
  Id: string;
};

function boolLabel(v: boolean): string {
  return v ? "Yes" : "No";
}

function materialsSummary(s: ServiceForExport): string {
  const m = s.materials;
  if (!m?.length) return "";
  return m
    .map((row) => {
      const unit = row.material.unit?.trim() || "";
      const qty = row.quantity;
      return unit ? `${row.material.name} (${qty} ${unit})` : `${row.material.name} (${qty})`;
    })
    .join("; ");
}

export function flattenServicesToRows(services: ServiceForExport[]): ServiceExportRow[] {
  return services.map((s) => ({
    Name: s.name?.trim() ?? "",
    Category: labelServiceCategory(s.category),
    Price: String(s.price),
    "Duration (min)": s.durationMin != null ? String(s.durationMin) : "",
    Description: s.description?.trim() ?? "",
    "Hair coloring flow": boolLabel(!!s.hairColoringFlow),
    "Uses materials": boolLabel(!!s.usesMaterials),
    Materials: materialsSummary(s),
    Id: s.id,
  }));
}

const CSV_COLUMNS: (keyof ServiceExportRow)[] = [
  "Name",
  "Category",
  "Price",
  "Duration (min)",
  "Description",
  "Hair coloring flow",
  "Uses materials",
  "Materials",
  "Id",
];

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** UTF-8 BOM so Excel recognizes encoding on double-click open. */
export function buildServicesCsvBuffer(rows: ServiceExportRow[]): Buffer {
  const header = CSV_COLUMNS.map((k) => escapeCsvCell(k)).join(",");
  const lines = [
    header,
    ...rows.map((row) =>
      CSV_COLUMNS.map((col) => escapeCsvCell(row[col] ?? "")).join(",")
    ),
  ];
  const body = lines.join("\r\n") + (lines.length > 1 ? "\r\n" : "");
  return Buffer.from("\ufeff" + body, "utf8");
}
