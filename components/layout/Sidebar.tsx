"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getNavItems, getAiToolItem, showAiTools } from "@/lib/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { useUIStore } from "@/lib/stores/uiStore";

const LOGO_URL =
  "https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng";

function isActive(pathname: string, href: string) {
  if (href === "/student/resources") {
    return (
      pathname === href ||
      pathname.startsWith(href + "/") ||
      pathname === "/student/find-dentist"
    );
  }
  if (href === "/student/profile") {
    return (
      pathname === href ||
      pathname.startsWith(href + "/") ||
      pathname.startsWith("/student/letters")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const { role, isAdmin } = useRole();
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const closeMobile = useUIStore((s) => s.closeMobileSidebar);
  const { previewCollapsed, setPreviewCollapsed } = useUIStore();

  const navItems = getNavItems(role);
  const aiToolItem = getAiToolItem(role);
  const displayName = user?.name || "System User";
  const displayEmail = user?.email || user?.role?.toLowerCase() || "";

  const content = (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6">
        {/* Brand */}
        <div className="mb-8 mt-4 flex items-center gap-2 lg:mt-0 lg:gap-3">
          <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-xl lg:h-7 lg:w-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="Dental School Guide"
              className="relative z-10 h-full w-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-lg font-black leading-tight tracking-tighter text-transparent lg:text-xl">
            Dental School Guide
          </h1>
          <button
            onClick={closeMobile}
            className="ml-auto shrink-0 rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border border-indigo-600/20 bg-indigo-600/10 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Tools */}
        {showAiTools(role) && (
          <div className="mt-8 border-t border-slate-800/50 pt-8">
            <h3 className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              AI Tools
            </h3>
            <Link
              href={aiToolItem.href}
              onClick={closeMobile}
              className={cn(
                "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-bold transition-all",
                isActive(pathname, aiToolItem.href)
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <aiToolItem.icon
                className={cn(
                  "h-4 w-4",
                  isActive(pathname, aiToolItem.href) ? "text-white" : "text-indigo-400",
                )}
              />
              <span className="flex-1 text-left">{aiToolItem.label}</span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
            </Link>
          </div>
        )}
      </div>

      {/* User block */}
      <div className="space-y-3 border-t border-slate-800 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-semibold text-slate-300">
            {displayName[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{displayEmail}</p>
          </div>
        </div>
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => logout()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
            {isAdmin && previewCollapsed && (
              <button
                onClick={() => setPreviewCollapsed(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-all cursor-pointer"
                title="Expand Preview Switcher"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        {content}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-all duration-300 lg:hidden",
          mobileOpen ? "visible" : "pointer-events-none invisible",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={closeMobile}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-800 bg-slate-900 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}
