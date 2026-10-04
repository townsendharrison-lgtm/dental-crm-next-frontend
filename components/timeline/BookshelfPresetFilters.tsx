"use client";

import React from "react";
import { Search } from "lucide-react";
import type { TimelineBookshelfItem, TimelineCardType } from "@/lib/types";
import { Input } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";

export const PRESET_TYPE_FILTERS = ["All", "Meeting", "Milestone", "Task", "Other"] as const;
export type PresetTypeFilter = (typeof PRESET_TYPE_FILTERS)[number];

export function filterBookshelfPresets(
  items: TimelineBookshelfItem[],
  query: string,
  type: PresetTypeFilter,
) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    const cardType = (item.cardType || "Milestone") as TimelineCardType;
    if (type !== "All" && cardType !== type) return false;
    if (!q) return true;
    const linkText = (item.resourceLinks || [])
      .map((link) => `${link.label || ""} ${link.url || ""}`)
      .join(" ");
    const haystack = `${item.title || ""} ${item.description || ""} ${cardType} ${linkText}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function BookshelfPresetFilters({
  query,
  onQueryChange,
  type,
  onTypeChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  type: PresetTypeFilter;
  onTypeChange: (value: PresetTypeFilter) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search presets…"
          className="pl-9"
          aria-label="Search presets"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
        {PRESET_TYPE_FILTERS.map((option) => {
          const active = type === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onTypeChange(option)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                active
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-200"
                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200",
              )}
              aria-pressed={active}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
