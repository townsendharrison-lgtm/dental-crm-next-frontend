"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MonthPickerProps {
  /** YYYY-MM */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Min YYYY-MM */
  min?: string;
  /** Max YYYY-MM */
  max?: string;
  allowClear?: boolean;
}

type PanelPos = { top: number; left: number; width: number };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDisplay(yyyyMm: string) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return "";
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function toYm(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function parseYm(value: string): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Select month",
  disabled,
  className,
  min,
  max,
  allowClear = true,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);

  const selected = parseYm(value);
  const [viewYear, setViewYear] = useState(() => selected?.year || new Date().getFullYear());

  useEffect(() => {
    if (selected) setViewYear(selected.year);
  }, [value]);

  const measure = (): PanelPos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const panelH = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelH && rect.top > spaceBelow;
    const width = Math.max(rect.width, 280);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    return {
      top: openUp ? rect.top - panelH - 6 : rect.bottom + 6,
      left: Math.max(8, left),
      width,
    };
  };

  const openPanel = () => {
    if (disabled) return;
    setPos(measure());
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    setPos(null);
  };

  useLayoutEffect(() => {
    if (!open) return;
    setPos(measure());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setPos(measure());
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      closePanel();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
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
  }, [open]);

  const isDisabledMonth = (ym: string) => {
    if (min && ym < min) return true;
    if (max && ym > max) return true;
    return false;
  };

  const currentYm = useMemo(() => {
    const d = new Date();
    return toYm(d.getFullYear(), d.getMonth());
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm transition-colors",
          "hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-ring",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0 text-sky-400" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </span>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[200] rounded-xl border border-border bg-surface p-3 shadow-xl shadow-black/30 opacity-0 animate-[menu-fade-in_100ms_ease-out_forwards]"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                onClick={() => setViewYear((y) => y - 1)}
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-bold text-white">{viewYear}</p>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                onClick={() => setViewYear((y) => y + 1)}
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((label, idx) => {
                const ym = toYm(viewYear, idx);
                const isSelected = value === ym;
                const isCurrent = ym === currentYm;
                const disabledMonth = isDisabledMonth(ym);
                return (
                  <button
                    key={ym}
                    type="button"
                    disabled={disabledMonth}
                    onClick={() => {
                      onChange(ym);
                      closePanel();
                    }}
                    className={cn(
                      "h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      disabledMonth && "cursor-not-allowed opacity-30",
                      isSelected && "bg-indigo-600 text-white hover:bg-indigo-500",
                      !isSelected && isCurrent && "border border-sky-500/40 text-sky-300",
                      !isSelected && !isCurrent && "text-slate-300 hover:bg-surface-muted",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              {allowClear ? (
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                  onClick={() => {
                    onChange("");
                    closePanel();
                  }}
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-bold text-sky-400 hover:bg-sky-600/10 cursor-pointer"
                onClick={() => {
                  if (!isDisabledMonth(currentYm)) {
                    onChange(currentYm);
                    closePanel();
                  }
                }}
              >
                This month
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
