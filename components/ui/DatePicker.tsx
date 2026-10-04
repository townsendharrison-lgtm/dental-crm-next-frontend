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

function formatEditable(ymd: string) {
  if (!ymd) return "";
  const d = parseLocalDate(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}/${day}/${d.getFullYear()}`;
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function monthFromName(token: string) {
  const name = token.toLowerCase().replace(/\./g, "");
  if (name.length < 3) return null;
  const index = MONTH_NAMES.findIndex((month) => month.startsWith(name));
  return index >= 0 ? index + 1 : null;
}

function safeDate(year: number, month: number, day: number) {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function monthStart(year: number, month: number) {
  return new Date(year, month - 1, 1);
}

/** Read a typed date. A full date commits; a year or month only moves the calendar. */
function interpretTypedDate(
  raw: string,
  preferredMonth = 1,
): { ymd: string | null; view: Date | null } {
  const text = raw.trim().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!text) return { ymd: null, view: null };

  const isoFull = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoFull) {
    const date = safeDate(+isoFull[1], +isoFull[2], +isoFull[3]);
    if (!date) return { ymd: null, view: null };
    return { ymd: toYmd(date), view: monthStart(date.getFullYear(), date.getMonth() + 1) };
  }

  const usFull = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (usFull) {
    let month = +usFull[1];
    let day = +usFull[2];
    const year = +usFull[3];
    if (month > 12 && day <= 12) [month, day] = [day, month];
    const date = safeDate(year, month, day);
    if (date) return { ymd: toYmd(date), view: monthStart(date.getFullYear(), date.getMonth() + 1) };
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return { ymd: null, view: monthStart(year, month) };
    }
    return { ymd: null, view: null };
  }

  const yearMonth = text.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonth && +yearMonth[2] >= 1 && +yearMonth[2] <= 12 && +yearMonth[1] >= 1900) {
    return { ymd: null, view: monthStart(+yearMonth[1], +yearMonth[2]) };
  }

  const monthYear = text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (monthYear && +monthYear[1] >= 1 && +monthYear[1] <= 12 && +monthYear[2] >= 1900) {
    return { ymd: null, view: monthStart(+monthYear[2], +monthYear[1]) };
  }

  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly && +yearOnly[1] >= 1900 && +yearOnly[1] <= 2100) {
    return { ymd: null, view: monthStart(+yearOnly[1], 1) };
  }

  const named = text.match(/^([a-zA-Z]+)\s+(?:(\d{1,2})\s+)?(\d{4})$/);
  if (named) {
    const month = monthFromName(named[1]);
    const year = +named[3];
    if (month && year >= 1900 && year <= 2100) {
      if (named[2]) {
        const date = safeDate(year, month, +named[2]);
        if (date) return { ymd: toYmd(date), view: monthStart(year, month) };
      }
      return { ymd: null, view: monthStart(year, month) };
    }
  }

  return { ymd: null, view: null };
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
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => (value ? formatEditable(value) : ""));
  const [yearText, setYearText] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  /** null until measured — avoids mounting at (0,0) and sliding into place */
  const [pos, setPos] = useState<PanelPos | null>(null);

  const selected = value ? parseLocalDate(value) : null;
  const [view, setView] = useState(() => selected || new Date());

  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (focused) return;
    setDraft(value ? formatEditable(value) : "");
  }, [value, focused]);

  useEffect(() => {
    if (document.activeElement === yearInputRef.current) return;
    setYearText(String(view.getFullYear()));
  }, [view]);

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

  const applyTyped = (nextDraft: string) => {
    setDraft(nextDraft);
    if (!nextDraft.trim()) {
      if (value) onChange("");
      return;
    }
    const parsed = interpretTypedDate(nextDraft);
    if (parsed.view) setView(parsed.view);
    if (parsed.ymd && !isDisabledDay(parseLocalDate(parsed.ymd))) onChange(parsed.ymd);
    if (!open) openPanel();
  };

  const applyYearText = (raw: string) => {
    if (!/^\d{4}$/.test(raw)) {
      setYearText(String(view.getFullYear()));
      return;
    }
    const nextYear = Number(raw);
    if (nextYear < 1900 || nextYear > 2100) {
      setYearText(String(view.getFullYear()));
      return;
    }
    setView(new Date(nextYear, view.getMonth(), 1));
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm transition-colors",
          "focus-within:ring-2 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          open && "ring-2 ring-ring",
          className,
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => (open ? closePanel() : openPanel())}
          className="shrink-0 text-indigo-400 disabled:cursor-not-allowed"
          aria-label={open ? "Close calendar" : "Open calendar"}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={focused ? draft : value ? formatDisplay(value) : ""}
          placeholder={focused ? "MM/DD/YYYY" : placeholder}
          aria-label={placeholder}
          onFocus={() => {
            setFocused(true);
            setDraft(value ? formatEditable(value) : "");
            openPanel();
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => applyTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const parsed = interpretTypedDate(draft);
              if (parsed.ymd && !isDisabledDay(parseLocalDate(parsed.ymd))) {
                onChange(parsed.ymd);
                closePanel();
              }
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>

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
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white">{monthName}</p>
                <input
                  ref={yearInputRef}
                  type="text"
                  inputMode="numeric"
                  aria-label="Year"
                  value={yearText}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setYearText(digits);
                    if (digits.length === 4) applyYearText(digits);
                  }}
                  onBlur={() => applyYearText(yearText)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyYearText(yearText);
                    }
                  }}
                  className="w-14 rounded-md border border-slate-700 bg-slate-950 px-1 py-0.5 text-center text-sm font-bold text-white outline-none focus:border-indigo-500"
                />
              </div>
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
