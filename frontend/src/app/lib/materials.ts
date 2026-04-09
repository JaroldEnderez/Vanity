import type { MaterialCategory, PackageMeasure } from "@prisma/client";

import { db, interactiveTxOptions } from "./db";
import { materialStockIsLow, normalizePackageInput } from "./materialPackage";

// GET all materials
export async function getAllMaterials() {
  return db.material.findMany({
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

// DELETE material
export async function deleteMaterial(id: string) {
  return db.material.delete({
    where: { id },
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
    orderBy: { stock: "asc" },
  });
  return materials.filter((m) => materialStockIsLow(m));
}
