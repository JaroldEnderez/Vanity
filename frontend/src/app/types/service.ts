export type Service = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMin?: number | null;
  isActive?: boolean;
  branchId?: string | null;
};
