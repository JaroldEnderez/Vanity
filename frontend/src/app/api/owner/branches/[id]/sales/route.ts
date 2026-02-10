import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { getBranchSales } from "@/src/app/lib/owner";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const limitParam = searchParams.get("limit");

    const startDate = startParam ? new Date(startParam) : undefined;
    const endDate = endParam ? new Date(endParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const sales = await getBranchSales(id, {
      startDate,
      endDate,
      limit: limit ?? 50,
    });
    return NextResponse.json(sales);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load branch sales" },
      { status: 500 }
    );
  }
}
