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

function formatQuantity(value: number) {
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2).replace(/\.0+$/, "");
  return formatted;
}

/**
 * Decrement branch stock and append OUT movements for a completed sale.
 * Aggregates stock by materialId; movements mirror each SaleMaterial row.
 */
export async function deductMaterialsForSaleCompletion(
  tx: Prisma.TransactionClient,
  saleId: string,
  branchId: string,
  saleMaterials: ReadonlyArray<{ materialId: string; quantity: number }>
): Promise<void> {
  if (saleMaterials.length === 0) return;

  const materialUpdates = new Map<string, number>();
  for (const row of saleMaterials) {
    const current = materialUpdates.get(row.materialId) ?? 0;
    materialUpdates.set(row.materialId, current + row.quantity);
  }

  const successfulDeductionRows: Array<{ materialId: string; quantity: number }> = [];

  await Promise.all(
    [...materialUpdates.entries()].map(async ([materialId, totalQuantity]) => {
      const branchMaterial = await tx.branchMaterial.findUnique({
        where: { branchId_materialId: { branchId, materialId } },
        include: { material: true },
      });

      if (!branchMaterial) {
        console.warn(`Skipping inventory deduction for missing branch material: ${materialId}`);
        return;
      }

      const materialName = branchMaterial.material?.name ?? materialId;
      const unit = branchMaterial.material?.unit ?? "";
      const availableStock = branchMaterial.stock ?? 0;

      if (availableStock < totalQuantity) {
        console.warn(
          `Skipping inventory deduction for insufficient stock: ${materialName} (need ${formatQuantity(totalQuantity)}${unit ? ` ${unit}` : ""}, have ${formatQuantity(availableStock)}${unit ? ` ${unit}` : ""})`
        );
        return;
      }

      const updateResult = await tx.branchMaterial.updateMany({
        where: {
          id: branchMaterial.id,
          stock: { gte: totalQuantity },
        },
        data: { stock: { decrement: totalQuantity } },
      });

      if (updateResult.count === 0) {
        const latest = await tx.branchMaterial.findUnique({
          where: { id: branchMaterial.id },
        });
        const latestStock = latest?.stock ?? 0;
        console.warn(
          `Skipping inventory deduction for insufficient stock: ${materialName} (need ${formatQuantity(totalQuantity)}${unit ? ` ${unit}` : ""}, have ${formatQuantity(latestStock)}${unit ? ` ${unit}` : ""})`
        );
        return;
      }

      successfulDeductionRows.push({ materialId, quantity: totalQuantity });
    })
  );

  if (successfulDeductionRows.length > 0) {
    await tx.inventoryMovement.createMany({
      data: successfulDeductionRows.map((sm) => ({
        branchId,
        materialId: sm.materialId,
        quantity: sm.quantity,
        type: "OUT",
        referenceId: saleId,
      })),
    });
  }
}
