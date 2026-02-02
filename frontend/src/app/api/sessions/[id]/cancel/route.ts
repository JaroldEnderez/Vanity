import { NextResponse } from "next/server";
import { cancelSession } from "@/src/app/lib/sessions";

// POST /sessions/:id/cancel → cancel session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await cancelSession(id);
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to cancel session";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
