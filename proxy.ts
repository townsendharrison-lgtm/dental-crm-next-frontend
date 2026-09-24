import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_KEY } from "@/lib/auth/cookies";
import { decodeToken, isTokenExpired } from "@/lib/auth/jwt";
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
  const isAuthed = !!token && !!decoded && !isTokenExpired(token);
  const role = decoded?.user_metadata?.role;

  // Authenticated users shouldn't see the login page (or root).
  // Must run BEFORE the public-path early return — `/login` is public for guests
  // but would otherwise leave signed-in users stuck on the login screen until a
  // full wipe / manual navigation (especially in standalone PWA).
  if (isAuthed && (pathname === "/login" || pathname === "/")) {
    const next = request.nextUrl.searchParams.get("next");
    let dest = "/dashboard";
    if (next) {
      try {
        const target = new URL(next, request.url);
        if (target.origin === new URL(request.url).origin && isProtectedPath(target.pathname)) {
          dest = target.pathname + target.search + target.hash;
        }
      } catch {
        /* keep dashboard */
      }
    }
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Guest / public routes (letter upload, invite, reset, etc.) skip auth gates.
  // Important: `/letters/upload` is under the `/letters` prefix, so it must be
  // checked before the protected-prefix redirect or writers get bounced to login.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals, API routes, and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
