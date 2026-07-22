"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUIStore, type PageHeaderAction } from "@/lib/stores/uiStore";

export type { PageHeaderAction };

type PageHeaderActionConfig = Omit<PageHeaderAction, "onClick"> & {
  onClick: () => void;
};

/**
 * Register an optional CTA button in the global page header.
 *
 * - Pass a config object to show a button (label + onClick, optional icon/variant).
 * - Pass `null` / `undefined` (or omit usage) → no button.
 * - Cleared automatically when the page unmounts or the route changes.
 *
 * @example
 * ```tsx
 * usePageHeaderAction({
 *   label: "Add Event",
 *   icon: <Plus className="w-4 h-4" />,
 *   onClick: () => setModalOpen(true),
 * });
 * ```
 */
export function usePageHeaderAction(config: PageHeaderActionConfig | null | undefined) {
  const setPageHeaderAction = useUIStore((s) => s.setPageHeaderAction);
  const pathname = usePathname();

  const onClickRef = useRef(config?.onClick);
  onClickRef.current = config?.onClick;

  const iconRef = useRef(config?.icon);
  iconRef.current = config?.icon;

  const label = config?.label ?? null;
  const variant = config?.variant;
  const disabled = config?.disabled ?? false;

  useEffect(() => {
    if (!label) {
      setPageHeaderAction(null);
      return;
    }

    setPageHeaderAction({
      label,
      variant,
      disabled,
      icon: iconRef.current,
      onClick: () => onClickRef.current?.(),
    });

    return () => setPageHeaderAction(null);
  }, [label, variant, disabled, pathname, setPageHeaderAction]);
}
