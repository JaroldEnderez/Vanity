import { NextResponse } from "next/server";
import { getSessionById, updateSession, deleteSession } from "@/src/app/lib/sessions";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { ensureWalkInCustomer } from "@/src/app/lib/ensureWalkInCustomer";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";

// GET /sessions/:id → get single session
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const session = await getSessionById(id);

    if (!session || session.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch session";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// PATCH /sessions/:id → update session (name, customer)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    await ensureWalkInCustomer();

    const data: { name?: string; customerId?: string; staffId?: string } = {};
    if (typeof body.name === "string") {
      data.name = body.name.trim();
    }
    if (typeof body.staffId === "string" && body.staffId.trim()) {
      data.staffId = body.staffId.trim();
    }
    if ("customerId" in body) {
      const cid = body.customerId;
      data.customerId =
        cid === null || cid === undefined || cid === ""
          ? WALK_IN_CUSTOMER_ID
          : String(cid).trim();
    }

    const session = await updateSession(id, data);

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update session";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE /sessions/:id → delete draft session
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    await deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete session";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
