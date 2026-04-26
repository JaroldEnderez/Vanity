import { NextResponse } from "next/server";
import { Prisma, SaleStatus } from "@prisma/client";

import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { db } from "@/src/app/lib/db";
import {
  buildSalesXlsxBuffer,
  flattenSalesToRows,
  saleExportInclude,
} from "@/src/app/lib/salesExport";

function filenameForRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `sales-${fmt(start)}-to-${fmt(end)}.xlsx`;
}

export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const staffId = searchParams.get("staffId")?.trim() || undefined;
    const serviceId = searchParams.get("serviceId")?.trim() || undefined;

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDateParam);
    const end = new Date(endDateParam);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const where: Prisma.SaleWhereInput = {
      status: SaleStatus.COMPLETED,
      branchId,
      endedAt: {
        gte: start,
        lte: end,
      },
      ...(staffId ? { staffId } : {}),
      ...(serviceId
        ? { saleServices: { some: { serviceId } } }
        : {}),
    };

    const sales = await db.sale.findMany({
      where,
      include: saleExportInclude,
      orderBy: { endedAt: "desc" },
    });

    const rows = flattenSalesToRows(sales);
    const buffer = buildSalesXlsxBuffer(rows);

    const filename = filenameForRange(start, end);
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
