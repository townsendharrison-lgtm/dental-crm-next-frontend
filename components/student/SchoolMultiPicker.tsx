"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useDentalSchoolsCatalog } from "@/lib/hooks/useDentalSchoolsCatalog";
import type { ConsideringSchoolEntry } from "@/lib/profile/profileOptions";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface SchoolMultiPickerProps {
  value: ConsideringSchoolEntry[];
  onChange: (schools: ConsideringSchoolEntry[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

export function SchoolMultiPicker({
  value,
  onChange,
  disabled,
  placeholder = "Search dental schools…",
}: SchoolMultiPickerProps) {
  const { schools, loading, error } = useDentalSchoolsCatalog();
  const [query, setQuery] = useState("");
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const selectedIds = useMemo(() => new Set(value.map((s) => s.id)), [value]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return schools
      .filter(
        (s) =>
          !selectedIds.has(s.id) &&
          (s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [schools, query, selectedIds]);

  const menuOpen = query.trim().length > 0 && !disabled && !loading;

  /** Position using the menu's real height so short lists sit flush to the input. */
  const measure = (): MenuPos | null => {
    const el = inputWrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const preferredMax = 224;
    const estimatedContent =
      error || suggestions.length === 0
        ? 44
        : Math.min(preferredMax, suggestions.length * 52 + 12);
    const measured = menuRef.current?.offsetHeight;
    const contentHeight =
      measured && measured > 0 ? Math.min(preferredMax, measured) : estimatedContent;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < contentHeight + 8 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(preferredMax, openUp ? spaceAbove : spaceBelow);
    const usedHeight = Math.min(contentHeight, maxHeight);
    return {
      top: openUp ? Math.max(8, rect.top - usedHeight - 6) : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxHeight,
    };
  };

  useLayoutEffect(() => {
    if (!menuOpen) {
      setPos(null);
      return;
    }
    // First pass with estimate, then refine with rendered height.
    setPos(measure());
    const id = requestAnimationFrame(() => setPos(measure()));
    return () => cancelAnimationFrame(id);
  }, [menuOpen, suggestions.length, query, error]);

  useEffect(() => {
    if (!menuOpen) return;
    const onScrollOrResize = () => setPos(measure());
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputWrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setQuery("");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuery("");
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, suggestions.length, error]);

  const add = (school: { id: string; name: string; location: string }) => {
    onChange([...value, { id: school.id, name: school.name, location: school.location }]);
    setQuery("");
  };

  const remove = (id: string) => {
    onChange(value.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((s) => (
            <span
              key={s.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-100"
            >
              <span className="truncate">{s.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="shrink-0 rounded p-0.5 text-indigo-200/80 hover:bg-indigo-500/20 hover:text-white"
                  aria-label={`Remove ${s.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div ref={inputWrapRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading school catalog…" : placeholder}
          disabled={disabled || loading}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {menuOpen &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            className="fixed z-[300] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl shadow-black/50"
          >
            {error ? (
              <p className="px-3 py-2 text-sm text-rose-300">Could not load school catalog.</p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">No matching schools.</p>
            ) : (
              suggestions.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => add(school)}
                  className={cn(
                    "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    "hover:bg-slate-800",
                  )}
                >
                  <span className="font-medium text-white">{school.name}</span>
                  <span className="text-xs text-slate-500">{school.location}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
