"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import type { Mentor, Student } from "@/lib/types";

export interface QuickScheduleMeetingModalProps {
  open: boolean;
  /** Prefill a specific student (e.g. from a roster row). */
  student?: Student | null;
  /** When set, shows a student picker (dashboard create flow). */
  students?: Student[];
  /** Fixed mentor id (mentor self-schedule). */
  mentorId?: string;
  /** When set with no fixed mentorId, shows a mentor picker (manager flow). */
  mentors?: Mentor[];
  /** Prefill date (YYYY-MM-DD), e.g. selected day on weekly schedule. */
  defaultDate?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMeetingPayload) => void | Promise<void>;
}

function isShellStudent(s: Student) {
  return !!s.email?.toLowerCase().endsWith("@school-selection.local");
}

export function QuickScheduleMeetingModal({
  open,
  student: preselectedStudent = null,
  students = [],
  mentorId: fixedMentorId,
  mentors = [],
  defaultDate,
  isSubmitting = false,
  onClose,
  onSubmit,
}: QuickScheduleMeetingModalProps) {
  const studentChoices = useMemo(
    () =>
      (students.length > 0 ? students : preselectedStudent ? [preselectedStudent] : [])
        .filter((s) => !isShellStudent(s))
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [students, preselectedStudent],
  );

  const mentorChoices = useMemo(
    () =>
      mentors
        .filter((m) => (m.role || "MENTOR") === "MENTOR")
        .slice()
        .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || "")),
    [mentors],
  );

  const needsMentorPick = !fixedMentorId && mentorChoices.length > 0;

  const [studentId, setStudentId] = useState("");
  const [mentorId, setMentorId] = useState(fixedMentorId || "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("12:00");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [duration, setDuration] = useState(30);
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  const selectedStudent =
    studentChoices.find((s) => s.id === studentId) ||
    preselectedStudent ||
    null;

  useEffect(() => {
    if (!open) return;
    const initialStudent =
      preselectedStudent ||
      (studentChoices.length === 1 ? studentChoices[0] : null);
    setStudentId(initialStudent?.id || "");
    setMentorId(fixedMentorId || mentorChoices[0]?.id || "");
    const first = initialStudent?.name?.trim().split(/\s+/)[0] || "Student";
    setTitle(initialStudent ? `Mentoring session with ${first}` : "Mentoring session");
    setDate(defaultDate || new Date().toISOString().split("T")[0]);
    setTime("12:00");
    setAmpm("PM");
    setTimezone(getBrowserTimezone());
    setDuration(30);
    setLink("");
    setNotes("");
  }, [open, preselectedStudent, studentChoices, fixedMentorId, mentorChoices, defaultDate]);

  useEffect(() => {
    if (!open || !selectedStudent || preselectedStudent) return;
    const first = selectedStudent.name?.trim().split(/\s+/)[0] || "Student";
    setTitle((prev) =>
      prev.startsWith("Mentoring session")
        ? `Mentoring session with ${first}`
        : prev,
    );
  }, [open, selectedStudent, preselectedStudent]);

  const resolvedMentorId = fixedMentorId || mentorId;
  const canSubmit =
    !!selectedStudent &&
    !!resolvedMentorId &&
    !!title.trim() &&
    !!date &&
    !!time &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !resolvedMentorId || !canSubmit) return;

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
      mentorId: resolvedMentorId,
      studentId: selectedStudent.id,
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
        selectedStudent
          ? `Book a session with ${selectedStudent.name}`
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
        {needsMentorPick && (
          <FormField label="Mentor" required>
            <SelectMenu
              value={mentorId}
              placeholder="Select mentor…"
              onChange={setMentorId}
              options={[
                { value: "", label: "Select mentor…" },
                ...mentorChoices.map((m) => ({
                  value: m.id,
                  label: m.name || m.email || "Mentor",
                })),
              ]}
            />
          </FormField>
        )}

        {preselectedStudent && studentChoices.length <= 1 ? (
          <FormField label="Student">
            <Input value={preselectedStudent.name || ""} disabled />
          </FormField>
        ) : (
          <FormField label="Student" required>
            <SelectMenu
              value={studentId}
              placeholder="Select student…"
              onChange={setStudentId}
              options={[
                { value: "", label: "Select student…" },
                ...studentChoices.map((s) => ({
                  value: s.id,
                  label: s.name || s.email || "Student",
                })),
              ]}
            />
          </FormField>
        )}

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
