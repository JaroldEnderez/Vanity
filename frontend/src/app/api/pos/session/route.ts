import { NextResponse } from "next/server";
import { auth } from "@/src/app/lib/auth";
import { clearAuthSessionCookie } from "@/src/app/lib/terminal-session";

/** Clear POS / auth session cookie (e.g. after owner revokes or user resets device). */
export async function POST() {
  const session = await auth();
  const response = NextResponse.json({ ok: true });
  await clearAuthSessionCookie(response);
  // Also useful when a terminal wants to de-register locally
  if (session?.user?.role === "terminal" || session?.user?.role === "branch") {
    return response;
  }
  return response;
}
