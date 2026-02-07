import { db } from "./db";

// Get all staff (optionally filter by branch)
export async function getAllStaff(branchId?: string) {
  return db.staff.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { name: "asc" },
  });
}

// Get stylists only (staff with stylist-related roles)
export async function getStylists(branchId?: string) {
  return db.staff.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      role: {
        contains: "Stylist",
      },
    },
    orderBy: { name: "asc" },
  });
}

// Get staff by ID
export async function getStaffById(id: string) {
  return db.staff.findUnique({
    where: { id },
  });
}
