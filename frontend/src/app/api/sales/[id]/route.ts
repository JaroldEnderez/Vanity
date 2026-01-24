import { NextResponse } from "next/server";
import { getSaleById, updateSale, deleteSale } from "@/src/app/lib/sales";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await getSaleById(id);
    
    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const sale = await updateSale(id, body);
    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSale(id);
    return NextResponse.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}

