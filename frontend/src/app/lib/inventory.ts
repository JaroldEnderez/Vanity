import type { Prisma } from "@prisma/client";

/**
 * Sum ServiceMaterial recipes for each sale line (quantity × line qty).
 * Used when SaleMaterial rows were never persisted (empty recipe at add time, or legacy drafts).
 */
export async function resolveMaterialsFromServiceRecipes(
  tx: Prisma.TransactionClient,
  saleServices: ReadonlyArray<{ serviceId: string; qty: number }>
): Promise<Array<{ materialId: string; quantity: number }>> {
  const merged = new Map<string, number>();
  for (const ss of saleServices) {
    const recipe = await tx.serviceMaterial.findMany({
      where: { serviceId: ss.serviceId },
      select: { materialId: true, quantity: true },
    });
    for (const sm of recipe) {
      const q = sm.quantity * ss.qty;
      merged.set(sm.materialId, (merged.get(sm.materialId) ?? 0) + q);
    }
  }
  return [...merged.entries()].map(([materialId, quantity]) => ({ materialId, quantity }));
}

/**
 * Decrement material stock and append OUT movements for a completed sale.
 * Aggregates stock by materialId; movements mirror each SaleMaterial row.
 */
export async function deductMaterialsForSaleCompletion(
  tx: Prisma.TransactionClient,
  saleId: string,
  saleMaterials: ReadonlyArray<{ materialId: string; quantity: number }>
): Promise<void> {
  if (saleMaterials.length === 0) return;

  const materialUpdates = new Map<string, number>();
  for (const row of saleMaterials) {
    const current = materialUpdates.get(row.materialId) ?? 0;
    materialUpdates.set(row.materialId, current + row.quantity);
  }

  await Promise.all(
    [...materialUpdates.entries()].map(([materialId, totalQuantity]) =>
      tx.material.update({
        where: { id: materialId },
        data: { stock: { decrement: totalQuantity } },
      })
    )
  );

  await tx.inventoryMovement.createMany({
    data: saleMaterials.map((sm) => ({
      materialId: sm.materialId,
      quantity: sm.quantity,
      type: "OUT",
      referenceId: saleId,
    })),
  });
}
