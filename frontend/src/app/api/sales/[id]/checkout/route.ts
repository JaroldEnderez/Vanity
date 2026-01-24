import { NextResponse } from "next/server";
import { checkoutSale } from "@/src/app/lib/sales";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await checkoutSale(id);
    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to checkout sale";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

