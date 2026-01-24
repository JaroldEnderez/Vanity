import { NextResponse } from "next/server";
import { cancelSale } from "@/src/app/lib/sales";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await cancelSale(id);
    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to cancel sale";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

