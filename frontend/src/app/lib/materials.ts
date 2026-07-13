import { type MaterialCategory, type PackageMeasure } from "@prisma/client";

import type { MaterialImportParsedRow } from "@/src/app/lib/materialsImport";

import { db, interactiveTxOptions } from "./db";
import { materialStockIsLow, normalizePackageInput } from "./materialPackage";

type MaterialRow = Awaited<ReturnType<typeof db.material.findMany>>[number];

/** Attach branch stock to catalog material rows (defaults to 0 when no row exists). */
async function withBranchStock<T extends MaterialRow>(
  branchId: string,
  materials: T[]
): Promise<(T & { stock: number })[]> {
  if (materials.length === 0) return [];

  const stocks = await db.branchMaterial.findMany({
    where: {
      branchId,
      materialId: { in: materials.map((m) => m.id) },
    },
    select: { materialId: true, stock: true },
  });
  const stockByMaterial = new Map(stocks.map((s) => [s.materialId, s.stock]));

  return materials.map((m) => ({
    ...m,
    stock: stockByMaterial.get(m.id) ?? 0,
  }));
}

async function upsertBranchStock(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  branchId: string,
  materialId: string,
  stock: number
) {
  const existing = await tx.branchMaterial.findUnique({
    where: { branchId_materialId: { branchId, materialId } },
  });
  if (existing) {
    return tx.branchMaterial.update({
      where: { id: existing.id },
      data: { stock },
    });
  }
  return tx.branchMaterial.create({
    data: { branchId, materialId, stock },
  });
}

// GET all materials for a branch (default: active only; use includeInactive for inventory admin)
export async function getAllMaterials(
  branchId: string,
  options?: { includeInactive?: boolean }
) {
  const materials = await db.material.findMany({
    where: {
      branchId,
      ...(options?.includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: "asc" },
  });
  return withBranchStock(branchId, materials);
}

// GET material by ID with branch stock
export async function getMaterialById(id: string, branchId: string) {
  const material = await db.material.findFirst({ where: { id, branchId } });
  if (!material) return null;
  const [withStock] = await withBranchStock(branchId, [material]);
  return withStock;
}

// CREATE a branch-owned material and initial stock for that branch
export async function createMaterial(
  branchId: string,
  data: {
    name: string;
    unit: string;
    stock?: number;
    category?: MaterialCategory;
    packageAmount?: number | null;
    packageMeasure?: PackageMeasure | null;
    sku?: string | null;
  }
) {
  const pkg = normalizePackageInput(
    data.packageAmount ?? null,
    data.packageMeasure ?? null
  );

  return db.$transaction(async (tx) => {
    const material = await tx.material.create({
      data: {
        branchId,
        sku: data.sku?.trim() || null,
        name: data.name,
        unit: data.unit,
        category: data.category ?? "OTHER",
        packageAmount: pkg.packageAmount,
        packageMeasure: pkg.packageMeasure,
        isActive: true,
      },
    });

    const stock = data.stock ?? 0;
    await upsertBranchStock(tx, branchId, material.id, stock);

    if (stock > 0) {
      await tx.inventoryMovement.create({
        data: {
          branchId,
          materialId: material.id,
          quantity: stock,
          type: "IN",
        },
      });
    }

    return { ...material, stock };
  }, interactiveTxOptions);
}

// UPDATE a branch-owned material; stock changes apply to this branch only
export async function updateMaterial(
  branchId: string,
  id: string,
  data: Partial<{
    name: string;
    unit: string;
    stock: number;
    category: MaterialCategory;
    packageAmount: number | null;
    packageMeasure: PackageMeasure | null;
    isActive: boolean;
    sku: string | null;
  }>
) {
  const { stock, packageAmount, packageMeasure, ...rest } = data;
  const pkg =
    packageAmount !== undefined || packageMeasure !== undefined
      ? normalizePackageInput(packageAmount ?? null, packageMeasure ?? null)
      : undefined;

  return db.$transaction(async (tx) => {
    const material = await tx.material.update({
      where: { id, branchId },
      data: {
        ...rest,
        ...(pkg !== undefined
          ? { packageAmount: pkg.packageAmount, packageMeasure: pkg.packageMeasure }
          : {}),
      },
    });

    let branchStock = 0;
    if (stock !== undefined) {
      const existing = await tx.branchMaterial.findUnique({
        where: { branchId_materialId: { branchId, materialId: id } },
      });
      const oldStock = existing?.stock ?? 0;
      await upsertBranchStock(tx, branchId, id, stock);
      branchStock = stock;
      const delta = stock - oldStock;
      if (delta !== 0) {
        await tx.inventoryMovement.create({
          data: {
            branchId,
            materialId: id,
            quantity: Math.abs(delta),
            type: "ADJUSTMENT",
          },
        });
      }
    } else {
      const row = await tx.branchMaterial.findUnique({
        where: { branchId_materialId: { branchId, materialId: id } },
      });
      branchStock = row?.stock ?? 0;
    }

    return { ...material, stock: branchStock };
  }, interactiveTxOptions);
}

/** Soft-delete a branch-owned material. */
export async function deleteMaterial(branchId: string, id: string) {
  // Prevent deleting a material that is referenced by any service recipe
  const usedByServices = await db.serviceMaterial.count({ where: { materialId: id } });
  if (usedByServices > 0) {
    throw new Error("Cannot delete material: it is used in one or more services. Remove references before deleting.");
  }

  return db.material.update({
    where: { id, branchId },
    data: { isActive: false },
  });
}

// Adjust branch stock (for inventory movements)
export async function adjustStock(
  branchId: string,
  materialId: string,
  quantity: number,
  type: "IN" | "OUT" | "ADJUSTMENT",
  referenceId?: string
) {
  return db.$transaction(async (tx) => {
    await tx.inventoryMovement.create({
      data: {
        branchId,
        materialId,
        quantity,
        type,
        referenceId,
      },
    });

    const adjustment = type === "OUT" ? -quantity : quantity;
    const existing = await tx.branchMaterial.findUnique({
      where: { branchId_materialId: { branchId, materialId } },
    });

    if (existing) {
      await tx.branchMaterial.update({
        where: { id: existing.id },
        data: { stock: { increment: adjustment } },
      });
      return tx.branchMaterial.findUniqueOrThrow({ where: { id: existing.id } });
    }

    if (adjustment < 0) {
      throw new Error("Insufficient stock");
    }

    return tx.branchMaterial.create({
      data: { branchId, materialId, stock: adjustment },
    });
  }, interactiveTxOptions);
}

// GET service materials with branch stock on nested material
export async function getServiceMaterials(serviceId: string, branchId: string) {
  const rows = await db.serviceMaterial.findMany({
    where: { serviceId },
    include: { material: true },
  });

  const materialIds = rows.map((r) => r.materialId);
  const stocks =
    materialIds.length === 0
      ? []
      : await db.branchMaterial.findMany({
          where: { branchId, materialId: { in: materialIds } },
          select: { materialId: true, stock: true },
        });
  const stockByMaterial = new Map(stocks.map((s) => [s.materialId, s.stock]));

  return rows.map((r) => ({
    ...r,
    material: {
      ...r.material,
      stock: stockByMaterial.get(r.materialId) ?? 0,
    },
  }));
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

    return tx.serviceMaterial.findMany({
      where: { serviceId },
      include: { material: true },
    });
  }, interactiveTxOptions);
}

