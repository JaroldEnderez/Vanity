import type { MaterialCategory, PackageMeasure } from "@prisma/client";
import Papa from "papaparse";

import { normalizePackageInput } from "@/src/app/lib/materialPackage";

/** Canonical CSV columns (headers matched case-insensitively). */
export const MATERIAL_IMPORT_COLUMNS = [
  "sku",
  "name",
  "category",
  "packaging",
  "package_amount",
  "package_measure",
  "stock",
] as const;

export type MaterialImportColumn = (typeof MATERIAL_IMPORT_COLUMNS)[number];

/** Alternate header spellings → canonical key (after lowercasing). */
const HEADER_ALIASES: Record<string, MaterialImportColumn> = {
  sku: "sku",
  name: "name",
  /** Common in salon lists; maps to packaging / unit (bottle, piece, tube). */
  item: "packaging",
  category: "category",
  packaging: "packaging",
  unit: "packaging",
  package_amount: "package_amount",
  packageamount: "package_amount",
  package_measure: "package_measure",
  packagemeasure: "package_measure",
  stock: "stock",
  material: "name",
  product: "name",
  description: "name",
  material_name: "name",
  product_name: "name",
};

export type MaterialImportParsedRow = {
  sku: string;
  name: string;
  category: MaterialCategory;
  packaging: string;
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
  /** Final stock stored on Material (ml/g for packaged, or count in `packaging` unit for legacy). */
  computedStock: number;
};

export type MaterialImportHeaderError = {
  code: "INVALID_HEADERS";
  missing: string[];
  unknown: string[];
};

export type MaterialImportRowError = {
  row: number;
  message: string;
};

export type MaterialImportParseFailure = {
  ok: false;
  error: MaterialImportHeaderError | { code: "PARSE"; message: string };
  rowErrors?: MaterialImportRowError[];
};

export type MaterialImportParseSuccess = {
  ok: true;
  rows: MaterialImportParsedRow[];
};

