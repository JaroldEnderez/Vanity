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
          { branchId: null }
        ]
      } : {}),
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

export async function deleteService(id: string) {
  return db.service.delete({
    where: { id },
  });
}
