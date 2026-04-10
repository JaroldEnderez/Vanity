import { type MaterialCategory, type PackageMeasure } from "@prisma/client";

import { db, interactiveTxOptions } from "./db";
import { materialStockIsLow, normalizePackageInput } from "./materialPackage";

// GET all materials (default: active only; use includeInactive for inventory admin)
export async function getAllMaterials(options?: { includeInactive?: boolean }) {
  return db.material.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
}

// GET material by ID
export async function getMaterialById(id: string) {
  return db.material.findUnique({
    where: { id },
  });
}

// CREATE material
export async function createMaterial(data: {
  name: string;
  unit: string;
  stock: number;
  category?: MaterialCategory;
  packageAmount?: number | null;
  packageMeasure?: PackageMeasure | null;
}) {
  const pkg = normalizePackageInput(
    data.packageAmount ?? null,
    data.packageMeasure ?? null
  );
  return db.material.create({
    data: {
      name: data.name,
      unit: data.unit,
      stock: data.stock,
      category: data.category ?? "OTHER",
      packageAmount: pkg.packageAmount,
      packageMeasure: pkg.packageMeasure,
      isActive: true,
    },
  });
}

// UPDATE material
export async function updateMaterial(
  id: string,
  data: Partial<{
    name: string;
    unit: string;
    stock: number;
    category: MaterialCategory;
    packageAmount: number | null;
    packageMeasure: PackageMeasure | null;
    isActive: boolean;
  }>
) {
  const { packageAmount, packageMeasure, ...rest } = data;
  const pkg =
    packageAmount !== undefined || packageMeasure !== undefined
      ? normalizePackageInput(packageAmount ?? null, packageMeasure ?? null)
      : undefined;

  return db.material.update({
    where: { id },
    data: {
      ...rest,
      ...(pkg !== undefined
        ? { packageAmount: pkg.packageAmount, packageMeasure: pkg.packageMeasure }
        : {}),
    },
  });
}

/** Soft-delete: hide from pickers; row and FKs kept for sale history. */
export async function deleteMaterial(id: string) {
  return db.material.update({
    where: { id },
    data: { isActive: false },
  });
}

// Adjust stock (for inventory movements)
export async function adjustStock(
  materialId: string,
  quantity: number,
  type: "IN" | "OUT" | "ADJUSTMENT",
  referenceId?: string
) {
  // Create movement record
  await db.inventoryMovement.create({
    data: {
      materialId,
      quantity,
      type,
      referenceId,
    },
  });

  // Update stock
  const adjustment = type === "OUT" ? -quantity : quantity;
  return db.material.update({
    where: { id: materialId },
    data: {
      stock: { increment: adjustment },
    },
  });
}

// GET service materials (suggested materials for a service)
export async function getServiceMaterials(serviceId: string) {
  return db.serviceMaterial.findMany({
    where: { serviceId },
    include: { material: true },
  });
}

// SET service materials (replace all) - Optimized with transaction
export async function setServiceMaterials(
  serviceId: string,
  materials: Array<{ materialId: string; quantity: number }>
) {
  const uniqueIds = [...new Set(materials.map((m) => m.materialId).filter(Boolean))];
  if (uniqueIds.length > 0) {
    const activeRows = await db.material.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: { id: true },
    });
    if (activeRows.length !== uniqueIds.length) {
      throw new Error(
        "One or more materials are invalid or removed. Restore them in Inventory or pick active materials."
      );
    }
  }

  return db.$transaction(async (tx) => {
    // Delete existing and create new in parallel with service update
    await Promise.all([
      tx.serviceMaterial.deleteMany({
        where: { serviceId },
      }),
      materials.length > 0
        ? tx.serviceMaterial.createMany({
            data: materials.map((m) => ({
              serviceId,
              materialId: m.materialId,
              quantity: m.quantity,
            })),
          })
        : Promise.resolve(),
      tx.service.update({
        where: { id: serviceId },
        data: { usesMaterials: materials.length > 0 },
      }),
    ]);

    // Return updated materials
    return tx.serviceMaterial.findMany({
      where: { serviceId },
      include: { material: true },
    });
  }, interactiveTxOptions);
}

// GET materials with low stock (legacy: raw count; package: fractional units)
export async function getLowStockMaterials() {
  const materials = await db.material.findMany({
    where: { isActive: true },
    orderBy: { stock: "asc" },
  });
  return materials.filter((m) => materialStockIsLow(m));
}
