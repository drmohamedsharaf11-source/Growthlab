import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const role = req.auth?.user?.role;

  // /dashboard/admin/* — ADMIN only
  if (pathname.startsWith("/dashboard/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  // /dashboard/* — any authenticated user
  } else if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
});

export const config = {
  // Run only on dashboard routes; /login, /onboard, /api/auth, _next, and
  // static assets are excluded by default since they don't match this pattern.
  matcher: ["/dashboard/:path*"],
};
