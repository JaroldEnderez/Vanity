import { NextResponse } from "next/server";
import { activateTerminalWithToken } from "@/src/app/lib/activation";
import { setTerminalSessionCookie } from "@/src/app/lib/terminal-session";

/**
 * Activate this browser as a POS terminal using an activation token.
 * Public endpoint (no prior auth required).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : typeof body.code === "string"
          ? body.code.trim()
          : "";
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "POS Terminal";

    if (!token) {
      return NextResponse.json(
        { error: "Activation token is required" },
        { status: 400 }
      );
    }

    const result = await activateTerminalWithToken(token, name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json({
      ok: true,
      terminalId: result.terminal.id,
      branchId: result.branchId,
      branchName: result.branchName,
    });

    await setTerminalSessionCookie(
      {
        terminalId: result.terminal.id,
        branchId: result.branchId,
        branchName: result.branchName,
      },
      response
    );

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to activate terminal" },
      { status: 500 }
    );
  }
}
