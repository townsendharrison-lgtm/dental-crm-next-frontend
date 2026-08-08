"use client";

import React, { useEffect, useState } from "react";
import { Check, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";
import {
  FALLBACK_MEETING_TIME_PRESETS,
  parseMeetingPresetToNextOccurrence,
  resolveMeetingTimePresets,
  type ParsedMeetingPreset,
} from "@/lib/utils/meetingTimePresets";

export interface MeetingTimePresetsPickerProps {
  /** Saved mentor presets (default_availability). */
  savedPresets?: string[];
  /**
   * multi — toggle select for accept/welcome flow
   * apply — click applies next occurrence (schedule / suggest)
   */
  mode: "multi" | "apply";
  selected?: string[];
  onToggle?: (label: string) => void;
  onApply?: (label: string, next: ParsedMeetingPreset) => void;
  /** Persist edited preset list to mentor profile. */
  onSavePresets?: (presets: string[]) => void | Promise<void>;
  isSavingPresets?: boolean;
  className?: string;
}

export function MeetingTimePresetsPicker({
  savedPresets = [],
  mode,
  selected = [],
  onToggle,
  onApply,
  onSavePresets,
  isSavingPresets = false,
  className,
}: MeetingTimePresetsPickerProps) {
  const [presets, setPresets] = useState<string[]>(() =>
    resolveMeetingTimePresets(savedPresets),
  );
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPresets(resolveMeetingTimePresets(savedPresets));
    setDirty(false);
    setDraft("");
  }, [savedPresets]);

  const usingFallback =
    (savedPresets || []).filter((s) => s.trim()).length === 0 && !dirty;

  const addPreset = () => {
    const label = draft.trim();
    if (!label) return;
    setPresets((prev) => (prev.includes(label) ? prev : [...prev, label]));
    setDraft("");
    setDirty(true);
    if (mode === "multi") onToggle?.(label);
  };

  const removePreset = (label: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p !== label);
      return next.length > 0 ? next : [...FALLBACK_MEETING_TIME_PRESETS];
    });
    setDirty(true);
    if (mode === "multi" && selected.includes(label)) onToggle?.(label);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-400">
            {mode === "multi" ? "Available times (required)" : "Your time presets"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {usingFallback
              ? "Showing defaults — save your own presets for next time."
              : "From your mentor profile · edit anytime below"}
          </p>
        </div>
        {onSavePresets && dirty && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isLoading={isSavingPresets}
            leftIcon={!isSavingPresets ? <Save className="h-3.5 w-3.5" /> : undefined}
            onClick={() => {
              void (async () => {
                await onSavePresets(presets);
                setDirty(false);
              })();
            }}
          >
            Save presets
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {presets.map((time) => {
          const selectedChip = mode === "multi" && selected.includes(time);
          return (
            <div key={time} className="flex min-w-0 items-stretch gap-1">
              <button
                type="button"
                onClick={() => {
                  if (mode === "multi") {
                    onToggle?.(time);
                    return;
                  }
                  const next = parseMeetingPresetToNextOccurrence(time);
                  if (next) onApply?.(time, next);
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-between rounded-xl border p-3 text-left text-sm font-medium transition-all cursor-pointer",
                  selectedChip
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600",
                )}
              >
                <span className="truncate">{time}</span>
                {selectedChip && <Check className="ml-2 h-4 w-4 shrink-0" />}
              </button>
              {onSavePresets && (
                <button
                  type="button"
                  title="Remove preset"
                  onClick={() => removePreset(time)}
                  className="shrink-0 rounded-xl border border-slate-800 px-2 text-slate-500 transition-colors hover:border-rose-500/40 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <p className="text-xs font-medium text-slate-400">
          {onSavePresets ? "Add preset option" : "Add custom time"}
        </p>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='e.g. "Monday 10:00 AM"'
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPreset();
              }
            }}
          />
          <Button type="button" variant="secondary" size="icon" onClick={addPreset}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {mode === "multi" && selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {selected.map((time) => (
              <span
                key={time}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-300"
              >
                {time}
                <button
                  type="button"
                  onClick={() => onToggle?.(time)}
                  className="hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
