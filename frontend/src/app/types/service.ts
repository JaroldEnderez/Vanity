/** Canonical DB values — only these two are allowed for new/edited services. */
export const HAIR_COLORING_CATEGORY = "Hair_coloring";
export const DEFAULT_SERVICE_CATEGORY = "default";

export const SERVICE_CATEGORIES = [HAIR_COLORING_CATEGORY, DEFAULT_SERVICE_CATEGORY] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function labelServiceCategory(category: string | undefined | null): string {
  if (!category || category === DEFAULT_SERVICE_CATEGORY) return "Default";
  if (category === HAIR_COLORING_CATEGORY || category === "Hair_Coloring") return "Hair coloring";
  return category.replaceAll("_", " ");
}

/** True when selecting this service in a sale should open the hair coloring details modal. */
export function isHairColoringCategory(category: string | undefined | null): boolean {
  const c = category ?? DEFAULT_SERVICE_CATEGORY;
  return c === HAIR_COLORING_CATEGORY || c === "Hair_Coloring";
}

export type Service = {
  id: string;
  name: string;
  category?: ServiceCategory | string;
  description?: string | null;
  price: number;
  durationMin?: number | null;
  isActive?: boolean;
  branchId?: string | null;
};
