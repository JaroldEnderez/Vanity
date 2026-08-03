import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { auth } from "@/src/app/lib/auth";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";
import { logActivity } from "@/src/app/lib/activityLog";

function branchIdFromSession(session: {
  user?: { branchId?: string; role?: string };
}): string | null {
  const role = session.user?.role;
  const branchId = session.user?.branchId;
  if ((role === "branch" || role === "terminal") && branchId) return branchId;
  return null;
}

/** Own branch, or legacy unscoped (null). Never Walk-in. */
function canModifyCustomer(
  customer: { id: string; branchId: string | null },
  branchId: string
): boolean {
  if (customer.id === WALK_IN_CUSTOMER_ID) return false;
  return customer.branchId === branchId || customer.branchId === null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branchId = branchIdFromSession(session);
    if (!branchId) {
      return NextResponse.json(
        { error: "Unauthorized - no branch session" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (id === WALK_IN_CUSTOMER_ID) {
      return NextResponse.json(
        { error: "System Walk-in customer cannot be edited." },
        { status: 400 }
      );
    }

    const existing = await db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        name: true,
        phone: true,
        address: true,
        fb: true,
        dateOfBirth: true,
      },
    });

    if (!existing || !canModifyCustomer(existing, branchId)) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      name?: string;
      address?: string | null;
      phone?: string | null;
      fb?: string | null;
      dateOfBirth?: string | null;
    };

    const data: {
      branchId?: string;
      name?: string;
      address?: string | null;
      phone?: string | null;
      fb?: string | null;
      dateOfBirth?: Date | null;
    } = {};

    // Claim legacy unscoped customers for this branch on first edit
    if (existing.branchId === null) {
      data.branchId = branchId;
    }

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
        branchId: true,
        name: true,
        address: true,
        phone: true,
        fb: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    await logActivity({
      branchId,
      actorType: session.user.role ?? "branch",
      actorId: session.user.id,
      action: "customer.updated",
      entityType: "Customer",
      entityId: updated.id,
      summary: `Updated customer “${updated.name}”`,
      before: {
        name: existing.name,
        phone: existing.phone,
        address: existing.address,
        fb: existing.fb,
        dateOfBirth: existing.dateOfBirth,
      },
      after: {
        name: updated.name,
        phone: updated.phone,
        address: updated.address,
        fb: updated.fb,
        dateOfBirth: updated.dateOfBirth,
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

    const branchId = branchIdFromSession(session);
    if (!branchId) {
      return NextResponse.json(
        { error: "Unauthorized - no branch session" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (id === WALK_IN_CUSTOMER_ID) {
      return NextResponse.json(
        { error: "System Walk-in customer cannot be deleted." },
        { status: 400 }
      );
    }

    const existing = await db.customer.findUnique({
      where: { id },
      select: { id: true, branchId: true, name: true, phone: true, address: true },
    });

    if (!existing || !canModifyCustomer(existing, branchId)) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Another branch owns this customer
    if (existing.branchId !== null && existing.branchId !== branchId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const salesCount = await db.sale.count({ where: { customerId: id } });
    if (salesCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing sales history" },
        { status: 400 }
      );
    }

    await db.customer.delete({ where: { id } });

    await logActivity({
      branchId,
      actorType: session.user.role ?? "branch",
      actorId: session.user.id,
      action: "customer.deleted",
      entityType: "Customer",
      entityId: id,
      summary: `Deleted customer “${existing.name}”`,
      before: {
        name: existing.name,
        phone: existing.phone,
        address: existing.address,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete customer";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
