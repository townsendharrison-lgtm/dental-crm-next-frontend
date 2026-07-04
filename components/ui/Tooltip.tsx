"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; transform: string } | null>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current || !mounted) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;
      let transform = "";

      switch (side) {
        case "top":
          top = rect.top + window.scrollY;
          left = rect.left + rect.width / 2 + window.scrollX;
          transform = "translate(-50%, -100%) translateY(-8px)";
          break;
        case "bottom":
          top = rect.bottom + window.scrollY;
          left = rect.left + rect.width / 2 + window.scrollX;
          transform = "translate(-50%, 0) translateY(8px)";
          break;
        case "left":
          top = rect.top + rect.height / 2 + window.scrollY;
          left = rect.left + window.scrollX;
          transform = "translate(-100%, -50%) translateX(-8px)";
          break;
        case "right":
          top = rect.top + rect.height / 2 + window.scrollY;
          left = rect.right + window.scrollX;
          transform = "translate(0, -50%) translateX(8px)";
          break;
      }

      setCoords({ top, left, transform });
    };

    updateCoords();

    // Reposition on any scroll/resize
    window.addEventListener("scroll", updateCoords, { passive: true });
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, side, align, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (disabled) return <>{children}</>;

  return (
    <div
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && mounted && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            className={cn(
              "absolute z-[9999] whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-lg pointer-events-none",
              "animate-in fade-in zoom-in-95 duration-100",
              className,
            )}
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.transform,
            }}
            role="tooltip"
          >
            {content}
            <TooltipArrow side={side} />
          </div>,
          document.body
        )
      }
    </div>
  );
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
