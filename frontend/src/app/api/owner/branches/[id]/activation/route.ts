import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import { assertBranchOwnedBy } from "@/src/app/lib/owner";
import {
  buildActivationUrl,
  createActivationCode,
  getBranchActivationStatus,
  revokeUnusedActivationCodes,
} from "@/src/app/lib/activation";

function requestOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  return url.origin;
}

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
      { error: "Failed to load activation status" },
      { status: 500 }
    );
  }
}

/** Generate a new activation code (revokes unused prior codes). */
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

    const { code, rawToken, expiresAt } = await createActivationCode(id);
    const activationUrl = buildActivationUrl(requestOrigin(req), rawToken);

    return NextResponse.json({
      id: code.id,
      token: rawToken,
      expiresAt,
      activationUrl,
      // Shown once — never stored or returned again
    });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate activation code" },
      { status: 500 }
    );
  }
}

/** Revoke unused activation codes for this branch. */
export async function DELETE(
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

    await revokeUnusedActivationCodes(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to revoke activation codes" },
      { status: 500 }
    );
  }
}
