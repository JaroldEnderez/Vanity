import type { Prisma, ServiceCategory } from "@prisma/client";

import { db } from "./db";
import { SERVICE_CATEGORIES } from "@/src/app/types/service";

const VALID_CATEGORY = new Set<string>(SERVICE_CATEGORIES);

function normalizeServiceCategory(input: string | undefined | null): ServiceCategory {
  if (!input) return "HAIR";
  const t = input.trim();
  if (VALID_CATEGORY.has(t)) return t as ServiceCategory;
  if (t === "Hair_coloring" || t === "Hair_Coloring" || t === "default") return "HAIR";
  return "HAIR";
}

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
      ...(branchId
        ? {
            OR: [{ branchId }, { branchId: null }],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      hairColoringFlow: true,
      description: true,
      durationMin: true,
      price: true,
      isActive: true,
      branchId: true,
      usesMaterials: true,
      materials: {
        include: {
          material: {
            select: {
              id: true,
              name: true,
              unit: true,
              packageAmount: true,
              packageMeasure: true,
            },
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
  category?: string;
  hairColoringFlow?: boolean;
  description?: string;
  durationMin: number;
  price: number;
  branchId?: string;
  isActive?: boolean;
}) {
  const { category, hairColoringFlow, ...rest } = data;
  return db.service.create({
    data: {
      ...rest,
      category: normalizeServiceCategory(category),
      hairColoringFlow: hairColoringFlow ?? false,
    },
  });
}

export async function updateService(
  id: string,
  data: Partial<{
    name: string;
    category: string;
    hairColoringFlow: boolean;
    description: string;
    durationMin: number;
    price: number;
    branchId: string;
    isActive: boolean;
  }>
) {
  const next: Prisma.ServiceUncheckedUpdateInput = {};
  if (data.name !== undefined) next.name = data.name;
  if (data.description !== undefined) next.description = data.description;
  if (data.durationMin !== undefined) next.durationMin = data.durationMin;
  if (data.price !== undefined) next.price = data.price;
  if (data.branchId !== undefined) next.branchId = data.branchId;
  if (data.isActive !== undefined) next.isActive = data.isActive;
  if (data.hairColoringFlow !== undefined) next.hairColoringFlow = data.hairColoringFlow;
  if (data.category !== undefined) next.category = normalizeServiceCategory(data.category);
  return db.service.update({
    where: { id },
    data: next,
  });
}

/** Soft-delete: set isActive = false so the service is hidden from lists but preserved for sales history. */
export async function deleteService(id: string) {
  return db.service.update({
    where: { id },
    data: { isActive: false },
  });
}
