"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRole } from "@/lib/hooks/useRole";
import { useUIStore } from "@/lib/stores/uiStore";
import { getInitialRouteForRole } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";

const PREVIEW_ROLES: UserRole[] = [
  "ADMIN",
  "MENTOR_MANAGER",
  "MENTOR",
  "STUDENT",
  "SETTER",
  "LETTER_WRITER",
];

function label(role: UserRole, short = false) {
  if (short && role === "MENTOR_MANAGER") return "MENTOR MGR";
  return role.replace("_", " ");
}

/**
 * Admin-only role preview switcher. Lets an ADMIN view the app as any other
 * role. Renders nothing for non-admins.
 *
 * Desktop: floating pill bottom-left when expanded; Eye lives in sidebar when collapsed.
 * Mobile: same placement model — expanded bar when open; Eye in sidebar bottom when collapsed.
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { isAdmin, actualRole, previewRole, setPreviewRole } = useRole();
  const { previewCollapsed, setPreviewCollapsed } = useUIStore();
  const [transitioning, setTransitioning] = useState(false);
  const [, startTransition] = useTransition();

  const select = useCallback(
    (role: UserRole) => {
      const nextPreviewRole = role === "ADMIN" ? null : role;
      const effectiveRole = nextPreviewRole || actualRole;
      const destination = getInitialRouteForRole(effectiveRole);

      setTransitioning(true);

      setTimeout(() => {
        setPreviewRole(nextPreviewRole);

        startTransition(() => {
          router.push(destination);
        });

        setTimeout(() => {
          setTransitioning(false);
        }, 250);
      }, 120);
    },
    [actualRole, setPreviewRole, router],
  );

  // Only ADMIN can use the preview switcher — hard gate
  if (!isAdmin || actualRole !== "ADMIN") return null;

  // The active button reflects the current effective role.
  const active: UserRole = previewRole ?? actualRole ?? "ADMIN";

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
        <>
          {/* Desktop — floating pill bottom-left */}
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
                {label(role)}
              </button>
            ))}
          </div>

          {/* Mobile — expanded bar (Eye lives in sidebar when collapsed, same as desktop) */}
          <div className="fixed bottom-4 left-4 right-4 z-50 flex animate-in flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur duration-200 slide-in-from-bottom-4 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="px-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                Preview
              </span>
              <button
                type="button"
                onClick={() => setPreviewCollapsed(true)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                title="Collapse Switcher"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Hide
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PREVIEW_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => select(role)}
                  disabled={transitioning}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
                    active === role
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white",
                    transitioning && "pointer-events-none opacity-50",
                  )}
                >
                  {label(role, true)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
