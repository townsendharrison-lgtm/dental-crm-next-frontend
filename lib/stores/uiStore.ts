import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/lib/types";

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

  /** Previews bar collapsed state. */
  previewCollapsed: boolean;
  setPreviewCollapsed: (collapsed: boolean) => void;
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
      setPreviewRole: (previewRole) => set({ previewRole }),

      previewCollapsed: false,
      setPreviewCollapsed: (previewCollapsed) => set({ previewCollapsed }),
    }),
    {
      name: "dc-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, previewCollapsed: s.previewCollapsed, previewRole: s.previewRole }),
    },
  ),
);
