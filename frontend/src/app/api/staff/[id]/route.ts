import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

async function assertStaffInBranch(staffId: string, branchId: string) {
  const row = await db.staff.findFirst({
    where: { id: staffId, branchId },
    select: { id: true },
  });
  return !!row;
}

/** PATCH /api/staff/[id] */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;

    const ok = await assertStaffInBranch(id, branchId);
    if (!ok) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const body = (await req.json()) as { name?: string; role?: string | null };

    const data: { name?: string; role?: string | null } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.role !== undefined) {
      data.role =
        body.role === null ? null : typeof body.role === "string" ? body.role.trim() || null : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.staff.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update staff";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE /api/staff/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;

    const ok = await assertStaffInBranch(id, branchId);
    if (!ok) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const salesCount = await db.sale.count({ where: { staffId: id } });
    if (salesCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete staff with existing sales. Reassign or archive instead." },
        { status: 400 }
      );
    }

    await db.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete staff";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
