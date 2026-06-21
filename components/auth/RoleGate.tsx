"use client";

import { useRole } from "@/lib/hooks/useRole";
import type { UserRole } from "@/lib/types";

export interface RoleGateProps {
  /** Roles allowed to see the children. */
  allow: UserRole[];
  children: React.ReactNode;
  /** Optional fallback rendered when the current role isn't allowed. */
  fallback?: React.ReactNode;
}

/**
 * Conditionally render UI based on the current user's effective role
 * (honours the admin role-preview switcher).
 */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { role } = useRole();
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
