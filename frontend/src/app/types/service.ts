import type { ServiceCategory as PrismaServiceCategory } from "@prisma/client";

export type ServiceCategory = PrismaServiceCategory;

/** Ordered list for selects (matches salon menu). */
export const SERVICE_CATEGORIES: readonly PrismaServiceCategory[] = [
  "HAIR",
  "NAILS",
  "SPA",
  "MASSAGE",
  "LASHES",
  "AESTHETICS",
] as const;

export const DEFAULT_SERVICE_CATEGORY: PrismaServiceCategory = "HAIR";

const LABELS: Record<PrismaServiceCategory, string> = {
  HAIR: "Hair",
  NAILS: "Nails",
  SPA: "Spa",
  MASSAGE: "Massage",
  LASHES: "Lashes",
  AESTHETICS: "Aesthetics",
};

export function labelServiceCategory(category: string | undefined | null): string {
  if (!category) return LABELS.HAIR;
  if (category in LABELS) return LABELS[category as PrismaServiceCategory];
  // Legacy DB / cached drafts
  if (category === "default") return "Hair";
  if (category === "Hair_coloring" || category === "Hair_Coloring") return "Hair coloring";
  return String(category).replaceAll("_", " ");
}

/** Legacy string category from old rows or cached sessions. */
export function isHairColoringCategory(category: string | undefined | null): boolean {
  const c = category ?? "";
  return c === "Hair_coloring" || c === "Hair_Coloring";
}

/** POS: hide per-line recipe materials when this hair service uses the coloring line UI. */
export function isHairColoringLineItem(item: {
  serviceCategory?: string | null;
  hairColoringFlow?: boolean | null;
}): boolean {
  if (item.hairColoringFlow === true) return true;
  return isHairColoringCategory(item.serviceCategory);
}

export type Service = {
  id: string;
  name: string;
  category?: ServiceCategory | string;
  hairColoringFlow?: boolean;
  description?: string | null;
  price: number;
  durationMin?: number | null;
  isActive?: boolean;
  branchId?: string | null;
};
