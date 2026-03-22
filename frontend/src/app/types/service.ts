export const SERVICE_CATEGORIES = [
  "Haircut",
  "Hair_Coloring",
  "Treatment",
  "Rebond",
  "Perm",
  "Styling",
  "Nails",
  "Others",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type Service = {
  id: string;
  name: string;
  category?: ServiceCategory;
  description?: string | null;
  price: number;
  durationMin?: number | null;
  isActive?: boolean;
  branchId?: string | null;
};