export type MaterialImportParseResult = MaterialImportParseFailure | MaterialImportParseSuccess;

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function normalizeHeaderToken(raw: string): string {
  return stripBom(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mapHeaderToCanonical(h: string): MaterialImportColumn | null {
  const t = normalizeHeaderToken(h);
  return HEADER_ALIASES[t] ?? (MATERIAL_IMPORT_COLUMNS.includes(t as MaterialImportColumn) ? (t as MaterialImportColumn) : null);
}

/** sku is optional: generated when blank (see deriveImportSku). */
const REQUIRED_HEADERS: MaterialImportColumn[] = ["name", "packaging"];

/** Stable SKU for rows without one, so re-imports upsert the same row. */
function deriveImportSku(name: string, packaging: string): string {
  const key = `${name.trim().toLowerCase()}\u0000${packaging.trim().toLowerCase()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return slug.length > 0 ? `CSV-${slug}-${hex}` : `CSV-${hex}`;
}

function parseCategory(raw: string): MaterialCategory | null {
  const u = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "" || u === "OTHER") return "OTHER";
  if (u === "HAIR_COLOR" || u === "HAIRCOLOR") return "HAIR_COLOR";
  if (u === "DEVELOPER") return "DEVELOPER";
  return null;
}

/** Map user CSV tokens to Prisma PackageMeasure. */
function normalizePackageMeasureToken(raw: string): string {
  const u = raw.trim().toUpperCase();
  if (u === "ML" || u === "MILLILITER" || u === "MILLILITRE") return "ML";
  if (u === "GRAM" || u === "G" || u === "GR" || u === "GMS") return "GRAM";
  return u;
}

function parseNumberCell(raw: string, field: string): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: 0 };
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n)) return { ok: false, message: `${field} must be a number` };
  if (n < 0) return { ok: false, message: `${field} cannot be negative` };
  return { ok: true, value: n };
}

/**
 * Parse and validate materials CSV. Row numbers are 1-based (row 1 = header).
 */
export function parseAndValidateMaterialsCsv(csvText: string): MaterialImportParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h,
  });

  if (parsed.errors?.length) {
    const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "FieldMismatch");
    if (fatal) {
      return { ok: false, error: { code: "PARSE", message: fatal.message || "Invalid CSV" } };
    }
  }

  const fields = parsed.meta.fields?.filter(Boolean) ?? [];
  if (fields.length === 0) {
    return { ok: false, error: { code: "PARSE", message: "File is empty or has no header row" } };
  }

  const canonicalFromFile = new Set<MaterialImportColumn>();
  const unknown: string[] = [];
  for (const f of fields) {
    const c = mapHeaderToCanonical(f);
    if (c) canonicalFromFile.add(c);
    else unknown.push(stripBom(f.trim()));
  }

  const missing = REQUIRED_HEADERS.filter((h) => !canonicalFromFile.has(h));
  if (missing.length > 0) {
    return {
      ok: false,
      error: { code: "INVALID_HEADERS", missing, unknown },
    };
  }

  const data = parsed.data ?? [];
  const rowErrors: MaterialImportRowError[] = [];
  const out: MaterialImportParsedRow[] = [];
  const seenSku = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const rawRow = data[i];
    const rowNum = i + 2;

    const cell = (col: MaterialImportColumn) => {
      const keys = Object.keys(rawRow);
      for (const k of keys) {
        const c = mapHeaderToCanonical(k);
        if (c === col) return String(rawRow[k] ?? "").trim();
      }
      return "";
    };

    let sku = cell("sku");
    const name = cell("name");
    const packaging = cell("packaging");
    const categoryRaw = cell("category");
    const pkgAmtRaw = cell("package_amount");
    const pkgMeasRaw = cell("package_measure");
    const stockRaw = cell("stock");

    if (!sku && !name && !packaging && !categoryRaw && !pkgAmtRaw && !pkgMeasRaw && !stockRaw) {
      continue;
    }

    if (!name) {
      rowErrors.push({ row: rowNum, message: "name is required" });
      continue;
    }
    if (!packaging) {
      rowErrors.push({ row: rowNum, message: "packaging (unit) is required" });
      continue;
    }

    if (!sku) {
      sku = deriveImportSku(name, packaging);
    }
    if (seenSku.has(sku)) {
      rowErrors.push({ row: rowNum, message: `Duplicate sku "${sku}" in file` });
      continue;
    }
    seenSku.add(sku);

    const cat = parseCategory(categoryRaw);
    if (categoryRaw.trim() && !cat) {
      rowErrors.push({
        row: rowNum,
        message: `Invalid category "${categoryRaw.trim()}". Use HAIR_COLOR, DEVELOPER, or OTHER`,
      });
      continue;
    }
    const category: MaterialCategory = cat ?? "OTHER";

    const hasAmt = pkgAmtRaw.length > 0;
    const hasMeas = pkgMeasRaw.length > 0;
    if (hasAmt !== hasMeas) {
      rowErrors.push({
        row: rowNum,
        message: "Set both package_amount and package_measure, or leave both empty",
      });
      continue;
    }

    let packageAmount: number | null = null;
    let packageMeasure: PackageMeasure | null = null;
    try {
      if (hasAmt && hasMeas) {
        const norm = normalizePackageInput(
          pkgAmtRaw,
          normalizePackageMeasureToken(pkgMeasRaw)
        );
        packageAmount = norm.packageAmount;
        packageMeasure = norm.packageMeasure;
      }
    } catch (e) {
      rowErrors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : "Invalid package fields",
      });
      continue;
    }

    const stockParsed = parseNumberCell(stockRaw, "stock");
    if (!stockParsed.ok) {
      rowErrors.push({ row: rowNum, message: stockParsed.message });
      continue;
    }
    const stockInput = stockParsed.value;

    let computedStock: number;
    if (packageAmount != null && packageMeasure != null) {
      computedStock = stockInput * packageAmount;
    } else {
      computedStock = stockInput;
    }

    out.push({
      sku,
      name,
      category,
      packaging,
      packageAmount,
      packageMeasure,
      computedStock,
    });
  }

  if (rowErrors.length > 0) {
    return { ok: false, error: { code: "PARSE", message: "Validation failed" }, rowErrors };
  }

  if (out.length === 0) {
    return { ok: false, error: { code: "PARSE", message: "No data rows found" } };
  }

  return { ok: true, rows: out };
}

export function materialsImportTemplateCsv(): string {
  const header = MATERIAL_IMPORT_COLUMNS.join(",");
  const example = [
    "DEV-30V-001",
    "Developer 30 vol",
    "DEVELOPER",
    "bottle",
    "1000",
    "ML",
    "10",
  ].join(",");
  return `\ufeff${header}\r\n${example}\r\n`;
}
