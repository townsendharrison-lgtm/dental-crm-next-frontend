import type { UserRole } from "@/lib/types";

/** Human-readable labels for each role. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  MENTOR_MANAGER: "Mentor Manager",
  MENTOR: "Mentor",
  STUDENT: "Student",
  LETTER_WRITER: "Letter Writer",
  SETTER: "Setter",
};

const ALL_ROLES: UserRole[] = ["ADMIN", "MENTOR_MANAGER", "MENTOR", "STUDENT", "LETTER_WRITER", "SETTER"];

/**
 * Route access control. Maps a path prefix to the roles allowed to access it.
 * Mirrors the role-based navigation in `lib/navigation.ts`. Longest-prefix wins.
 * A path with no matching entry is treated as authenticated-only.
 */
export const ROUTE_ACCESS: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/dashboard", roles: ALL_ROLES },
  { prefix: "/setters", roles: ALL_ROLES },
  { prefix: "/letters", roles: ALL_ROLES },
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/student", roles: ["ADMIN", "STUDENT"] },
  { prefix: "/mentor-manager", roles: ["ADMIN", "MENTOR_MANAGER"] },
  { prefix: "/mentor", roles: ["ADMIN", "MENTOR"] },
  { prefix: "/setter", roles: ["ADMIN", "SETTER"] },
  { prefix: "/letter-writer", roles: ["ADMIN", "LETTER_WRITER"] },
];

/** All authenticated route prefixes (derived from the access map). */
export const PROTECTED_PREFIXES = ROUTE_ACCESS.map((r) => r.prefix);

/** Routes accessible without authentication. */
export const PUBLIC_PREFIXES = [
  "/login",
  "/reset-password",
  "/invitation",
  "/forgot-password",
  "/letters/upload",
  "/guest-letter-request",
  "/guest-letter-track",
  "/guest-find-dentist"
];

/**
 * Returns the roles allowed to access a given pathname, or null if the
 * route is not access-restricted (any authenticated user may access).
 */
export function allowedRolesForPath(pathname: string): UserRole[] | null {
  let match: { prefix: string; roles: UserRole[] } | null = null;
  for (const entry of ROUTE_ACCESS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!match || entry.prefix.length > match.prefix.length) match = entry;
    }
  }
  return match ? match.roles : null;
}

/** Whether the given role can access the given pathname. */
export function canAccess(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false;
  const roles = allowedRolesForPath(pathname);
  if (!roles) return true; // authenticated-only route
  return roles.includes(role);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
