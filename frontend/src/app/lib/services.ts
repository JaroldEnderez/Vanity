import { db } from "./db";

export async function getAllServices() {
  return db.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      materials: {
        include: { material: true },
      },
    },
  });
}

export async function getServices(branchId?: string) {
  return db.service.findMany({
    where: {
      isActive: true,
      // Show services that belong to this branch OR are shared (no branchId)
      ...(branchId ? {
        OR: [
          { branchId },
          { branchId: null },
        ],
      } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      durationMin: true,
      price: true,
      isActive: true,
      branchId: true,
      usesMaterials: true,
      materials: {
        include: {
          material: {
            select: { id: true, name: true, unit: true },
          },
        },
      },
    },
  });
}

/** Branch-scoped list with full include (for Products page and GET /api/services). */
export async function getServicesForBranch(branchId: string) {
  return db.service.findMany({
    where: {
      isActive: true,
      OR: [{ branchId }, { branchId: null }],
    },
    orderBy: { name: "asc" },
    include: {
      materials: {
        include: { material: true },
      },
    },
  });
}

export async function getServiceById(id: string) {
  return db.service.findUnique({
    where: { id },
  });
}

export async function createService(data: {
  name: string;
  description?: string;
  durationMin: number;
  price: number;
  branchId?: string;
  isActive?: boolean;
}) {
  return db.service.create({
    data,
  });
}

export async function updateService(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    durationMin: number;
    price: number;
    branchId: string;
    isActive: boolean;
  }>
) {
  return db.service.update({
    where: { id },
    data,
  });
}

/** Soft-delete: set isActive = false so the service is hidden from lists but preserved for sales history. */
export async function deleteService(id: string) {
  return db.service.update({
    where: { id },
    data: { isActive: false },
  });
}
