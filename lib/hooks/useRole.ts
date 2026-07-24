"use client";

import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useUIStore } from "@/lib/stores/uiStore";
import type { UserRole } from "@/lib/types";

/**
 * Resolves the *effective* role used to render the UI.
 *
 * Admins can preview the app as any other role via the role switcher. When a
 * preview role is active and the real user is an ADMIN, the effective role is
 * the preview role; otherwise it's the user's real role. Backend authorization
 * is unaffected — this only changes what the UI renders.
 *
 * Preview is strictly admin-only: non-admins never get an effective preview
 * role, and any stale preview state is cleared.
 */
export function useRole() {
  const { user } = useAuth();
  const previewRole = useUIStore((s) => s.previewRole);
  const setPreviewRoleStore = useUIStore((s) => s.setPreviewRole);

  const actualRole = user?.role;
  const isAdmin = actualRole === "ADMIN";

  // Drop stale preview if the signed-in user is not an admin (or logged out)
  useEffect(() => {
    if (actualRole && !isAdmin && previewRole) {
      setPreviewRoleStore(null);
    }
  }, [actualRole, isAdmin, previewRole, setPreviewRoleStore]);

  const setPreviewRole = (role: UserRole | null) => {
    if (!isAdmin) return;
    setPreviewRoleStore(role);
  };

  const role: UserRole | undefined =
    isAdmin && previewRole ? previewRole : actualRole;
  const isPreviewing = isAdmin && !!previewRole && previewRole !== "ADMIN";

  return { actualRole, role, isAdmin, previewRole, isPreviewing, setPreviewRole };
}
