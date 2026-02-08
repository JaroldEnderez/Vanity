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

// GET completed sales for history - Optimized with selective includes
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
      branch: {
        select: { id: true, name: true },
      },
      staff: {
        select: { id: true, name: true },
      },
      customer: {
        select: { id: true, name: true },
      },
      saleServices: {
        select: {
          id: true,
          qty: true,
          price: true,
          service: {
            select: { id: true, name: true },
          },
        },
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

// AGGREGATE sales by time interval for charts
export type SalesAggregation = {
  period: string; // e.g., "2024-01-15", "2024-01-15 10:00", "Week 1"
  date: string | Date; // ISO string for JSON serialization
  total: number;
  count: number;
};

// Aggregate sales by hour (for today)
export async function getSalesByHour(branchId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sales = await db.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      endedAt: {
        gte: today,
        lt: tomorrow,
      },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      total: true,
      endedAt: true,
    },
  });

  // Group by hour
  const hourlyMap = new Map<number, { total: number; count: number }>();
  
  // Initialize all 24 hours
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, { total: 0, count: 0 });
  }

  sales.forEach((sale) => {
    if (sale.endedAt) {
      const hour = sale.endedAt.getHours();
      const current = hourlyMap.get(hour) || { total: 0, count: 0 };
      hourlyMap.set(hour, {
        total: current.total + sale.total,
        count: current.count + 1,
      });
    }
  });

  return Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({
      period: `${hour.toString().padStart(2, "0")}:00`,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour).toISOString(),
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Aggregate sales by day (for current week or month)
export async function getSalesByDay(startDate: Date, endDate: Date, branchId?: string) {
  const sales = await db.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      endedAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      total: true,
      endedAt: true,
    },
  });

  // Group by day
  const dailyMap = new Map<string, { total: number; count: number }>();

  sales.forEach((sale) => {
    if (sale.endedAt) {
      const dayKey = sale.endedAt.toISOString().split("T")[0]; // YYYY-MM-DD
      const current = dailyMap.get(dayKey) || { total: 0, count: 0 };
      dailyMap.set(dayKey, {
        total: current.total + sale.total,
        count: current.count + 1,
      });
    }
  });

  // Fill in missing days
  const result: SalesAggregation[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayKey = current.toISOString().split("T")[0];
    const data = dailyMap.get(dayKey) || { total: 0, count: 0 };
    
    result.push({
      period: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      date: new Date(current).toISOString(),
      total: data.total,
      count: data.count,
    });
    
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// Aggregate sales by week (for current month or year)
export async function getSalesByWeek(startDate: Date, endDate: Date, branchId?: string) {
  const sales = await db.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      endedAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      total: true,
      endedAt: true,
    },
  });

  // Group by week
  const weeklyMap = new Map<string, { total: number; count: number; startDate: Date }>();

  sales.forEach((sale) => {
    if (sale.endedAt) {
      const weekStart = new Date(sale.endedAt);
      weekStart.setDate(sale.endedAt.getDate() - sale.endedAt.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split("T")[0];
      const current = weeklyMap.get(weekKey) || { total: 0, count: 0, startDate: weekStart };
      weeklyMap.set(weekKey, {
        total: current.total + sale.total,
        count: current.count + 1,
        startDate: weekStart,
      });
    }
  });

  return Array.from(weeklyMap.entries())
    .map(([weekKey, data]) => {
      const weekEnd = new Date(data.startDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return {
        period: `${data.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        date: data.startDate.toISOString(),
        total: data.total,
        count: data.count,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Aggregate sales by month (for current year)
export async function getSalesByMonth(startDate: Date, endDate: Date, branchId?: string) {
  const sales = await db.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      endedAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      total: true,
      endedAt: true,
    },
  });

  // Group by month
  const monthlyMap = new Map<string, { total: number; count: number; date: Date }>();

  sales.forEach((sale) => {
    if (sale.endedAt) {
      const monthKey = `${sale.endedAt.getFullYear()}-${sale.endedAt.getMonth()}`;
      const monthStart = new Date(sale.endedAt.getFullYear(), sale.endedAt.getMonth(), 1);
      const current = monthlyMap.get(monthKey) || { total: 0, count: 0, date: monthStart };
      monthlyMap.set(monthKey, {
        total: current.total + sale.total,
        count: current.count + 1,
        date: monthStart,
      });
    }
  });

  return Array.from(monthlyMap.entries())
    .map(([monthKey, data]) => ({
      period: data.date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      date: data.date.toISOString(),
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
