import { NextResponse } from "next/server";
import { getDraftSessions, createSession } from "@/src/app/lib/sessions";

// GET /sessions?draft=true → get all draft sessions
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || undefined;
    
    // Only return drafts (sessions API is for drafts only)
    const sessions = await getDraftSessions(branchId);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /sessions → create draft session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.branchId || !body.staffId) {
      return NextResponse.json(
        { error: "branchId and staffId are required" },
        { status: 400 }
      );
    }

    const session = await createSession({
      branchId: body.branchId,
      staffId: body.staffId,
      name: body.name,
      customerId: body.customerId,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
