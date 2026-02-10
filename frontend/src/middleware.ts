import { auth } from "@/src/app/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as "owner" | "branch" | undefined;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isOwnerPath = req.nextUrl.pathname.startsWith("/owner");
  const isDashboardPath = req.nextUrl.pathname.startsWith("/dashboard");

  if (isApiAuth) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    if (role === "owner") return NextResponse.redirect(new URL("/owner", req.url));
    return NextResponse.redirect(new URL("/dashboard/orders", req.url));
  }

  if (isOwnerPath && role !== "owner") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isDashboardPath && role === "owner") {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
