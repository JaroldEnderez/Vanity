import { NextResponse } from "next/server";
import { createSale } from "@/src/app/lib/sales";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { db } from "@/src/app/lib/db";
import { SaleStatus } from "@prisma/client";

const saleListInclude = {
  branch: { select: { id: true, name: true } },
  staff: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  saleServices: {
    select: {
      id: true,
      qty: true,
      price: true,
      serviceDisplayName: true,
      colorUsed: true,
      developer: true,
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
    const branchId = await getAuthBranchId();
    const body = (await req.json()) as {
      staffId?: string;
      customerId?: string;
      services?: Array<{ serviceId: string; qty: number; price: number }>;
      addOns?: Array<{ addOnId: string; price: number }>;
      materials?: Array<{ materialId: string; quantity: number }>;
    };
    if (!body.staffId || !body.services?.length) {
      return NextResponse.json(
        { error: "staffId and services are required" },
        { status: 400 }
      );
    }
    // Never trust client-supplied branchId (IDOR)
    const sale = await createSale({
      branchId,
      staffId: body.staffId,
      customerId: body.customerId,
      services: body.services,
      addOns: body.addOns,
      materials: body.materials,
    });
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create sale";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
