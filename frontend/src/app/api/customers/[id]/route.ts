import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { auth } from "@/src/app/lib/auth";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (id === WALK_IN_CUSTOMER_ID) {
      return NextResponse.json(
        { error: "System Walk-in customer cannot be edited." },
        { status: 400 }
      );
    }
    const body = (await req.json()) as {
      name?: string;
      address?: string | null;
      phone?: string | null;
      fb?: string | null;
      dateOfBirth?: string | null;
    };

    const data: {
      name?: string;
      address?: string | null;
      phone?: string | null;
      fb?: string | null;
      dateOfBirth?: Date | null;
    } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      data.name = name;
    }

    if (body.address !== undefined) {
      data.address = typeof body.address === "string" ? (body.address.trim() || null) : null;
    }
    if (body.phone === null) {
      data.phone = null;
    } else if (typeof body.phone === "string") {
      data.phone = body.phone.trim() || null;
    }
    if (body.fb !== undefined) {
      data.fb = typeof body.fb === "string" ? (body.fb.trim() || null) : null;
    }
    if (body.dateOfBirth !== undefined) {
      data.dateOfBirth =
        body.dateOfBirth === null || body.dateOfBirth === ""
          ? null
          : typeof body.dateOfBirth === "string" && body.dateOfBirth.trim()
            ? new Date(body.dateOfBirth)
            : undefined;
    }

    const updated = await db.customer.update({
      where: { id },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    const e = error as { code?: string };
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update customer";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (id === WALK_IN_CUSTOMER_ID) {
      return NextResponse.json(
        { error: "System Walk-in customer cannot be deleted." },
        { status: 400 }
      );
    }

    const salesCount = await db.sale.count({ where: { customerId: id } });
    if (salesCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing sales history" },
        { status: 400 }
      );
    }

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete customer";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
