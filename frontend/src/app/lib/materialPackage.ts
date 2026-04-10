import type { PackageMeasure } from "@prisma/client";

/** Both set and amount positive — stock and sale quantities are in ml or g. */
export function hasPackageMaterial(m: {
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
}): boolean {
  return (
    m.packageAmount != null &&
    m.packageMeasure != null &&
    Number.isFinite(m.packageAmount) &&
    m.packageAmount > 0
  );
}

export function fractionalRetailUnits(stock: number, packageAmount: number): number {
  if (!Number.isFinite(packageAmount) || packageAmount <= 0) return stock;
  return stock / packageAmount;
}

export function formatMeasureAbbrev(measure: PackageMeasure): string {
  return measure === "ML" ? "ml" : "g";
}

/** Legacy materials: stock is count in `unit`. */
export const LEGACY_LOW_STOCK_THRESHOLD = 10;
export const LEGACY_AMBER_STOCK_THRESHOLD = 25;

/** Package materials: compare fractional retail units (bottles/tubes). */
export const PACKAGE_LOW_UNITS = 2;
export const PACKAGE_AMBER_UNITS = 3;

export function materialStockSeverity(m: {
  stock: number;
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
}): "ok" | "amber" | "red" {
  if (!hasPackageMaterial(m)) {
    if (m.stock <= LEGACY_LOW_STOCK_THRESHOLD) return "red";
    if (m.stock <= LEGACY_AMBER_STOCK_THRESHOLD) return "amber";
    return "ok";
  }
  const units = fractionalRetailUnits(m.stock, m.packageAmount!);
  if (units <= PACKAGE_LOW_UNITS) return "red";
  if (units <= PACKAGE_AMBER_UNITS) return "amber";
  return "ok";
}

export function materialStockIsLow(m: {
  stock: number;
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
}): boolean {
  return materialStockSeverity(m) !== "ok";
}

/** Primary line: fractional retail units; secondary: raw ml/g. */
export function formatStockDisplayText(m: {
  stock: number;
  unit: string;
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
}): { primary: string; secondary: string } {
  if (!hasPackageMaterial(m)) {
    return { primary: String(m.stock), secondary: "" };
  }
  const units = fractionalRetailUnits(m.stock, m.packageAmount!);
  const abbr = formatMeasureAbbrev(m.packageMeasure!);
  return {
    primary: `${units.toFixed(2)} ${m.unit}`,
    secondary: `${m.stock % 1 === 0 ? m.stock : m.stock.toFixed(1)} ${abbr}`,
  };
}

/** Draft line / API payload: optional package fields mirror Material. */
export function draftMaterialUsesPackage(m: {
  packageAmount?: number | null;
  packageMeasure?: PackageMeasure | null;
}): boolean {
  return (
    m.packageAmount != null &&
    m.packageMeasure != null &&
    Number.isFinite(m.packageAmount) &&
    m.packageAmount > 0
  );
}

export function minSaleMaterialQuantity(m: {
  packageAmount?: number | null;
  packageMeasure?: PackageMeasure | null;
}): number {
  return draftMaterialUsesPackage(m) ? 0.01 : 1;
}

/** Chevron / quick-adjust step for recipe or sale line (ml vs g vs count). */
export function packageQuantityStep(measure: PackageMeasure | null | undefined): number {
  if (measure === "GRAM") return 5;
  if (measure === "ML") return 10;
  return 1;
}

export function normalizePackageInput(
  packageAmount: unknown,
  packageMeasure: unknown
):
  | { packageAmount: null; packageMeasure: null }
  | { packageAmount: number; packageMeasure: PackageMeasure } {
  const amt =
    packageAmount === "" || packageAmount === undefined || packageAmount === null
      ? null
      : Number(packageAmount);
  const meas =
    packageMeasure === "" || packageMeasure === undefined || packageMeasure === null
      ? null
      : packageMeasure;

  if (amt == null && meas == null) {
    return { packageAmount: null, packageMeasure: null };
  }
  if (amt == null || meas == null) {
    throw new Error("Package size and measure must both be set, or both left empty");
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("Package size must be a positive number");
  }
  if (meas !== "ML" && meas !== "GRAM") {
    throw new Error("Package measure must be ML or GRAM");
  }
  return { packageAmount: amt, packageMeasure: meas };
}
