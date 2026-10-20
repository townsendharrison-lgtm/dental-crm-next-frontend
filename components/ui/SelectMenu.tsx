"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectMenuOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Optional leading icon inside the trigger */
  leftIcon?: React.ReactNode;
}

type MenuPos = { top: number; left: number; width: number };

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  leftIcon,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** null until measured — avoids mounting at (0,0) and sliding into place */
  const [pos, setPos] = useState<MenuPos | null>(null);

  const selected = options.find((o) => o.value === value);

  const measure = (menuEl?: HTMLElement | null): MenuPos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const natural = menuEl?.scrollHeight ?? options.length * 52 + 16;
    const menuHeight = Math.min(natural, 320);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    const top = openUp
      ? Math.max(8, rect.top - menuHeight - 6)
      : Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - menuHeight - 8));
    return { top, left, width };
  };

  const openMenu = () => {
    if (disabled) return;
    setPos(measure());
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setPos(null);
  };

  useLayoutEffect(() => {
    if (!open) return;
    setPos(measure(menuRef.current));
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setPos(measure(menuRef.current));
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, options.length]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 py-2 text-left text-sm text-foreground shadow-sm transition-colors",
          "hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-ring",
          className,
          "h-auto",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {leftIcon}
          <span className={cn("min-w-0 flex-1 whitespace-normal break-words leading-snug", !selected && "text-muted-foreground")}>
            {selected?.label || placeholder}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[200] max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/30 opacity-0 animate-[menu-fade-in_100ms_ease-out_forwards]"
          >
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value === "" ? "__empty" : opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    closeMenu();
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{opt.label}</span>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-indigo-400" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
