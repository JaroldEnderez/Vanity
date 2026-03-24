const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPHP(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  if (!Number.isFinite(amount)) return "—";
  return phpFormatter.format(amount);
}

