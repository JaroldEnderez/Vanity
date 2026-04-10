import { Prisma } from "@prisma/client";
import { db, interactiveTxOptions } from "./db";
import {
  deductMaterialsForSaleCompletion,
  resolveMaterialsFromServiceRecipes,
} from "./inventory";
import { optionalJsonToDeductionRows } from "./optionalSessionMaterials";
import { SaleStatus } from "@prisma/client";

// Optimized include - only fetch what's needed
const sessionInclude = {
  branch: {
    select: { id: true, name: true }, // Only fetch essential fields
  },
  staff: {
    select: { id: true, name: true, role: true }, // Only fetch essential fields
  },
  customer: {
    select: { id: true, name: true, phone: true }, // Only fetch essential fields
  },
  saleServices: {
    include: {
      service: {
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          durationMin: true,
          materials: {
            include: { material: true },
          },
        },
      },
    },
  },
  saleAddOns: {
    include: {
      addOn: {
        select: { id: true, name: true, price: true },
      },
    },
  },
  saleMaterials: {
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
};

// GET all draft sessions
export async function getDraftSessions(branchId?: string) {
  return db.sale.findMany({
    where: {
      status: SaleStatus.DRAFT,
      ...(branchId ? { branchId } : {}),
    },
    include: sessionInclude,
    orderBy: { createdAt: "desc" },
  });
}

// GET single session by ID
export async function getSessionById(id: string) {
  return db.sale.findUnique({
    where: { id },
    include: sessionInclude,
  });
}

// CREATE draft session
export async function createSession(data: {
  branchId: string;
  staffId: string;
  name?: string;
  customerId?: string;
}) {
  return db.sale.create({
    data: {
      branchId: data.branchId,
      staffId: data.staffId,
      name: data.name,
      customerId: data.customerId,
      status: SaleStatus.DRAFT,
      basePrice: 0,
      addOns: 0,
      total: 0,
    },
    include: sessionInclude,
  });
}

// UPDATE session (name, customer, staff, optionalMaterials JSON, etc.)
export async function updateSession(
  id: string,
  data: Partial<{
    name: string;
    customerId: string;
    staffId: string;
    optionalMaterials: unknown | null;
  }>
) {
  const updateData: Prisma.SaleUncheckedUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.customerId !== undefined) updateData.customerId = data.customerId;
  if (data.staffId !== undefined) updateData.staffId = data.staffId;
  if (data.optionalMaterials !== undefined) {
    updateData.optionalMaterials =
      data.optionalMaterials === null
        ? Prisma.JsonNull
        : (data.optionalMaterials as Prisma.InputJsonValue);
  }

  return db.sale.update({
    where: { id },
    data: updateData,
    include: sessionInclude,
  });
}

// DELETE session (only if DRAFT) - Optimized with transaction
export async function deleteSession(id: string) {
  return db.$transaction(async (tx) => {
    const session = await tx.sale.findUnique({ where: { id } });
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.status !== SaleStatus.DRAFT) {
      throw new Error("Cannot delete completed or cancelled session");
    }

    // Delete related items in parallel (faster than sequential)
    await Promise.all([
      tx.saleService.deleteMany({ where: { saleId: id } }),
      tx.saleAddOn.deleteMany({ where: { saleId: id } }),
      tx.saleMaterial.deleteMany({ where: { saleId: id } }),
    ]);

    return tx.sale.delete({ where: { id } });
  }, interactiveTxOptions);
}

