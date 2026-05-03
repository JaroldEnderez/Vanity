import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

async function assertExpenseInBranch(expenseId: string, branchId: string) {
  const row = await db.expense.findFirst({
    where: { id: expenseId, branchId },
    select: { id: true },
  });
  return !!row;
}

/** PATCH /api/expenses/[id] */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;

    const ok = await assertExpenseInBranch(id, branchId);
    if (!ok) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      date?: unknown;
      item?: unknown;
      amount?: unknown;
      remarks?: unknown;
    };

    const data: {
      date?: Date;
      item?: string;
      amount?: number;
      remarks?: string | null;
    } = {};

    if (body.item !== undefined) {
      const item = typeof body.item === "string" ? body.item.trim() : "";
      if (!item) {
        return NextResponse.json({ error: "item cannot be empty" }, { status: 400 });
      }
      data.item = item;
    }

    if (body.amount !== undefined) {
      const amount =
        typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : NaN;
      if (!(amount > 0)) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      data.amount = amount;
    }

    if (body.remarks !== undefined) {
      if (body.remarks === null) {
        data.remarks = null;
      } else if (typeof body.remarks === "string") {
        data.remarks = body.remarks.trim() || null;
      } else {
        return NextResponse.json({ error: "Invalid remarks" }, { status: 400 });
      }
    }

    if (body.date !== undefined) {
      if (typeof body.date !== "string") {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      const date = new Date(body.date);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      data.date = date;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.expense.update({
      where: { id },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update expense";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE /api/expenses/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;

    const ok = await assertExpenseInBranch(id, branchId);
    if (!ok) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete expense";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
