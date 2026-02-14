import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Use getToken (Edge-safe) instead of auth() so we never pull db/path into the Edge bundle. */
export async function middleware(req: NextRequest) {
  // 1. Manually specify the secret and the secureCookie flag
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // This ensures it looks for the __Secure- prefix in production
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isLoggedIn = !!token;
  const role = token?.role as "owner" | "branch" | undefined;
  
  const { pathname } = req.nextUrl;

  // 2. Allow API auth requests
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 3. Redirect Logic
  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    const redirectUrl = role === "owner" ? "/owner" : "/dashboard/orders";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
