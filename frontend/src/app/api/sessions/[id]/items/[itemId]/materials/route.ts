import { NextResponse } from "next/server";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

// This collection route is intentionally not used for line-item material updates.
// The material-specific route under /items/[itemId]/materials/[materialId] handles updates/removals.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await getAuthBranchId();
    const { id, itemId } = await params;
    return NextResponse.json(
      { error: `Use the material-specific route for session ${id} item ${itemId}` },
      { status: 400 }
    );
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
