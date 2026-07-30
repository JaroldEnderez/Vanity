import { db } from "./db";
import {
  DEFAULT_BRANCH_MATERIALS,
  DEFAULT_BRANCH_SERVICES,
} from "./branch-defaults";

export type SeedBranchDefaultsOptions = {
  /** Initial stock for each seeded material (default 0). */
  stock?: number;
};

/**
 * Seed a newly created branch with default services and materials.
 * Idempotent: skips services/materials that already exist for this branch.
 */
export async function seedBranchDefaults(
  branchId: string,
  options?: SeedBranchDefaultsOptions
): Promise<{ servicesCreated: number; materialsCreated: number }> {
  const stock = options?.stock ?? 0;
  let servicesCreated = 0;
  let materialsCreated = 0;

  for (const svc of DEFAULT_BRANCH_SERVICES) {
    const existing = await db.service.findFirst({
      where: { branchId, name: svc.name },
    });
    if (existing) continue;

    await db.service.create({
      data: {
        name: svc.name,
        category: svc.category,
        hairColoringFlow: svc.hairColoringFlow,
        price: svc.price,
        branchId,
        usesMaterials: false,
      },
    });
    servicesCreated += 1;
  }

  for (const mat of DEFAULT_BRANCH_MATERIALS) {
    const existing = await db.material.findFirst({
      where: { branchId, name: mat.name },
    });
    if (existing) {
      await db.branchMaterial.upsert({
        where: {
          branchId_materialId: {
            branchId,
            materialId: existing.id,
          },
        },
        update: {},
        create: {
          branchId,
          materialId: existing.id,
          stock,
        },
      });
      continue;
    }

    const created = await db.material.create({
      data: {
        name: mat.name,
        category: mat.category,
        unit: mat.unit,
        packageAmount: mat.packageAmount,
        packageMeasure: mat.packageMeasure,
        branchId,
      },
    });

    await db.branchMaterial.create({
      data: {
        branchId,
        materialId: created.id,
        stock,
      },
    });
    materialsCreated += 1;
  }

  // Ensure at least one default staff so POS sessions can be created
  const staffCount = await db.staff.count({ where: { branchId } });
  if (staffCount === 0) {
    await db.staff.create({
      data: {
        name: "Default Staff",
        role: "Stylist",
        branchId,
      },
    });
  }

  return { servicesCreated, materialsCreated };
}
