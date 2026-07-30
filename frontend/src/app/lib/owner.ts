import { db } from "./db";
import { SaleStatus } from "@prisma/client";

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export type OwnerSummary = {
  totalRevenueToday: number;
  totalRevenueThisWeek: number;
  totalRevenueThisMonth: number;
  transactionCountToday: number;
  transactionCountThisWeek: number;
  transactionCountThisMonth: number;
  branchCount: number;
};

export type BranchStatus = {
  id: string;
  name: string;
  address: string;
  lastActiveAt: Date | null;
  isOnline: boolean;
  salesCountToday: number;
  salesCountThisWeek: number;
  revenueToday: number;
  revenueThisWeek: number;
};

export type BranchDetail = {
  id: string;
  name: string;
  address: string;
  lastActiveAt: Date | null;
  isOnline: boolean;
  salesCountToday: number;
  salesCountThisWeek: number;
  salesCountThisMonth: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfWeek(): Date {
  const d = startOfWeek();
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isOnline(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < OFFLINE_THRESHOLD_MS;
}

/** Overall business health for owner dashboard */
export async function getOwnerSummary(ownerId?: string): Promise<OwnerSummary> {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const branchWhere = ownerId ? { ownerId } : {};
  const ownerBranchIds = ownerId
    ? (
        await db.branch.findMany({
          where: { ownerId },
          select: { id: true },
        })
      ).map((b) => b.id)
    : undefined;

  const saleBranchFilter =
    ownerBranchIds !== undefined
      ? { branchId: { in: ownerBranchIds } }
      : {};

  const [branchCount, todaySales, weekSales, monthSales] = await Promise.all([
    db.branch.count({ where: branchWhere }),
    db.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        endedAt: { gte: todayStart, lte: todayEnd },
        ...saleBranchFilter,
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        endedAt: { gte: weekStart, lte: weekEnd },
        ...saleBranchFilter,
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        endedAt: { gte: monthStart, lte: monthEnd },
        ...saleBranchFilter,
      },
      select: { total: true },
    }),
  ]);

  return {
    totalRevenueToday: todaySales.reduce((s, x) => s + x.total, 0),
    totalRevenueThisWeek: weekSales.reduce((s, x) => s + x.total, 0),
    totalRevenueThisMonth: monthSales.reduce((s, x) => s + x.total, 0),
    transactionCountToday: todaySales.length,
    transactionCountThisWeek: weekSales.length,
    transactionCountThisMonth: monthSales.length,
    branchCount,
  };
}

