import { encode, decode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type TerminalSessionPayload = {
  terminalId: string;
  branchId: string;
  branchName: string;
};

function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

/** Encode a NextAuth-compatible JWT for a POS terminal. */
export async function encodeTerminalSession(payload: TerminalSessionPayload) {
  return encode({
    token: {
      sub: payload.terminalId,
      email: `terminal:${payload.terminalId}`,
      role: "terminal",
      branchId: payload.branchId,
      branchName: payload.branchName,
      terminalId: payload.terminalId,
    },
    secret: authSecret(),
    maxAge: SESSION_MAX_AGE,
    salt: sessionCookieName(),
  });
}

export async function setTerminalSessionCookie(
  payload: TerminalSessionPayload,
  response?: NextResponse
) {
  const token = await encodeTerminalSession(payload);
  const name = sessionCookieName();
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: SESSION_MAX_AGE,
  };

  if (response) {
    response.cookies.set(name, token, cookieOptions);
    return response;
  }

  const jar = await cookies();
  jar.set(name, token, cookieOptions);
}

export async function clearAuthSessionCookie(response?: NextResponse) {
  const name = sessionCookieName();
  const secure = process.env.NODE_ENV === "production";
  if (response) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: 0,
    });
    return response;
  }
  const jar = await cookies();
  jar.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  });
}

export async function readTerminalIdFromSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(sessionCookieName())?.value;
  if (!raw) return null;
  try {
    const token = await decode({
      token: raw,
      secret: authSecret(),
      salt: sessionCookieName(),
    });
    if (token?.role === "terminal" && token.terminalId) {
      return token.terminalId as string;
    }
    if (token?.role === "terminal" && token.sub) {
      return token.sub as string;
    }
  } catch {
    return null;
  }
  return null;
}
