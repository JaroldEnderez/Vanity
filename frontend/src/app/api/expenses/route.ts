import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

/** GET /api/expenses?startDate=&endDate= */
export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where: { branchId: string; date?: { gte: Date; lte: Date } } = {
      branchId,
    };

    if (startDateParam && endDateParam) {
      where.date = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        branchId: true,
        date: true,
        item: true,
        amount: true,
        remarks: true,
        createdAt: true,
      },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch expenses";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** POST /api/expenses */
export async function POST(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const body = (await req.json()) as {
      date?: unknown;
      item?: unknown;
      amount?: unknown;
      remarks?: unknown;
    };

    const item = typeof body.item === "string" ? body.item.trim() : "";
    if (!item) {
      return NextResponse.json({ error: "item is required" }, { status: 400 });
    }

    const amount =
      typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : NaN;
    if (!(amount > 0)) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    let date: Date;
    if (typeof body.date === "string") {
      date = new Date(body.date);
    } else {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const remarks =
      body.remarks === undefined || body.remarks === null
        ? null
        : typeof body.remarks === "string"
          ? body.remarks.trim() || null
          : null;

    const created = await db.expense.create({
      data: {
        branchId,
        date,
        item,
        amount,
        remarks,
      },
      select: {
        id: true,
        branchId: true,
        date: true,
        item: true,
        amount: true,
        remarks: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create expense";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
