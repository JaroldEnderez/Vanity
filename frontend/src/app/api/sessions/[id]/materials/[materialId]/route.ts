import { NextResponse } from "next/server";
import { getSessionById, updateSessionMaterial } from "@/src/app/lib/sessions";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

// PATCH /sessions/:id/materials/:materialId → update material quantity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id, materialId } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    if (typeof body.quantity !== "number") {
      return NextResponse.json(
        { error: "quantity is required" },
        { status: 400 }
      );
    }

    const session = await updateSessionMaterial(id, materialId, body.quantity);
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
