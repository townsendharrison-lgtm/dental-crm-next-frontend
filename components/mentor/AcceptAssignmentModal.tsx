"use client";

import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { getBrowserTimezone } from "@/lib/utils/dateUtils";
import { timezoneSelectOptions } from "@/lib/utils/timezoneOptions";
import { MeetingTimePresetsPicker } from "@/components/mentor/MeetingTimePresetsPicker";

export interface AcceptAssignmentModalProps {
  open: boolean;
  studentName?: string;
  defaultAvailability?: string[];
  welcomeTemplate: string;
  isSubmitting?: boolean;
  isSavingPresets?: boolean;
  onClose: () => void;
  onConfirm: (availableTimes: string[], timezone: string, welcomeMessage: string) => void;
  onSavePresets?: (presets: string[]) => void | Promise<void>;
}

export function AcceptAssignmentModal({
  open,
  studentName,
  defaultAvailability = [],
  welcomeTemplate,
  isSubmitting = false,
  isSavingPresets = false,
  onClose,
  onConfirm,
  onSavePresets,
}: AcceptAssignmentModalProps) {
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [timezone, setTimezone] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(welcomeTemplate);

  useEffect(() => {
    if (!open) return;
    setSelectedTimes([]);
    setTimezone(getBrowserTimezone());
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
          <MeetingTimePresetsPicker
            mode="multi"
            savedPresets={defaultAvailability}
            selected={selectedTimes}
            onToggle={toggleTime}
            onSavePresets={onSavePresets}
            isSavingPresets={isSavingPresets}
          />

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Timezone (required)</label>
            <SelectMenu
              value={timezone}
              onChange={setTimezone}
              placeholder="Select timezone…"
              options={timezoneSelectOptions(timezone).map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
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
