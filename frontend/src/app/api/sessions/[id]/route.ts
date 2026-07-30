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

    const data: {
      name?: string;
      customerId?: string;
      staffId?: string;
      discountPercent?: number;
      discountLabel?: string | null;
      optionalMaterials?: unknown | null;
    } = {};
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

    if ("discountPercent" in body) {
      const n = Number(body.discountPercent);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json(
          { error: "discountPercent must be a number between 0 and 100" },
          { status: 400 }
        );
      }
      data.discountPercent = n;
    }
    if ("discountLabel" in body) {
      const raw = body.discountLabel;
      if (raw === null || raw === undefined) {
        data.discountLabel = null;
      } else if (typeof raw === "string") {
        data.discountLabel = raw.trim() || null;
      } else {
        return NextResponse.json(
          { error: "discountLabel must be a string or null" },
          { status: 400 }
        );
      }
    }

    if ("optionalMaterials" in body) {
      const raw = body.optionalMaterials;
      if (raw === null || raw === undefined) {
        data.optionalMaterials = null;
      } else if (Array.isArray(raw)) {
        data.optionalMaterials = raw;
      } else if (typeof raw === "object") {
        const o = raw as Record<string, unknown>;
        if (
          "materials" in o &&
          o.materials !== undefined &&
          !Array.isArray(o.materials)
        ) {
          return NextResponse.json(
            { error: "optionalMaterials.materials must be an array when present" },
            { status: 400 }
          );
        }
        if (
          "remarks" in o &&
          o.remarks !== undefined &&
          typeof o.remarks !== "string"
        ) {
          return NextResponse.json(
            { error: "optionalMaterials.remarks must be a string when present" },
            { status: 400 }
          );
        }
        data.optionalMaterials = raw;
      } else {
        return NextResponse.json(
          { error: "optionalMaterials must be an array, object, or null" },
          { status: 400 }
        );
      }
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
