import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { getBranchesWithStatus } from "@/src/app/lib/owner";

export async function GET() {
  try {
    await requireOwner();
    const branches = await getBranchesWithStatus();
    return NextResponse.json(branches);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load branches" },
      { status: 500 }
    );
  }
}
