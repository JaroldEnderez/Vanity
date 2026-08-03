import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { getBranchDetail, updateBranchForOwner } from "@/src/app/lib/owner";
import { getBranchActivationStatus } from "@/src/app/lib/activation";
import { logActivity } from "@/src/app/lib/activityLog";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const branch = await getBranchDetail(id, session.user.id);
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    const activation = await getBranchActivationStatus(id);
    return NextResponse.json({
      ...branch,
      activation,
    });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load branch" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const data: { address?: string; name?: string } = {};
    if ("address" in body) {
      data.address = typeof body.address === "string" ? body.address : "";
    }
    if ("name" in body) {
      data.name = typeof body.name === "string" ? body.name : "";
    }

    if (!("address" in data) && !("name" in data)) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const before = await getBranchDetail(id, session.user.id);
    if (!before) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const branch = await updateBranchForOwner(session.user.id, id, data);

    const beforeSnap: { name?: string; address?: string } = {};
    const afterSnap: { name?: string; address?: string } = {};
    if ("name" in data) {
      beforeSnap.name = before.name;
      afterSnap.name = branch.name;
    }
    if ("address" in data) {
      beforeSnap.address = before.address;
      afterSnap.address = branch.address;
    }

    await logActivity({
      branchId: id,
      actorType: "owner",
      actorId: session.user.id,
      action: "branch.updated",
      entityType: "Branch",
      entityId: id,
      summary: `Updated branch “${branch.name}”`,
      before: beforeSnap,
      after: afterSnap,
    });

    return NextResponse.json(branch);
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Branch not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message === "Branch name is required" ||
      message === "A branch with this name already exists" ||
      message === "No fields to update"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
  }
}
