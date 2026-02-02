import { NextResponse } from "next/server";
import { removeItemFromSession } from "@/src/app/lib/sessions";

// DELETE /sessions/:id/items/:itemId → remove item from session
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const session = await removeItemFromSession(id, itemId);
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to remove item";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
