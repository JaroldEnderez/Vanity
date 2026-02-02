import { NextResponse } from "next/server";
import { checkoutSession } from "@/src/app/lib/sessions";

// POST /sessions/:id/checkout → finalize session (mark as COMPLETED)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { cashReceived } = body;
    
    const session = await checkoutSession(id, cashReceived);
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to checkout";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
