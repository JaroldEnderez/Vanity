import { NextResponse } from "next/server";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { db } from "@/src/app/lib/db";
import { buildExpensesCsvBuffer, flattenExpensesToRows } from "@/src/app/lib/expensesExport";

function filenameForNow(): string {
  const d = new Date();
  const fmt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `expenses-${fmt}.csv`;
}

/** GET /api/expenses/export?startDate=&endDate= — optional range; omit both for all branch expenses */
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
    } else if (startDateParam || endDateParam) {
      return NextResponse.json(
        { error: "Provide both startDate and endDate, or neither" },
        { status: 400 }
      );
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        date: true,
        item: true,
        amount: true,
        remarks: true,
      },
    });

    const rows = flattenExpensesToRows(expenses);
    const buffer = buildExpensesCsvBuffer(rows);
    const filename = filenameForNow();
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Export failed";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
