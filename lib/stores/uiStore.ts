import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/types";

/** Optional primary action rendered in the global page header. */
export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  /** Optional leading icon (e.g. `<Plus className="w-4 h-4" />`). */
  icon?: ReactNode;
  /** Visual style. Defaults to primary (indigo). */
  variant?: "primary" | "secondary";
  /** When true, button is non-interactive. */
  disabled?: boolean;
}

interface UIState {
  /** Desktop sidebar collapsed (icon-only) state. Persisted. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Mobile drawer open state. Not persisted. */
  mobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  /** Admin-only role preview. When set, the UI renders as if the user had this role. */
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;

  /**
   * When admin previews STUDENT/MENTOR, which real account to load data for.
   * Cleared when leaving preview or switching role.
   */
  previewSubjectId: string | null;
  setPreviewSubjectId: (id: string | null) => void;

  /** Previews bar collapsed state. */
  previewCollapsed: boolean;
  setPreviewCollapsed: (collapsed: boolean) => void;

  /** Brief overlay while switching preview role (not persisted). */
  previewTransitioning: boolean;
  setPreviewTransitioning: (transitioning: boolean) => void;

  /**
   * Optional header CTA for the current page.
   * Set via `usePageHeaderAction`. Cleared automatically on unmount.
   * Not persisted — null means no button.
   */
  pageHeaderAction: PageHeaderAction | null;
  setPageHeaderAction: (action: PageHeaderAction | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      mobileSidebarOpen: false,
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

      previewRole: null,
      setPreviewRole: (previewRole) =>
        set({
          previewRole,
          // Reset subject when switching / exiting preview
          previewSubjectId: null,
        }),

      previewSubjectId: null,
      setPreviewSubjectId: (previewSubjectId) => set({ previewSubjectId }),

      previewCollapsed: false,
      setPreviewCollapsed: (previewCollapsed) => set({ previewCollapsed }),

      previewTransitioning: false,
      setPreviewTransitioning: (previewTransitioning) => set({ previewTransitioning }),

      pageHeaderAction: null,
      setPageHeaderAction: (pageHeaderAction) => set({ pageHeaderAction }),
    }),
    {
      name: "dc-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        previewCollapsed: s.previewCollapsed,
        // Only persist role preview — subject is re-resolved on load
        previewRole: s.previewRole,
      }),
    },
  ),
);
