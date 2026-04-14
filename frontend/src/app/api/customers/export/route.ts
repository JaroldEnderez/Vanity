import { NextResponse } from "next/server";

import { auth } from "@/src/app/lib/auth";
import { buildCustomersCsvBuffer, flattenCustomersToRows } from "@/src/app/lib/customersExport";
import { db } from "@/src/app/lib/db";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";

function filenameForNow(): string {
  const d = new Date();
  const fmt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `customers-${fmt}.csv`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await db.customer.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        fb: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    // Omit built-in Walk-in customer (default when none is set)—not a real directory entry.
    const rows = flattenCustomersToRows(
      customers.filter((c) => c.id !== WALK_IN_CUSTOMER_ID)
    );
    const buffer = buildCustomersCsvBuffer(rows);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
