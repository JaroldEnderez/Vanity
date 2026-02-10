import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { getBranchInventory } from "@/src/app/lib/owner";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner();
    const { id } = await params;
    const inventory = await getBranchInventory(id);
    return NextResponse.json(inventory);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load branch inventory" },
      { status: 500 }
    );
  }
}
