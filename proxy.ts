import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_KEY } from "@/lib/auth/cookies";
import { decodeToken } from "@/lib/auth/jwt";
import { canAccess, isProtectedPath, isPublicPath } from "@/lib/auth/roles";

/**
 * Edge proxy (Next.js 16's renamed `middleware`).
 * Handles coarse route protection + role-based redirects. Authoritative
 * authorization is always enforced by the backend on each API call.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  const decoded = token ? decodeToken(token) : null;
  const isExpired = decoded?.exp ? Date.now() >= decoded.exp * 1000 : true;
  const isAuthed = !!token && !isExpired;
  const role = decoded?.user_metadata?.role;

  // Authenticated users shouldn't see the login page.
  if (isAuthed && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users hitting a protected route -> login (with return path).
  if (isProtectedPath(pathname) && !isAuthed) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Role-based access control on protected routes.
  if (isAuthed && isProtectedPath(pathname) && !canAccess(role, pathname)) {
    return NextResponse.redirect(new URL("/dashboard?denied=1", request.url));
  }

  // Public auth pages remain accessible; everything else passes through.
  void isPublicPath;
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals, API routes, and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