/** Upsert materials from validated CSV rows (sku key). Updates stock for this branch only. */
export async function importMaterialsFromParsedRows(
  branchId: string,
  rows: MaterialImportParsedRow[]
) {
  return db.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;

    for (const r of rows) {
      const pkg = normalizePackageInput(r.packageAmount, r.packageMeasure);
      const existing = await tx.material.findFirst({
        where: { branchId, sku: r.sku },
      });

      const catalog = {
        name: r.name,
        unit: r.packaging,
        category: r.category,
        packageAmount: pkg.packageAmount,
        packageMeasure: pkg.packageMeasure,
        isActive: true,
      };

      let materialId: string;

      if (!existing) {
        const m = await tx.material.create({
          data: { ...catalog, branchId, sku: r.sku },
        });
        materialId = m.id;
        created++;
      } else {
        await tx.material.update({
          where: { id: existing.id },
          data: catalog,
        });
        materialId = existing.id;
        updated++;
      }

      const branchRow = await tx.branchMaterial.findUnique({
        where: { branchId_materialId: { branchId, materialId } },
      });
      const oldStock = branchRow?.stock ?? 0;
      await upsertBranchStock(tx, branchId, materialId, r.computedStock);

      if (!branchRow && r.computedStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            branchId,
            materialId,
            quantity: r.computedStock,
            type: "IN",
            referenceId: "csv-import",
          },
        });
      } else {
        const delta = r.computedStock - oldStock;
        if (delta !== 0) {
          await tx.inventoryMovement.create({
            data: {
              branchId,
              materialId,
              quantity: Math.abs(delta),
              type: "ADJUSTMENT",
              referenceId: "csv-import",
            },
          });
        }
      }
    }

    return { created, updated };
  }, interactiveTxOptions);
}

// GET materials with low stock at a branch
export async function getLowStockMaterials(branchId: string) {
  const materials = await getAllMaterials(branchId);
  return materials.filter((m) => materialStockIsLow(m));
}
