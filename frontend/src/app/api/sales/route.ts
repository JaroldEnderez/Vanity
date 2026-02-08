import { NextResponse } from "next/server";
import { getAllSales, createSale, getCompletedSales } from "@/src/app/lib/sales";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { db } from "@/src/app/lib/db";
import { SaleStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // If date range is provided, use getCompletedSales with filtering
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      // Get completed sales filtered by branch and date range
      const sales = await db.sale.findMany({
        where: {
          status: SaleStatus.COMPLETED,
          branchId,
          endedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
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
        },
        orderBy: { endedAt: "desc" },
      });

      return NextResponse.json(sales);
    }

    // Otherwise, return all completed sales for the branch
    const sales = await getCompletedSales();
    const filteredSales = sales.filter((sale) => sale.branch?.id === branchId);
    return NextResponse.json(filteredSales);
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
