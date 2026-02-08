import { NextResponse } from "next/server";
import { getSaleById, checkoutSale } from "@/src/app/lib/sales";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getSaleById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    const sale = await checkoutSale(id);
    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to checkout sale";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

