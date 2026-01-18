import { NextResponse } from "next/server";
import { cancelSale } from "@/src/app/lib/sales";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sale = await cancelSale(params.id);
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

