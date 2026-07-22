"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { parseLocalDate } from "@/lib/utils/dateUtils";

export interface DatePickerProps {
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Min selectable date YYYY-MM-DD */
  min?: string;
  /** Max selectable date YYYY-MM-DD */
  max?: string;
}

type PanelPos = { top: number; left: number; width: number };

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(ymd: string) {
  if (!ymd) return "";
  return parseLocalDate(ymd).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** null until measured — avoids mounting at (0,0) and sliding into place */
  const [pos, setPos] = useState<PanelPos | null>(null);

  const selected = value ? parseLocalDate(value) : null;
  const [view, setView] = useState(() => selected || new Date());

  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  const monthDays = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const total = new Date(year, month + 1, 0).getDate();
    const start = new Date(year, month, 1).getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < start; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
    return days;
  }, [view]);

  const measure = (): PanelPos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const panelH = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelH && rect.top > spaceBelow;
    const width = Math.max(rect.width, 288);
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

  const isDisabledDay = (d: Date) => {
    const ymd = toYmd(d);
    if (min && ymd < min) return true;
    if (max && ymd > max) return true;
    return false;
  };

  const monthName = view.toLocaleString("default", { month: "long" });
  const year = view.getFullYear();
  const todayYmd = toYmd(new Date());

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
          <CalendarIcon className="h-4 w-4 shrink-0 text-indigo-400" />
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
            <div className="mb-3 flex items-center justify-between gap-1">
              <div className="flex gap-0.5">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                  onClick={() => setView(new Date(year - 1, view.getMonth(), 1))}
                  aria-label="Previous year"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                  onClick={() => setView(new Date(year, view.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm font-bold text-white">
                {monthName} {year}
              </p>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                  onClick={() => setView(new Date(year, view.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted hover:text-white cursor-pointer"
                  onClick={() => setView(new Date(year + 1, view.getMonth(), 1))}
                  aria-label="Next year"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {monthDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="h-9" />;
                const ymd = toYmd(day);
                const isSelected = value === ymd;
                const isToday = ymd === todayYmd;
                const disabledDay = isDisabledDay(day);
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => {
                      onChange(ymd);
                      closePanel();
                    }}
                    className={cn(
                      "h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      disabledDay && "cursor-not-allowed opacity-30",
                      isSelected && "bg-indigo-600 text-white hover:bg-indigo-500",
                      !isSelected && isToday && "border border-indigo-500/50 text-indigo-300",
                      !isSelected && !isToday && "text-slate-300 hover:bg-surface-muted",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
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
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-400 hover:bg-indigo-600/10 cursor-pointer"
                onClick={() => {
                  const today = toYmd(new Date());
                  if ((!min || today >= min) && (!max || today <= max)) {
                    onChange(today);
                    closePanel();
                  }
                }}
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
