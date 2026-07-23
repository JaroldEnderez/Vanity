import { NextResponse } from "next/server";
import { getSessionById, updateSessionItemMaterial } from "@/src/app/lib/sessions";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

// PATCH /sessions/:id/items/:itemId/materials/:materialId → update a service line material quantity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string; materialId: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id, itemId, materialId } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    if (
      typeof body.quantity !== "number" ||
      !Number.isFinite(body.quantity) ||
      body.quantity <= 0
    ) {
      return NextResponse.json(
        { error: "quantity must be a positive finite number" },
        { status: 400 }
      );
    }

    const session = await updateSessionItemMaterial(
      id,
      itemId,
      materialId,
      body.quantity
    );

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update item material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string; materialId: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id, itemId, materialId } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const session = await import("@/src/app/lib/sessions").then(({ removeSessionItemMaterial }) =>
      removeSessionItemMaterial(id, itemId, materialId)
    );

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to remove item material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
