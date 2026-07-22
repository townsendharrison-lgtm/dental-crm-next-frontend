"use client";

import React, { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

const FALLBACK_SLOTS = [
  "Monday 10:00 AM",
  "Monday 2:00 PM",
  "Tuesday 10:00 AM",
  "Wednesday 2:00 PM",
  "Thursday 10:00 AM",
  "Friday 1:00 PM",
];

export interface AcceptAssignmentModalProps {
  open: boolean;
  studentName?: string;
  defaultAvailability?: string[];
  welcomeTemplate: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (availableTimes: string[], timezone: string, welcomeMessage: string) => void;
}

export function AcceptAssignmentModal({
  open,
  studentName,
  defaultAvailability = [],
  welcomeTemplate,
  isSubmitting = false,
  onClose,
  onConfirm,
}: AcceptAssignmentModalProps) {
  const slots = defaultAvailability.length > 0 ? defaultAvailability : FALLBACK_SLOTS;
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(welcomeTemplate);

  useEffect(() => {
    if (!open) return;
    setSelectedTimes([]);
    setCustomTime("");
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    setWelcomeMessage(welcomeTemplate);
  }, [open, welcomeTemplate]);

  if (!open) return null;

  const canSubmit =
    selectedTimes.length > 0 && !!timezone && !!welcomeMessage.trim() && !isSubmitting;

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time],
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-start gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Accept assignment</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {studentName
                ? `Set availability for your meet-and-greet with ${studentName}.`
                : "Set your availability for the meet-and-greet session."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="flex justify-between items-end gap-2">
              <label className="text-xs font-medium text-slate-400">Available times (required)</label>
              {defaultAvailability.length > 0 && (
                <span className="text-[10px] text-indigo-400 font-medium">From your profile</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((time) => {
                const selected = selectedTimes.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleTime(time)}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between cursor-pointer",
                      selected
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600",
                    )}
                  >
                    {time}
                    {selected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <p className="text-xs font-medium text-slate-400">Add custom time</p>
              <div className="flex gap-2">
                <Input
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="e.g. Friday at 1pm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    if (customTime.trim()) {
                      setSelectedTimes((prev) =>
                        prev.includes(customTime.trim()) ? prev : [...prev, customTime.trim()],
                      );
                      setCustomTime("");
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {selectedTimes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTimes.map((time) => (
                    <span
                      key={time}
                      className="px-2.5 py-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-lg flex items-center gap-1.5"
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() => setSelectedTimes((prev) => prev.filter((t) => t !== time))}
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Timezone (required)</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select timezone…</option>
              {!TIMEZONES.includes(timezone) && timezone && (
                <option value={timezone}>{timezone}</option>
              )}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Welcome message</label>
            <p className="text-[11px] text-slate-500">
              Placeholders: [Mentee Name], [Mentor Name], [Meeting Times], [Timezone]
            </p>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="min-h-[140px] resize-y"
              placeholder="Write a warm welcome message…"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Decide later
            </Button>
            <Button
              type="button"
              className="flex-[2]"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              leftIcon={!isSubmitting ? <Check className="w-4 h-4" /> : undefined}
              onClick={() => onConfirm(selectedTimes, timezone, welcomeMessage.trim())}
            >
              Confirm & send welcome
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
