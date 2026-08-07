"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRole } from "@/lib/hooks/useRole";
import { useUIStore } from "@/lib/stores/uiStore";
import { getInitialRouteForRole } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";

export const PREVIEW_ROLES: UserRole[] = [
  "ADMIN",
  "MENTOR_MANAGER",
  "MENTOR",
  "STUDENT",
  "SETTER",
  "LETTER_WRITER",
];

export function previewRoleLabel(role: UserRole, short = false) {
  if (short && role === "MENTOR_MANAGER") return "MENTOR MGR";
  return role.replace("_", " ");
}

/**
 * Shared role-preview selection for admin RoleSwitcher + mobile sidebar.
 */
export function usePreviewRoleSelect() {
  const router = useRouter();
  const { isAdmin, actualRole, previewRole, setPreviewRole } = useRole();
  const transitioning = useUIStore((s) => s.previewTransitioning);
  const setPreviewTransitioning = useUIStore((s) => s.setPreviewTransitioning);
  const [, startTransition] = useTransition();

  const canPreview = Boolean(isAdmin && actualRole === "ADMIN");
  const active: UserRole = previewRole ?? actualRole ?? "ADMIN";

  const select = useCallback(
    (role: UserRole) => {
      const nextPreviewRole = role === "ADMIN" ? null : role;
      const effectiveRole = nextPreviewRole || actualRole;
      const destination = getInitialRouteForRole(effectiveRole);

      setPreviewTransitioning(true);

      setTimeout(() => {
        setPreviewRole(nextPreviewRole);

        startTransition(() => {
          router.push(destination);
        });

        setTimeout(() => {
          setPreviewTransitioning(false);
        }, 250);
      }, 120);
    },
    [actualRole, setPreviewRole, setPreviewTransitioning, router, startTransition],
  );

  return { canPreview, active, select, transitioning };
}

/**
 * Admin-only role preview switcher. Lets an ADMIN view the app as any other
 * role. Renders nothing for non-admins.
 *
 * Desktop: floating pill bottom-left when expanded; Eye lives in sidebar when collapsed.
 * Mobile: preview controls live in the sidebar footer (above username / email).
 */
export function RoleSwitcher() {
  const { canPreview, active, select, transitioning } = usePreviewRoleSelect();
  const { previewCollapsed, setPreviewCollapsed } = useUIStore();

  if (!canPreview) return null;

  return (
    <>
      {/* Transition overlay — masks the content swap */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm transition-all duration-200",
          transitioning ? "opacity-100" : "opacity-0",
        )}
      />

      {!previewCollapsed && (
        <div className="fixed bottom-4 left-4 z-50 hidden max-w-[calc(100vw-2rem)] animate-in items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 p-2 pr-3 shadow-2xl backdrop-blur duration-200 slide-in-from-left-5 lg:flex">
          <button
            type="button"
            onClick={() => setPreviewCollapsed(true)}
            className="mr-1 cursor-pointer rounded-full p-1 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
            title="Collapse Switcher"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
            Preview:
          </span>
          {PREVIEW_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => select(role)}
              disabled={transitioning}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-all",
                active === role
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800",
                transitioning && "pointer-events-none opacity-50",
              )}
            >
              {previewRoleLabel(role)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