// ADD item to session - Optimized with transaction
export async function addItemToSession(
  sessionId: string,
  item: {
    serviceId: string;
    qty: number;
    price: number;
    materials?: Array<{ materialId: string; quantity: number }>;
    // Hair Coloring extra fields
    serviceDisplayName?: string;
    colorUsed?: string;
    developer?: string;
    itemStaffName?: string;
    remarks?: string;
  }
) {
  return db.$transaction(async (tx) => {
    const session = await tx.sale.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true }, // Only check status
    });
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.status !== SaleStatus.DRAFT) {
      throw new Error("Cannot modify completed or cancelled session");
    }

    // Explicit line materials (e.g. hair coloring), else default recipe from ServiceMaterial × qty
    let materialsToCreate: Array<{ materialId: string; quantity: number }>;
    if (item.materials && item.materials.length > 0) {
      materialsToCreate = item.materials.map((m) => ({
        materialId: m.materialId,
        quantity: m.quantity,
      }));
    } else {
      const recipe = await tx.serviceMaterial.findMany({
        where: { serviceId: item.serviceId },
        select: { materialId: true, quantity: true },
      });
      materialsToCreate = recipe.map((sm) => ({
        materialId: sm.materialId,
        quantity: sm.quantity * item.qty,
      }));
    }

    await tx.saleService.create({
      data: {
        saleId: sessionId,
        serviceId: item.serviceId,
        qty: item.qty,
        price: item.price,
        serviceDisplayName: item.serviceDisplayName ?? null,
        colorUsed: item.colorUsed ?? null,
        developer: item.developer ?? null,
        itemStaffName: item.itemStaffName ?? null,
        remarks: item.remarks ?? null,
      },
    });

    if (materialsToCreate.length > 0) {
      await tx.saleMaterial.createMany({
        data: materialsToCreate.map((m) => ({
          saleId: sessionId,
          materialId: m.materialId,
          quantity: m.quantity,
        })),
      });
    }

    // Recalculate totals efficiently
    const [services, addOns] = await Promise.all([
      tx.saleService.findMany({
        where: { saleId: sessionId },
        select: { price: true, qty: true },
      }),
      tx.saleAddOn.findMany({
        where: { saleId: sessionId },
        select: { price: true },
      }),
    ]);

    const basePrice = services.reduce((sum, s) => sum + s.price * s.qty, 0);
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const total = basePrice + addOnsTotal;

    await tx.sale.update({
      where: { id: sessionId },
      data: { basePrice, addOns: addOnsTotal, total },
    });

    // Return full session
    return tx.sale.findUnique({
      where: { id: sessionId },
      include: sessionInclude,
    });
  }, interactiveTxOptions);
}

// REMOVE item from session - Optimized
export async function removeItemFromSession(sessionId: string, itemId: string) {
  return db.$transaction(async (tx) => {
    const session = await tx.sale.findUnique({ where: { id: sessionId } });
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.status !== SaleStatus.DRAFT) {
      throw new Error("Cannot modify completed or cancelled session");
    }

    // Get the service to find related materials - only fetch materialIds
    const saleService = await tx.saleService.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        service: {
          select: {
            materials: {
              select: { materialId: true }, // Only fetch materialId
            },
          },
        },
      },
    });

    if (!saleService) {
      throw new Error("Item not found");
    }

    // Remove related materials for this service
    const materialIds = saleService.service.materials.map((m) => m.materialId);
    if (materialIds.length > 0) {
      await tx.saleMaterial.deleteMany({
        where: {
          saleId: sessionId,
          materialId: { in: materialIds },
        },
      });
    }

    // Delete the service item
    await tx.saleService.delete({ where: { id: itemId } });

    // Recalculate totals
    const [services, addOns] = await Promise.all([
      tx.saleService.findMany({
        where: { saleId: sessionId },
        select: { price: true, qty: true },
      }),
      tx.saleAddOn.findMany({
        where: { saleId: sessionId },
        select: { price: true },
      }),
    ]);

    const basePrice = services.reduce((sum, s) => sum + s.price * s.qty, 0);
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const total = basePrice + addOnsTotal;

    await tx.sale.update({
      where: { id: sessionId },
      data: { basePrice, addOns: addOnsTotal, total },
    });

    // Return full session
    return tx.sale.findUnique({
      where: { id: sessionId },
      include: sessionInclude,
    });
  }, interactiveTxOptions);
}

