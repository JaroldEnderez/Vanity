import { NextResponse } from "next/server";
import { updateSessionMaterial } from "@/src/app/lib/sessions";

// PATCH /sessions/:id/materials/:materialId → update material quantity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id, materialId } = await params;
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
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
