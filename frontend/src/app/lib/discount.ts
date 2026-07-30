/** Clamp percent to 0–100 and compute discount amount + payable total from a subtotal. */
export function applyPercentDiscount(
  subtotal: number,
  discountPercent: number | null | undefined
): { discountPercent: number; discountAmount: number; total: number } {
  const percent = Math.max(
    0,
    Math.min(100, Number.isFinite(Number(discountPercent)) ? Number(discountPercent) : 0)
  );
  const discountAmount =
    percent <= 0 ? 0 : Math.round(((subtotal * percent) / 100) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  return { discountPercent: percent, discountAmount, total };
}

export function normalizeDiscountLabel(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}
