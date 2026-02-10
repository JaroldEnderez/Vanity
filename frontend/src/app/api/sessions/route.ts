import { NextResponse } from "next/server";
import { getDraftSessions, createSession } from "@/src/app/lib/sessions";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

// GET /sessions → get all draft sessions for current branch
export async function GET() {
  try {
    const branchId = await getAuthBranchId();
    
    // Only return drafts (sessions API is for drafts only)
    const sessions = await getDraftSessions(branchId);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch sessions";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /sessions → create draft session for current branch
export async function POST(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const body = await req.json();
    
    if (!body.staffId) {
      return NextResponse.json(
        { error: "staffId is required" },
        { status: 400 }
      );
    }

    // Ensure session always has a name (for owner dashboard and display)
    let name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    if (!name) {
      const drafts = await getDraftSessions(branchId);
      name = `Session #${drafts.length + 1}`;
    }

    const session = await createSession({
      branchId,
      staffId: body.staffId,
      name,
      customerId: body.customerId,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create session";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
