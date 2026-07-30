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
  const role = token?.role as "owner" | "branch" | "terminal" | undefined;
  const hasBranchContext =
    (role === "branch" || role === "terminal") && !!token?.branchId;

  const { pathname } = req.nextUrl;

  // 2. Allow API auth + public POS activation entry points
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/pos/activate") ||
    pathname === "/pos" ||
    pathname.startsWith("/pos/") ||
    pathname === "/activate" ||
    pathname.startsWith("/activate/")
  ) {
    return NextResponse.next();
  }

  // 3. Redirect Logic
  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    if (role === "owner") {
      return NextResponse.redirect(new URL("/owner", req.url));
    }
    if (role === "terminal" && hasBranchContext) {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard/orders", req.url));
  }

  // Owner must not use branch dashboard
  if (pathname.startsWith("/dashboard") && role === "owner") {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  // Branch / terminal may use dashboard; revoked terminal (no branchId) → /pos
  if (pathname.startsWith("/dashboard")) {
    if (role === "terminal" && !hasBranchContext) {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
    if (role !== "branch" && role !== "terminal") {
      return NextResponse.redirect(new URL("/dashboard/orders", req.url));
    }
  }

  if (pathname.startsWith("/owner") && role !== "owner") {
    if (role === "terminal") {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard/orders", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
