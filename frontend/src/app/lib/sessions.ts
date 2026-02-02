import { db } from "./db";
import { SaleStatus } from "@prisma/client";

const sessionInclude = {
  branch: true,
  staff: true,
  customer: true,
  saleServices: {
    include: {
      service: {
        include: {
          materials: {
            include: { material: true },
          },
        },
      },
    },
  },
  saleAddOns: { include: { addOn: true } },
  saleMaterials: { include: { material: true } },
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

// UPDATE session (name, customer, etc.)
export async function updateSession(
  id: string,
  data: Partial<{
    name: string;
    customerId: string;
  }>
) {
  return db.sale.update({
    where: { id },
    data,
    include: sessionInclude,
  });
}

// DELETE session (only if DRAFT)
export async function deleteSession(id: string) {
  const session = await db.sale.findUnique({ where: { id } });
  
  if (!session) {
    throw new Error("Session not found");
  }
  
  if (session.status !== SaleStatus.DRAFT) {
    throw new Error("Cannot delete completed or cancelled session");
  }

  // Delete related items first (cascade)
  await db.saleService.deleteMany({ where: { saleId: id } });
  await db.saleAddOn.deleteMany({ where: { saleId: id } });
  await db.saleMaterial.deleteMany({ where: { saleId: id } });

  return db.sale.delete({ where: { id } });
}

// ADD item to session
export async function addItemToSession(
  sessionId: string,
  item: {
    serviceId: string;
    qty: number;
    price: number;
    materials?: Array<{ materialId: string; quantity: number }>;
  }
) {
  const session = await db.sale.findUnique({ where: { id: sessionId } });
  
  if (!session) {
    throw new Error("Session not found");
  }
  
  if (session.status !== SaleStatus.DRAFT) {
    throw new Error("Cannot modify completed or cancelled session");
  }

  // Create the sale service
  const saleService = await db.saleService.create({
    data: {
      saleId: sessionId,
      serviceId: item.serviceId,
      qty: item.qty,
      price: item.price,
    },
    include: {
      service: {
        include: {
          materials: { include: { material: true } },
        },
      },
    },
  });

  // Add materials if provided
  if (item.materials && item.materials.length > 0) {
    await db.saleMaterial.createMany({
      data: item.materials.map((m) => ({
        saleId: sessionId,
        materialId: m.materialId,
        quantity: m.quantity,
      })),
    });
  }

  // Recalculate totals
  await recalculateSessionTotals(sessionId);

  return getSessionById(sessionId);
}

// REMOVE item from session
export async function removeItemFromSession(sessionId: string, itemId: string) {
  const session = await db.sale.findUnique({ where: { id: sessionId } });
  
  if (!session) {
    throw new Error("Session not found");
  }
  
  if (session.status !== SaleStatus.DRAFT) {
    throw new Error("Cannot modify completed or cancelled session");
  }

  // Get the service to find related materials
  const saleService = await db.saleService.findUnique({
    where: { id: itemId },
    include: { service: { include: { materials: true } } },
  });

  if (!saleService) {
    throw new Error("Item not found");
  }

  // Remove related materials for this service
  const materialIds = saleService.service.materials.map((m) => m.materialId);
  if (materialIds.length > 0) {
    await db.saleMaterial.deleteMany({
      where: {
        saleId: sessionId,
        materialId: { in: materialIds },
      },
    });
  }

  // Delete the service item
  await db.saleService.delete({ where: { id: itemId } });

  // Recalculate totals
  await recalculateSessionTotals(sessionId);

  return getSessionById(sessionId);
}

// UPDATE material quantity in session
export async function updateSessionMaterial(
  sessionId: string,
  materialId: string,
  quantity: number
) {
  const session = await db.sale.findUnique({ where: { id: sessionId } });
  
  if (!session) {
    throw new Error("Session not found");
  }
  
  if (session.status !== SaleStatus.DRAFT) {
    throw new Error("Cannot modify completed or cancelled session");
  }

  // Find the sale material
  const saleMaterial = await db.saleMaterial.findFirst({
    where: { saleId: sessionId, materialId },
  });

  if (saleMaterial) {
    await db.saleMaterial.update({
      where: { id: saleMaterial.id },
      data: { quantity },
    });
  }

  return getSessionById(sessionId);
}

// CHECKOUT session (finalize)
export async function checkoutSession(id: string, cashReceived?: number) {
  const session = await db.sale.findUnique({
    where: { id },
    include: {
      saleServices: true,
      saleAddOns: true,
      saleMaterials: { include: { material: true } },
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

  // Deduct materials from inventory
  for (const saleMaterial of session.saleMaterials) {
    await db.material.update({
      where: { id: saleMaterial.materialId },
      data: {
        stock: { decrement: saleMaterial.quantity },
      },
    });

    // Record inventory movement
    await db.inventoryMovement.create({
      data: {
        materialId: saleMaterial.materialId,
        quantity: saleMaterial.quantity,
        type: "OUT",
        referenceId: session.id,
      },
    });
  }

  return db.sale.update({
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

// Helper: Recalculate session totals
async function recalculateSessionTotals(sessionId: string) {
  const services = await db.saleService.findMany({
    where: { saleId: sessionId },
  });
  const addOns = await db.saleAddOn.findMany({
    where: { saleId: sessionId },
  });

  const basePrice = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const total = basePrice + addOnsTotal;

  await db.sale.update({
    where: { id: sessionId },
    data: { basePrice, addOns: addOnsTotal, total },
  });
}
