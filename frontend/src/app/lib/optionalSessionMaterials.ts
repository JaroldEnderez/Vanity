import type { PackageMeasure } from "@prisma/client";
import type { DraftMaterial } from "@/src/app/store/saleStore";

/** Stored material row on Sale.optionalMaterials */
export type StoredOptionalMaterial = {
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  packageAmount?: number | null;
  packageMeasure?: PackageMeasure | null;
};

/** Legacy: plain array. Current: { materials: [...], remarks?: string } */
function parseMaterialRows(raw: unknown): DraftMaterial[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: DraftMaterial[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue;
    const o = row as Record<string, unknown>;
    const materialId = String(o.materialId ?? "");
    const quantity = Number(o.quantity);
    if (!materialId || !Number.isFinite(quantity) || quantity <= 0) continue;
    out.push({
      materialId,
      name: String(o.name ?? "Material"),
      unit: String(o.unit ?? "pcs"),
      quantity,
      packageAmount:
        o.packageAmount === null || o.packageAmount === undefined
          ? null
          : Number(o.packageAmount),
      packageMeasure: (o.packageMeasure as PackageMeasure | null | undefined) ?? null,
    });
  }
  return out;
}

export function parseOptionalMaterialsJson(raw: unknown): DraftMaterial[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return parseMaterialRows(raw);
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.materials)) {
      return parseMaterialRows(o.materials);
    }
  }
  return [];
}

export function parseOptionalSessionRemarks(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const r = (raw as Record<string, unknown>).remarks;
    if (typeof r === "string") return r;
  }
  return "";
}

export function draftMaterialsToJson(materials: DraftMaterial[]): StoredOptionalMaterial[] {
  return materials.map((m) => ({
    materialId: m.materialId,
    name: m.name,
    unit: m.unit,
    quantity: m.quantity,
    packageAmount: m.packageAmount ?? null,
    packageMeasure: m.packageMeasure ?? null,
  }));
}

/** PATCH body value for Sale.optionalMaterials */
export function serializeOptionalMaterialsForApi(
  materials: DraftMaterial[],
  remarks: string
): unknown {
  const rows = draftMaterialsToJson(materials);
  const r = remarks.trim();
  if (rows.length === 0 && !r) return [];
  if (rows.length === 0) {
    return { materials: [], remarks: r };
  }
  if (!r) {
    return { materials: rows };
  }
  return { materials: rows, remarks: r };
}

export function optionalJsonToDeductionRows(
  raw: unknown
): Array<{ materialId: string; quantity: number }> {
  return parseOptionalMaterialsJson(raw).map((m) => ({
    materialId: m.materialId,
    quantity: m.quantity,
  }));
}
