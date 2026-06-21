"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./Sidebar";
import { MobileHeader, GlobalHeader } from "./Header";
import { RoleSwitcher } from "./RoleSwitcher";
import { PopupOverlay } from "./PopupOverlay";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { canAccess } from "@/lib/auth/roles";
import { getInitialRouteForRole, getNavItems } from "@/lib/navigation";

/**
 * Authenticated application shell. Mirrors the old app's layout:
 *  - fixed w-72 sidebar (desktop) + slide-out drawer (mobile)
 *  - fixed mobile top bar, floating desktop notification bell
 *  - main content offset by lg:ml-72, centered in a max-w-7xl container
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const { isAdmin, role, actualRole, isPreviewing } = useRole();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
      return;
    }
    if (status === "authenticated" && role) {
      // Admins can access every route — the preview role only affects UI rendering.
      // Skip redirect when previewing; the RoleSwitcher handles the navigation.
      if (isAdmin) {
        const path = window.location.pathname;
        if (path === "/" || path === "/dashboard") {
          const initialRoute = getInitialRouteForRole(role);
          if (initialRoute !== "/dashboard" && path !== initialRoute) {
            router.replace(initialRoute);
          }
        }
        return;
      }
      const path = window.location.pathname;
      if (!canAccess(actualRole || role, path)) {
        router.replace(getInitialRouteForRole(actualRole || role));
      } else if (path === "/" || path === "/dashboard") {
        const initialRoute = getInitialRouteForRole(role);
        if (initialRoute !== "/dashboard" && path !== initialRoute) {
          router.replace(initialRoute);
        }
      }
    }
  }, [status, role, actualRole, isAdmin, router]);

  // Sync document title to active sidebar item
  useEffect(() => {
    if (!role) return;

    const navItems = getNavItems(role);
    const activeItem = navItems.find(
      (item) => item.href === pathname || (pathname.startsWith(item.href + "/") && item.href !== "/"),
    );

    let titleLabel = activeItem?.label;

    if (!titleLabel) {
      if (pathname.includes("/letters/vault")) {
        titleLabel = "Letter Vault";
      } else if (pathname.includes("/find-dentist")) {
        titleLabel = "Find a Dentist";
      } else if (pathname.includes("/mentor-assistant")) {
        titleLabel = "Mentor Assistant";
      } else if (pathname === "/dashboard") {
        titleLabel = "Dashboard";
      } else {
        const segments = pathname.split("/").filter(Boolean);
        const rawSegment = ["admin", "student", "mentor", "mentor-manager", "setter", "letter-writer"].includes(segments[0])
          ? segments[1]
          : segments[0];

        titleLabel = rawSegment
          ? rawSegment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          : "";
      }
    }

    if (titleLabel) {
      document.title = `${titleLabel} | Dental School Guide`;
    } else {
      document.title = "Dental School Guide";
    }
  }, [pathname, role]);


  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-slate-950">
        <FullPageSpinner label="Loading your workspace…" />
      </div>
    );
  }

  return (
    <div className="flex h-screen max-w-[100vw] overflow-x-hidden bg-slate-950 text-slate-200">
      <PopupOverlay />
      <MobileHeader />
      <Sidebar />
      <RoleSwitcher />
      <main
        className={cn(
          "relative flex-1 overflow-y-auto p-4 pt-[calc(max(env(safe-area-inset-top),0.75rem)+4rem)] lg:ml-72 lg:px-6 lg:pt-0",
          isAdmin ? "pb-24" : "pb-6",
        )}
      >
        <GlobalHeader />
        <div key={role || "default"} className="mx-auto max-w-7xl duration-500 animate-in fade-in slide-in-from-bottom-4">
          {children}
        </div>
      </main>
    </div>
  );
}
