"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-5xl",
  full: "max-w-6xl",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: keyof typeof sizeMap;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  /** Stretch modal to nearly full viewport height */
  fullHeight?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  fullHeight = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, closeOnEscape]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50",
          "opacity-0 animate-[menu-fade-in_150ms_ease-out_forwards]",
          sizeMap[size],
          fullHeight && "flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex-col",
        )}
      >
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
            <div>
              {title ? (
                <h2
                  className={cn(
                    "font-semibold text-white",
                    size === "2xl" || size === "full" ? "text-xl sm:text-2xl" : "text-lg",
                  )}
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  className={cn(
                    "mt-1 text-muted-foreground",
                    size === "2xl" || size === "full" ? "text-sm sm:text-base" : "text-sm",
                  )}
                >
                  {description}
                </p>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div
          className={cn(
            size === "2xl" || size === "full" ? "p-5 sm:p-6" : "p-5",
            fullHeight
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : "max-h-[70vh] overflow-y-auto",
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-end gap-2 border-t border-slate-800 bg-slate-800/30",
              size === "2xl" || size === "full" ? "p-4 sm:p-5" : "p-4",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