/** All branches with status and key metrics for owner */
export async function getBranchesWithStatus(
  ownerId?: string
): Promise<BranchStatus[]> {
  const branches = await db.branch.findMany({
    where: ownerId ? { ownerId } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, lastActiveAt: true },
  });

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();

  const branchIds = branches.map((b) => b.id);
  const [todayAgg, weekAgg] = await Promise.all([
    db.sale.groupBy({
      by: ["branchId"],
      where: {
        branchId: { in: branchIds },
        status: SaleStatus.COMPLETED,
        endedAt: { gte: todayStart, lte: todayEnd },
      },
      _count: { id: true },
      _sum: { total: true },
    }),
    db.sale.groupBy({
      by: ["branchId"],
      where: {
        branchId: { in: branchIds },
        status: SaleStatus.COMPLETED,
        endedAt: { gte: weekStart, lte: weekEnd },
      },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  const todayByBranch = new Map(
    todayAgg.map((a) => [a.branchId, { count: a._count.id, revenue: a._sum.total ?? 0 }])
  );
  const weekByBranch = new Map(
    weekAgg.map((a) => [a.branchId, { count: a._count.id, revenue: a._sum.total ?? 0 }])
  );

  return branches.map((b) => {
    const today = todayByBranch.get(b.id) ?? { count: 0, revenue: 0 };
    const week = weekByBranch.get(b.id) ?? { count: 0, revenue: 0 };
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      lastActiveAt: b.lastActiveAt,
      isOnline: isOnline(b.lastActiveAt),
      salesCountToday: today.count,
      salesCountThisWeek: week.count,
      revenueToday: today.revenue,
      revenueThisWeek: week.revenue,
    };
  });
}

/** Single branch detail for drill-down */
export async function getBranchDetail(
  branchId: string,
  ownerId?: string
): Promise<BranchDetail | null> {
  const branch = await db.branch.findFirst({
    where: {
      id: branchId,
      ...(ownerId ? { ownerId } : {}),
    },
    select: { id: true, name: true, address: true, lastActiveAt: true },
  });
  if (!branch) return null;

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [todaySales, weekSales, monthSales] = await Promise.all([
    db.sale.findMany({
      where: {
        branchId,
        status: SaleStatus.COMPLETED,
        endedAt: { gte: todayStart, lte: todayEnd },
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        branchId,
        status: SaleStatus.COMPLETED,
        endedAt: { gte: weekStart, lte: weekEnd },
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        branchId,
        status: SaleStatus.COMPLETED,
        endedAt: { gte: monthStart, lte: monthEnd },
      },
      select: { total: true },
    }),
  ]);

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    lastActiveAt: branch.lastActiveAt,
    isOnline: isOnline(branch.lastActiveAt),
    salesCountToday: todaySales.length,
    salesCountThisWeek: weekSales.length,
    salesCountThisMonth: monthSales.length,
    revenueToday: todaySales.reduce((s, x) => s + x.total, 0),
    revenueThisWeek: weekSales.reduce((s, x) => s + x.total, 0),
    revenueThisMonth: monthSales.reduce((s, x) => s + x.total, 0),
  };
}

/** Create a branch for an owner and seed default catalog data. */
export async function createBranchForOwner(
  ownerId: string,
  name: string,
  address = ""
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Branch name is required");
  }

  const existing = await db.branch.findUnique({ where: { name: trimmed } });
  if (existing) {
    throw new Error("A branch with this name already exists");
  }

  const { seedBranchDefaults } = await import("./branch-seed");

  const branch = await db.branch.create({
    data: {
      name: trimmed,
      address: address.trim(),
      ownerId,
    },
  });

  await seedBranchDefaults(branch.id);

  return branch;
}

/** Ensure the branch belongs to the given owner. */
export async function assertBranchOwnedBy(
  branchId: string,
  ownerId: string
): Promise<boolean> {
  const branch = await db.branch.findFirst({
    where: { id: branchId, ownerId },
    select: { id: true },
  });
  return !!branch;
}

/** All catalog materials with this branch's stock (read-only) */
export async function getBranchInventory(branchId: string) {
  const rows = await db.branchMaterial.findMany({
    where: { branchId },
    include: {
      material: {
        select: {
          id: true,
          name: true,
          unit: true,
          isActive: true,
        },
      },
    },
    orderBy: { material: { name: "asc" } },
  });

  return rows
    .filter((r) => r.material.isActive)
    .map((r) => ({
      id: r.material.id,
      name: r.material.name,
      unit: r.material.unit,
      stock: r.stock,
    }));
}

/** Completed sales for a branch (read-only list) */
export async function getBranchSales(
  branchId: string,
  options?: { startDate?: Date; endDate?: Date; limit?: number }
) {
  const { startDate, endDate, limit = 50 } = options ?? {};
  return db.sale.findMany({
    where: {
      branchId,
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
    orderBy: { endedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      total: true,
      cashReceived: true,
      changeGiven: true,
      endedAt: true,
      staff: { select: { name: true } },
      saleServices: {
        select: {
          qty: true,
          price: true,
          service: { select: { name: true } },
        },
      },
      saleMaterials: {
        select: {
          quantity: true,
          material: { select: { name: true, unit: true } },
        },
      },
    },
  });
}
