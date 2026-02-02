import { db } from "./db";

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
}) {
  return db.material.create({
    data,
  });
}

// UPDATE material
export async function updateMaterial(
  id: string,
  data: Partial<{
    name: string;
    unit: string;
    stock: number;
  }>
) {
  return db.material.update({
    where: { id },
    data,
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

// SET service materials (replace all)
export async function setServiceMaterials(
  serviceId: string,
  materials: Array<{ materialId: string; quantity: number }>
) {
  // Delete existing
  await db.serviceMaterial.deleteMany({
    where: { serviceId },
  });

  // Create new
  if (materials.length > 0) {
    await db.serviceMaterial.createMany({
      data: materials.map((m) => ({
        serviceId,
        materialId: m.materialId,
        quantity: m.quantity,
      })),
    });

    // Update service flag
    await db.service.update({
      where: { id: serviceId },
      data: { usesMaterials: true },
    });
  } else {
    await db.service.update({
      where: { id: serviceId },
      data: { usesMaterials: false },
    });
  }

  return getServiceMaterials(serviceId);
}

// GET materials with low stock
export async function getLowStockMaterials(threshold: number = 10) {
  return db.material.findMany({
    where: {
      stock: { lte: threshold },
    },
    orderBy: { stock: "asc" },
  });
}
