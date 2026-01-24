import { db } from "./db";
import { SaleStatus } from "@prisma/client";

// GET all sales
export async function getAllSales() {
  return db.sale.findMany({
    include: {
      branch: true,
      staff: true,
      customer: true,
      saleServices: {
        include: { service: true },
      },
      saleAddOns: {
        include: { addOn: true },
      },
      saleMaterials: {
        include: { material: true },
      },
      payments: true,
    },
  });
}

// GET sale by ID
export async function getSaleById(id: string) {
  return db.sale.findUnique({
    where: { id },
    include: {
      branch: true,
      staff: true,
      customer: true,
      saleServices: {
        include: { service: true },
      },
      saleAddOns: {
        include: { addOn: true },
      },
      saleMaterials: {
        include: { material: true },
      },
      payments: true,
    },
  });
}

// CREATE sale (DRAFT)
// This creates a draft sale with services
export async function createSale(data: {
  branchId: string;
  staffId: string;
  customerId?: string;
  services: Array<{ serviceId: string; qty: number; price: number }>;
  addOns?: Array<{ addOnId: string; price: number }>;
  materials?: Array<{ materialId: string; quantity: number }>;
}) {
  const { branchId, staffId, customerId, services, addOns, materials } = data;

  // Calculate totals server-side from provided data
  const basePrice = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const addOnsTotal = addOns?.reduce((sum, a) => sum + a.price, 0) || 0;
  const total = basePrice + addOnsTotal;

  return db.sale.create({
    data: {
      branchId,
      staffId,
      customerId,
      status: SaleStatus.DRAFT,
      basePrice,
      addOns: addOnsTotal,
      total,

      saleServices: {
        create: services.map((s) => ({
          serviceId: s.serviceId,
          qty: s.qty,
          price: s.price, // Store price at time of sale
        })),
      },

      saleAddOns: addOns?.length
        ? {
            create: addOns.map((a) => ({
              addOnId: a.addOnId,
              price: a.price,
            })),
          }
        : undefined,

      saleMaterials: materials?.length
        ? {
            create: materials.map((m) => ({
              materialId: m.materialId,
              quantity: m.quantity,
            })),
          }
        : undefined,
    },

    include: {
      branch: true,
      staff: true,
      customer: true,
      saleServices: { include: { service: true } },
      saleAddOns: { include: { addOn: true } },
      saleMaterials: { include: { material: true } },
    },
  });
}

// UPDATE sale (only if DRAFT)
export async function updateSale(
  id: string,
  data: {
    services?: Array<{ serviceId: string; qty: number; price: number }>;
    addOns?: Array<{ addOnId: string; price: number }>;
    customerId?: string;
  }
) {
  // First check if sale is DRAFT
  const existingSale = await db.sale.findUnique({
    where: { id },
    include: {
      saleServices: true,
      saleAddOns: true,
    },
  });

  if (!existingSale) {
    throw new Error("Sale not found");
  }

  if (existingSale.status !== SaleStatus.DRAFT) {
    throw new Error("Cannot modify completed or cancelled sale");
  }

  // Delete existing services and addons
  await db.saleService.deleteMany({ where: { saleId: id } });
  await db.saleAddOn.deleteMany({ where: { saleId: id } });

  // Recalculate totals
  const basePrice = data.services?.reduce((sum, s) => sum + s.price * s.qty, 0) || 0;
  const addOnsTotal = data.addOns?.reduce((sum, a) => sum + a.price, 0) || 0;
  const total = basePrice + addOnsTotal;

  return db.sale.update({
    where: { id },
    data: {
      basePrice,
      addOns: addOnsTotal,
      total,
      customerId: data.customerId,

      saleServices: data.services?.length
        ? {
            create: data.services.map((s) => ({
              serviceId: s.serviceId,
              qty: s.qty,
              price: s.price,
            })),
          }
        : undefined,

      saleAddOns: data.addOns?.length
        ? {
            create: data.addOns.map((a) => ({
              addOnId: a.addOnId,
              price: a.price,
            })),
          }
        : undefined,
    },
    include: {
      branch: true,
      staff: true,
      customer: true,
      saleServices: { include: { service: true } },
      saleAddOns: { include: { addOn: true } },
      saleMaterials: { include: { material: true } },
      payments: true,
    },
  });
}

// CHECKOUT sale (finalize and make immutable)
export async function checkoutSale(id: string) {
  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      saleServices: true,
      saleAddOns: true,
    },
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  if (sale.status !== SaleStatus.DRAFT) {
    throw new Error("Sale is already completed or cancelled");
  }

  // Recalculate totals from persisted data (reproducible!)
  const basePrice = sale.saleServices.reduce(
    (sum, ss) => sum + ss.price * ss.qty,
    0
  );
  const addOnsTotal = sale.saleAddOns.reduce((sum, sa) => sum + sa.price, 0);
  const total = basePrice + addOnsTotal;

  return db.sale.update({
    where: { id },
    data: {
      status: SaleStatus.COMPLETED,
      endedAt: new Date(),
      basePrice,
      addOns: addOnsTotal,
      total,
    },
    include: {
      branch: true,
      staff: true,
      customer: true,
      saleServices: { include: { service: true } },
      saleAddOns: { include: { addOn: true } },
      saleMaterials: { include: { material: true } },
      payments: true,
    },
  });
}

// CANCEL sale
export async function cancelSale(id: string) {
  return db.sale.update({
    where: { id },
    data: {
      status: SaleStatus.CANCELLED,
      endedAt: new Date(),
    },
  });
}

// DELETE sale (only if DRAFT)
export async function deleteSale(id: string) {
  const sale = await db.sale.findUnique({ where: { id } });

  if (!sale) {
    throw new Error("Sale not found");
  }

  if (sale.status !== SaleStatus.DRAFT) {
    throw new Error("Cannot delete completed or cancelled sale");
  }

  return db.sale.delete({
    where: { id },
  });
}

// GET completed sales for history
export async function getCompletedSales(options?: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const { startDate, endDate, limit } = options || {};

  return db.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      ...(startDate || endDate
        ? {
            endedAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    },
    include: {
      branch: true,
      staff: true,
      customer: true,
      saleServices: {
        include: { service: true },
      },
    },
    orderBy: {
      endedAt: "desc",
    },
    ...(limit && { take: limit }),
  });
}

// GET today's completed sales
export async function getTodaysSales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getCompletedSales({
    startDate: today,
    endDate: tomorrow,
  });
}

// GET this week's completed sales
export async function getWeeklySales() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return getCompletedSales({
    startDate: startOfWeek,
    endDate: endOfWeek,
  });
}

// GET this month's completed sales
export async function getMonthlySales() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  return getCompletedSales({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });
}
