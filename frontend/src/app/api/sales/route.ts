import { NextResponse } from "next/server";
import { createSale } from "@/src/app/lib/sales";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { db } from "@/src/app/lib/db";
import { SaleStatus } from "@prisma/client";

const saleListInclude = {
  branch: { select: { id: true, name: true } },
  staff: { select: { id: true, name: true } },
  saleServices: {
    select: {
      id: true,
      qty: true,
      price: true,
      service: { select: { id: true, name: true } },
    },
  },
};

export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where: { status: SaleStatus; branchId: string; endedAt?: { gte: Date; lte: Date } } = {
      status: SaleStatus.COMPLETED,
      branchId,
    };

    if (startDateParam && endDateParam) {
      where.endedAt = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }

    const sales = await db.sale.findMany({
      where,
      include: saleListInclude,
      orderBy: { endedAt: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sale = await createSale(body);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
