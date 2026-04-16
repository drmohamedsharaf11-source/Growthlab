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
  // /onboard/connect — requires auth (unauthenticated users get /login)
  // /onboard/[token] is NOT in the matcher so it passes through unauthenticated
  } else if (pathname === "/onboard/connect") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboard/connect"],
};
