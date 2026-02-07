import { auth } from "@/src/app/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  // Allow auth API routes
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated and trying to access protected routes
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect to dashboard if already logged in and trying to access login
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard/orders", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
