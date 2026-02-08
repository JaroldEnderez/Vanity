import { NextResponse } from "next/server";
import { getSessionById, checkoutSession } from "@/src/app/lib/sessions";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

// POST /sessions/:id/checkout → finalize session (mark as COMPLETED)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { cashReceived } = body;

    const session = await checkoutSession(id, cashReceived);
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to checkout";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
