import { NextResponse } from "next/server";
import { getSaleById, updateSale, deleteSale } from "@/src/app/lib/sales";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const sale = await getSaleById(id);

    if (!sale || sale.branchId !== branchId) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch sale";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function PUT(
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

    const body = await req.json();
    const sale = await updateSale(id, body);
    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update sale";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function DELETE(
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

    await deleteSale(id);
    return NextResponse.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete sale";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

