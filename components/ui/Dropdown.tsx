"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const DropdownClose = createContext<() => void>(() => {});

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
}

export function Dropdown({ trigger, children, align = "right", className, menuClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 min-w-[14rem] overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/20",
            "animate-in fade-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0",
            menuClassName,
          )}
          role="menu"
        >
          <DropdownClose.Provider value={() => setOpen(false)}>{children}</DropdownClose.Provider>
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
  closeOnClick?: boolean;
}

export function DropdownItem({ className, destructive, closeOnClick = true, onClick, ...props }: DropdownItemProps) {
  const close = useContext(DropdownClose);
  return (
    <button
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        if (closeOnClick) close();
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-all",
        "focus-visible:bg-surface-muted focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        "active:scale-[0.98]",
        destructive
          ? "text-danger hover:bg-danger/10 hover:text-danger focus-visible:bg-danger/10"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground", className)} {...props} />;
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
