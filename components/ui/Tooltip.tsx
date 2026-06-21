"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  disabled?: boolean;
}

export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  className,
  disabled,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (disabled) return <>{children}</>;

  const sideClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  const alignOffset = align === "start" ? " -translate-x-0" : align === "end" ? " -translate-x-full" : "";

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-lg",
            "animate-in fade-in zoom-in-95 duration-100",
            sideClass,
            align !== "center" && sideOffsetClass(side, align),
            className,
          )}
          role="tooltip"
        >
          {content}
          <TooltipArrow side={side} />
        </div>
      )}
    </div>
  );
}

function sideOffsetClass(side: TooltipProps["side"], align: TooltipProps["align"]) {
  if (!align || align === "center") return "";
  const map: Record<string, Record<string, string>> = {
    top: { start: "left-0 -translate-x-0", end: "right-0 translate-x-0" },
    bottom: { start: "left-0 -translate-x-0", end: "right-0 translate-x-0" },
    left: { start: "top-0 -translate-y-0", end: "bottom-0 translate-y-0" },
    right: { start: "top-0 -translate-y-0", end: "bottom-0 translate-y-0" },
  };
  return map[side ?? "top"][align ?? "center"] ?? "";
}

function TooltipArrow({ side }: { side?: TooltipProps["side"] }) {
  const arrowClass = {
    top: "top-full left-1/2 -translate-x-1/2 -mt-px border-l-transparent border-r-transparent border-b-transparent border-t-border",
    bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-px border-l-transparent border-r-transparent border-t-transparent border-b-border",
    left: "left-full top-1/2 -translate-y-1/2 -ml-px border-t-transparent border-b-transparent border-r-transparent border-l-border",
    right: "right-full top-1/2 -translate-y-1/2 -mr-px border-t-transparent border-b-transparent border-l-transparent border-r-border",
  }[side ?? "top"];

  return (
    <span
      className={cn("absolute block h-0 w-0 border-4", arrowClass)}
      aria-hidden="true"
    />
  );
}
