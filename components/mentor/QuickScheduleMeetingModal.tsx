"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Globe } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { TimezoneHint } from "@/components/ui/TimezoneHint";
import { getBrowserTimezone, zonedDateTimeToUtcIso } from "@/lib/utils/dateUtils";
import type { CreateMeetingPayload } from "@/lib/api/meetings";
import type { Student } from "@/lib/types";

export interface QuickScheduleMeetingModalProps {
  open: boolean;
  student: Student | null;
  mentorId: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMeetingPayload) => void | Promise<void>;
}

export function QuickScheduleMeetingModal({
  open,
  student,
  mentorId,
  isSubmitting = false,
  onClose,
  onSubmit,
}: QuickScheduleMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("12:00");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [duration, setDuration] = useState(30);
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !student) return;
    const first = student.name?.trim().split(/\s+/)[0] || "Student";
    setTitle(`Mentoring session with ${first}`);
    setDate(new Date().toISOString().split("T")[0]);
    setTime("12:00");
    setAmpm("PM");
    setTimezone(getBrowserTimezone());
    setDuration(30);
    setLink("");
    setNotes("");
  }, [open, student]);

  const canSubmit = !!student && !!title.trim() && !!date && !!time && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !canSubmit) return;

    let [hours, minutes] = time.split(":").map(Number);
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    const time24 = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const dateIso = zonedDateTimeToUtcIso(date, time24, timezone || "UTC");

    await onSubmit({
      title: title.trim(),
      date: dateIso,
      timezone,
      duration,
      type: "STUDENT_MEETING",
      audience: "STUDENT",
      attendees: [],
      mentorId,
      studentId: student.id,
      notes: notes.trim() || undefined,
      link: link.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule meeting"
      description={
        student
          ? `Book a session with ${student.name}`
          : "Book a mentoring session"
      }
      size="lg"
      footer={
        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="flex-[2]"
            leftIcon={!isSubmitting ? <Calendar className="h-4 w-4" /> : undefined}
            isLoading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => {
              const form = document.getElementById(
                "quick-schedule-meeting-form",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            Create meeting
          </Button>
        </div>
      }
    >
      <form id="quick-schedule-meeting-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Student">
          <Input value={student?.name || ""} disabled />
        </FormField>

        <FormField label="Event title" required>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mentoring session"
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Date" required>
            <DatePicker value={date} onChange={setDate} />
          </FormField>
          <FormField
            label={
              <>
                Time
                <TimezoneHint date={date} time={time} ampm={ampm} timeZone={timezone} />
              </>
            }
            required
          >
            <TimePicker
              time={time}
              ampm={ampm}
              onChange={({ time: t, ampm: a }) => {
                setTime(t);
                setAmpm(a);
              }}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Timezone for this time"
            hint="Wall-clock time in this zone; others see it in their local time."
          >
            <SelectMenu
              value={timezone}
              leftIcon={<Globe className="h-4 w-4 text-slate-500" />}
              onChange={setTimezone}
              options={[
                { value: "America/New_York", label: "Eastern Time (ET)" },
                { value: "America/Chicago", label: "Central Time (CT)" },
                { value: "America/Denver", label: "Mountain Time (MT)" },
                { value: "America/Phoenix", label: "Mountain Time - AZ" },
                { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
                { value: "UTC", label: "UTC" },
                ...(
                  [
                    "America/New_York",
                    "America/Chicago",
                    "America/Denver",
                    "America/Phoenix",
                    "America/Los_Angeles",
                    "UTC",
                  ].includes(timezone)
                    ? []
                    : [{ value: timezone, label: timezone }]
                ),
              ]}
            />
          </FormField>
          <FormField label="Duration (min)" required>
            <SelectMenu
              value={String(duration)}
              onChange={(v) => setDuration(parseInt(v, 10) || 30)}
              options={[15, 30, 45, 60, 90, 120].map((mins) => ({
                value: String(mins),
                label: `${mins} min`,
              }))}
            />
          </FormField>
        </div>

        <FormField label="Meeting link (optional)">
          <Input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://zoom.us/j/…"
          />
        </FormField>

        <FormField label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agenda or notes…"
            className="min-h-[90px]"
          />
        </FormField>
      </form>
    </Modal>
  );
}
