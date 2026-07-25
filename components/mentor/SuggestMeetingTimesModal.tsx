"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import type { Student } from "@/lib/types";

export interface SuggestMeetingTimesModalProps {
  open: boolean;
  student: Student | null;
  mentorName: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSend: (message: string) => void | Promise<void>;
}

type Slot = { id: string; date: string; time: string; ampm: "AM" | "PM" };

function formatSlotLabel(slot: Slot): string {
  try {
    const [y, m, d] = slot.date.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const [hh, mm] = slot.time.split(":");
    const displayH = Number(hh) || 12;
    return `${label} — ${displayH}:${mm} ${slot.ampm}`;
  } catch {
    return `${slot.date} ${slot.time} ${slot.ampm}`;
  }
}

function buildPresetMessage(
  studentName: string,
  mentorName: string,
  slots: Slot[],
): string {
  const first = studentName.trim().split(/\s+/)[0] || "there";
  const mentorFirst = mentorName.trim().split(/\s+/)[0] || "your mentor";
  const lines =
    slots.length > 0
      ? slots.map((s) => `• ${formatSlotLabel(s)}`).join("\n")
      : "• (add a few options below)";

  return `Hi ${first},

I'd love to schedule our next meeting. Here are some times that work for me:

${lines}

Reply with what works best for you, or suggest another time!

Thanks,
${mentorFirst}`;
}

export function SuggestMeetingTimesModal({
  open,
  student,
  mentorName,
  isSubmitting = false,
  onClose,
  onSend,
}: SuggestMeetingTimesModalProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [draftDate, setDraftDate] = useState(new Date().toISOString().split("T")[0]);
  const [draftTime, setDraftTime] = useState("12:00");
  const [draftAmpm, setDraftAmpm] = useState<"AM" | "PM">("PM");
  const [message, setMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);

  const preset = useMemo(
    () => buildPresetMessage(student?.name || "there", mentorName, slots),
    [student?.name, mentorName, slots],
  );

  useEffect(() => {
    if (!open) return;
    setSlots([]);
    setDraftDate(new Date().toISOString().split("T")[0]);
    setDraftTime("12:00");
    setDraftAmpm("PM");
    setMessageTouched(false);
    setMessage(buildPresetMessage(student?.name || "there", mentorName, []));
  }, [open, student?.id, student?.name, mentorName]);

  useEffect(() => {
    if (!open || messageTouched) return;
    setMessage(preset);
  }, [open, preset, messageTouched]);

  const addSlot = () => {
    if (!draftDate || !draftTime) return;
    setSlots((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: draftDate,
        time: draftTime,
        ampm: draftAmpm,
      },
    ]);
  };

  const canSend = !!student && !!message.trim() && slots.length > 0 && !isSubmitting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggest meeting times"
      description={
        student
          ? `Send ${student.name.split(" ")[0]} a preset scheduling message`
          : "Send a scheduling message"
      }
      size="lg"
      footer={
        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="flex-[2]"
            leftIcon={!isSubmitting ? <MessageSquare className="h-4 w-4" /> : undefined}
            isLoading={isSubmitting}
            disabled={!canSend}
            onClick={() => void onSend(message.trim())}
          >
            Send message
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormField label="Add available days & times" hint="Add at least one option for the student.">
          <div className="space-y-3">
            <DatePicker value={draftDate} onChange={setDraftDate} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="min-w-0 flex-1">
                <TimePicker
                  time={draftTime}
                  ampm={draftAmpm}
                  onChange={({ time, ampm }) => {
                    setDraftTime(time);
                    setDraftAmpm(ampm);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={addSlot}
                className="w-full shrink-0 sm:w-auto sm:px-5"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          {slots.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((slot) => (
                <span
                  key={slot.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-200"
                >
                  {formatSlotLabel(slot)}
                  <button
                    type="button"
                    onClick={() => setSlots((prev) => prev.filter((s) => s.id !== slot.id))}
                    className="hover:text-white"
                    aria-label="Remove time"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </FormField>

        <FormField label="Message">
          <Textarea
            value={message}
            onChange={(e) => {
              setMessageTouched(true);
              setMessage(e.target.value);
            }}
            className="min-h-[220px] resize-y"
          />
          <p className="mt-1.5 text-[11px] text-slate-500">
            Starts from a scheduling preset. Edit freely before sending.
          </p>
        </FormField>

        {!slots.length && (
          <p className="text-xs text-amber-400/90">Add at least one day/time before sending.</p>
        )}
      </div>
    </Modal>
  );
}
