import { db } from "./db";
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
        select: { id: true, name: true, unit: true }, // Don't need full material data
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

// UPDATE session (name, customer, staff, etc.)
export async function updateSession(
  id: string,
  data: Partial<{
    name: string;
    customerId: string;
    staffId: string;
  }>
) {
  return db.sale.update({
    where: { id },
    data,
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
  });
}

// ADD item to session - Optimized with transaction
export async function addItemToSession(
  sessionId: string,
  item: {
    serviceId: string;
    qty: number;
    price: number;
    materials?: Array<{ materialId: string; quantity: number }>;
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

    // Create the sale service and add materials in parallel
    const [saleService] = await Promise.all([
      tx.saleService.create({
        data: {
          saleId: sessionId,
          serviceId: item.serviceId,
          qty: item.qty,
          price: item.price,
        },
      }),
      // Add materials if provided
      item.materials && item.materials.length > 0
        ? tx.saleMaterial.createMany({
            data: item.materials.map((m) => ({
              saleId: sessionId,
              materialId: m.materialId,
              quantity: m.quantity,
            })),
          })
        : Promise.resolve(),
    ]);

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
  });
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
  });
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
  });
}

// CHECKOUT session (finalize) - Optimized with transaction and batch updates
export async function checkoutSession(id: string, cashReceived?: number) {
  // Use transaction for atomicity
  return db.$transaction(async (tx) => {
    const session = await tx.sale.findUnique({
      where: { id },
      include: {
        saleServices: true,
        saleAddOns: true,
        saleMaterials: true, // Don't need material details, just IDs and quantities
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

    // Batch material updates - much faster than individual updates
    if (session.saleMaterials.length > 0) {
      // Group materials by ID to handle duplicates
      const materialUpdates = new Map<string, number>();
      const movements: Array<{
        materialId: string;
        quantity: number;
        type: string;
        referenceId: string;
      }> = [];

      for (const saleMaterial of session.saleMaterials) {
        const current = materialUpdates.get(saleMaterial.materialId) || 0;
        materialUpdates.set(saleMaterial.materialId, current + saleMaterial.quantity);
        movements.push({
          materialId: saleMaterial.materialId,
          quantity: saleMaterial.quantity,
          type: "OUT",
          referenceId: session.id,
        });
      }

      // Batch update materials
      await Promise.all(
        Array.from(materialUpdates.entries()).map(([materialId, totalQuantity]) =>
          tx.material.update({
            where: { id: materialId },
            data: { stock: { decrement: totalQuantity } },
          })
        )
      );

      // Batch create inventory movements
      if (movements.length > 0) {
        await tx.inventoryMovement.createMany({
          data: movements,
        });
      }
    }

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
  });
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
