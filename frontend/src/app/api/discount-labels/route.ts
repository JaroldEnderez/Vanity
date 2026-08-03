import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { normalizeDiscountLabel } from "@/src/app/lib/discount";

export async function GET() {
  try {
    const branchId = await getAuthBranchId();

    const labels = await db.discountLabel.findMany({
      where: { branchId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch discount labels";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const branchId = await getAuthBranchId();

    const body = (await req.json()) as { name?: string };
    const name = normalizeDiscountLabel(body.name);
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await db.discountLabel.findFirst({
      where: { branchId, name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true, createdAt: true },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const created = await db.discountLabel.create({
      data: { branchId, name },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const e = error as { code?: string };
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Discount name already exists" }, { status: 409 });
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create discount label";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
