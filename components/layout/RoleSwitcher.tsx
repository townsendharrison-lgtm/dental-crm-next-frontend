"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, ChevronLeft } from "lucide-react";
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
 * role. Renders nothing for non-admins. Mirrors the old app's floating pill
 * (desktop) and FAB (mobile).
 *
 * Features a brief transition overlay when switching modes to provide smooth
 * visual feedback instead of a jarring content swap.
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { isAdmin, actualRole, previewRole, setPreviewRole } = useRole();
  const { previewCollapsed, setPreviewCollapsed } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [, startTransition] = useTransition();

  const select = useCallback(
    (role: UserRole) => {
      const nextPreviewRole = role === "ADMIN" ? null : role;
      const effectiveRole = nextPreviewRole || actualRole;
      const destination = getInitialRouteForRole(effectiveRole);

      // Show transition overlay
      setTransitioning(true);
      setMobileOpen(false);

      // Small delay to let the overlay fade in, then commit the state change
      setTimeout(() => {
        setPreviewRole(nextPreviewRole);

        startTransition(() => {
          router.push(destination);
        });

        // Hide overlay after navigation settles
        setTimeout(() => {
          setTransitioning(false);
        }, 250);
      }, 120);
    },
    [actualRole, setPreviewRole, router],
  );

  if (!isAdmin) return null;

  // The active button reflects the current effective role.
  const active: UserRole = previewRole ?? actualRole ?? "ADMIN";

  return (
    <>
      {/* Transition overlay — masks the content swap */}
      <div
        className={cn(
          "fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm transition-all duration-200 pointer-events-none",
          transitioning ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Desktop — floating pill bottom-left */}
      {!previewCollapsed && (
        <div className="fixed bottom-4 left-4 z-50 hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 p-2 pr-3 shadow-2xl backdrop-blur lg:flex animate-in slide-in-from-left-5 duration-200">
          <button
            onClick={() => setPreviewCollapsed(true)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer mr-1"
            title="Collapse Switcher"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 text-[10px] font-black uppercase text-amber-400 tracking-wider">Preview:</span>
          {PREVIEW_ROLES.map((role) => (
            <button
              key={role}
              onClick={() => select(role)}
              disabled={transitioning}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                active === role ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800",
                transitioning && "opacity-50 pointer-events-none",
              )}
            >
              {label(role)}
            </button>
          ))}
        </div>
      )}

      {/* Mobile — floating FAB bottom-left */}
      <div className="fixed bottom-6 left-6 z-[60] lg:hidden">
        <div className="relative">
          {mobileOpen && (
            <div className="absolute bottom-full left-0 mb-4 flex w-48 origin-bottom-left flex-col gap-1 rounded-3xl border border-slate-700 bg-slate-900 p-2 shadow-2xl duration-200 animate-in fade-in zoom-in-95">
              <div className="mb-1 border-b border-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Preview Mode
              </div>
              {PREVIEW_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => select(role)}
                  disabled={transitioning}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-all",
                    active === role
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:bg-slate-800",
                    transitioning && "opacity-50 pointer-events-none",
                  )}
                >
                  {label(role, true)}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle preview mode"
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border shadow-2xl transition-all",
              mobileOpen
                ? "border-indigo-500 bg-indigo-600 text-white shadow-indigo-600/40"
                : "border-slate-700 bg-slate-800 text-amber-400",
            )}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </>
  );
}
