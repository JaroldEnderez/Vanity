import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { assertBranchOwnedBy } from "@/src/app/lib/owner";
import { getBranchActivationStatus, revokeTerminal } from "@/src/app/lib/activation";
import { db } from "@/src/app/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const owned = await assertBranchOwnedBy(id, session.user.id);
    if (!owned) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    const status = await getBranchActivationStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load terminals" },
      { status: 500 }
    );
  }
}

/** Revoke a terminal: body { terminalId } */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const owned = await assertBranchOwnedBy(id, session.user.id);
    if (!owned) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const terminalId =
      typeof body.terminalId === "string" ? body.terminalId : "";
    if (!terminalId) {
      return NextResponse.json(
        { error: "terminalId is required" },
        { status: 400 }
      );
    }

    const terminal = await db.terminal.findFirst({
      where: { id: terminalId, branchId: id },
    });
    if (!terminal) {
      return NextResponse.json(
        { error: "Terminal not found" },
        { status: 404 }
      );
    }

    await revokeTerminal(terminalId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to revoke terminal" },
      { status: 500 }
    );
  }
}
