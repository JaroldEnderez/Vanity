import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { getBranchDetail } from "@/src/app/lib/owner";
import { getBranchActivationStatus } from "@/src/app/lib/activation";

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