// UPDATE material quantity in session - Optimized
export async function updateSessionMaterial(
  sessionId: string,
  materialId: string,
  quantity: number
) {
  return db.$transaction(async (tx) => {
    const session = await tx.sale.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true },
    });
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.status !== SaleStatus.DRAFT) {
      throw new Error("Cannot modify completed or cancelled session");
    }

    // Find and update the sale material
    const saleMaterial = await tx.saleMaterial.findFirst({
      where: { saleId: sessionId, materialId },
      select: { id: true },
    });

    if (saleMaterial) {
      await tx.saleMaterial.update({
        where: { id: saleMaterial.id },
        data: { quantity },
      });
    }

    // Return full session
    return tx.sale.findUnique({
      where: { id: sessionId },
      include: sessionInclude,
    });
  }, interactiveTxOptions);
}

// CHECKOUT session (finalize) - Optimized with transaction and batch updates
export async function checkoutSession(id: string, cashReceived?: number) {
  // Use transaction for atomicity
  return db.$transaction(async (tx) => {
    const session = await tx.sale.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        branchId: true,
        optionalMaterials: true,
        saleServices: true,
        saleAddOns: true,
        saleMaterials: true,
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== SaleStatus.DRAFT) {
      throw new Error("Session is already completed or cancelled");
    }

    // Recalculate totals from persisted data
    const basePrice = session.saleServices.reduce(
      (sum, ss) => sum + ss.price * ss.qty,
      0
    );
    const addOnsTotal = session.saleAddOns.reduce((sum, sa) => sum + sa.price, 0);
    const total = basePrice + addOnsTotal;

    // Calculate change if cash received is provided
    const changeGiven = cashReceived !== undefined ? cashReceived - total : null;

    let materialsToDeduct = session.saleMaterials.map((m) => ({
      materialId: m.materialId,
      quantity: m.quantity,
    }));
    if (materialsToDeduct.length === 0 && session.saleServices.length > 0) {
      materialsToDeduct = await resolveMaterialsFromServiceRecipes(
        tx,
        session.saleServices.map((ss) => ({ serviceId: ss.serviceId, qty: ss.qty }))
      );
      if (materialsToDeduct.length > 0) {
        await tx.saleMaterial.createMany({
          data: materialsToDeduct.map((m) => ({
            saleId: session.id,
            materialId: m.materialId,
            quantity: m.quantity,
          })),
        });
      }
    }

    materialsToDeduct = [
      ...materialsToDeduct,
      ...optionalJsonToDeductionRows(session.optionalMaterials),
    ];

    await deductMaterialsForSaleCompletion(tx, session.id, materialsToDeduct);

    // Update sale status and return with full includes
    return tx.sale.update({
      where: { id },
      data: {
        status: SaleStatus.COMPLETED,
        endedAt: new Date(),
        basePrice,
        addOns: addOnsTotal,
        total,
        cashReceived: cashReceived ?? null,
        changeGiven,
      },
      include: sessionInclude,
    });
  }, interactiveTxOptions);
}

// CANCEL session
export async function cancelSession(id: string) {
  const session = await db.sale.findUnique({ where: { id } });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status !== SaleStatus.DRAFT) {
    throw new Error("Session is already completed or cancelled");
  }

  return db.sale.update({
    where: { id },
    data: {
      status: SaleStatus.CANCELLED,
      endedAt: new Date(),
    },
    include: sessionInclude,
  });
}

// Helper: Recalculate session totals - Optimized with single query
async function recalculateSessionTotals(sessionId: string) {
  // Fetch both in parallel instead of sequentially
  const [services, addOns] = await Promise.all([
    db.saleService.findMany({
      where: { saleId: sessionId },
      select: { price: true, qty: true }, // Only fetch needed fields
    }),
    db.saleAddOn.findMany({
      where: { saleId: sessionId },
      select: { price: true }, // Only fetch needed fields
    }),
  ]);

  const basePrice = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const total = basePrice + addOnsTotal;

  await db.sale.update({
    where: { id: sessionId },
    data: { basePrice, addOns: addOnsTotal, total },
  });
}
