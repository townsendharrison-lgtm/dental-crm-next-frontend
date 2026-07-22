"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Clock,
  Info,
  CheckSquare,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Student, Meeting } from "@/lib/types";
import {
  Button,
  FormField,
  Input,
  Textarea,
  DatePicker,
  TimePicker,
  SelectMenu,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  formatInTimezone,
  resolveStudentTimezone,
  zonedDateTimeToUtcIso,
} from "@/lib/utils/dateUtils";

interface CompleteMeetingFormProps {
  student: Student;
  meeting?: Meeting;
  onClose: () => void;
  onSubmit: (data: CompleteMeetingData) => void | Promise<void>;
  /** When true, skip the built-in header (parent Modal provides chrome). */
  embedded?: boolean;
}

export interface CompleteMeetingData {
  notes: string;
  meetingType: string;
  meetingDate: string;
  studentActionItems: Array<{
    task: string;
    dueDate: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    description?: string;
    resourceLink?: string;
  }>;
  mentorActionItems: string[];
  nextStep: "SCHEDULE" | "DEFER";
  nextMeetingType?: string;
  nextMeetingDate?: string;
  nextMeetingTimezone?: string;
  summaryMessage: string;
  followedUpOnActionItems: "YES" | "NO";
  duration: number;
}

const MEETING_TYPES = [
  "Introductory Call",
  "DAT Strategy & Planning",
  "Application Review",
  "Personal Statement Workshop",
  "Interview Preparation",
  "Post-Interview Debrief",
  "Other",
];

const MEETING_TYPE_OPTIONS = MEETING_TYPES.map((type) => ({ value: type, label: type }));

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "UTC", label: "UTC" },
];

const SUMMARY_TEMPLATES: Record<string, string> = {
  "Introductory Call":
    "Hi {name}, it was great meeting you today! We covered your background and set some initial goals. I've assigned a few tasks to get us started. Looking forward to our next session!",
  "DAT Strategy & Planning":
    "Hi {name}, great work on our DAT strategy session today. We've identified your target scores and a study timeline. Make sure to check the resources I've attached to your new tasks.",
  "Application Review":
    "Hi {name}, we made good progress on your application review. Focus on the sections we discussed, especially the experiences descriptions. I'll review your next draft soon.",
  "Personal Statement Workshop":
    "Hi {name}, your personal statement is coming along well. Focus on the 'why dentistry' narrative we brainstormed. I'm looking forward to seeing the revised version.",
  "Interview Preparation":
    "Hi {name}, you did well in our mock interview. Remember to keep your answers concise and focus on specific examples. Practice the 'Tell me about yourself' pitch we refined.",
  "Post-Interview Debrief":
    "Hi {name}, thanks for sharing how your interview went. It sounds like you handled the ethical questions well. Now we wait for the next steps!",
  Other:
    "Hi {name}, thanks for our meeting today. We discussed {notes}. I've updated your action items accordingly.",
};

function parseMentorActionItems(raw?: string): string[] {
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [raw];
    } catch {
      return [raw];
    }
  }
  return [raw];
}

const CompleteMeetingForm: React.FC<CompleteMeetingFormProps> = ({
  student,
  meeting,
  onClose,
  onSubmit,
  embedded = false,
}) => {
  const studentTz = resolveStudentTimezone(student);

  const [notes, setNotes] = useState(meeting?.notes || "");
  const [meetingType, setMeetingType] = useState(meeting?.meetingType || MEETING_TYPES[0]);
  const [meetingDate, setMeetingDate] = useState(
    meeting?.date ? meeting.date.split("T")[0] : new Date().toISOString().split("T")[0],
  );
  const [otherType, setOtherType] = useState("");
  const [studentActionItems, setStudentActionItems] = useState<
    CompleteMeetingData["studentActionItems"]
  >([]);
  const [mentorActionItems, setMentorActionItems] = useState<string[]>(
    parseMentorActionItems(meeting?.mentorActionItems),
  );
  const [nextStep, setNextStep] = useState<"SCHEDULE" | "DEFER">(
    meeting?.nextMeetingScheduled ? "SCHEDULE" : "DEFER",
  );
  const [nextMeetingType, setNextMeetingType] = useState(
    meeting?.nextMeetingType || MEETING_TYPES[0],
  );
  const [nextMeetingDateOnly, setNextMeetingDateOnly] = useState("");
  const [nextMeetingTime, setNextMeetingTime] = useState("12:00");
  const [nextMeetingAmpm, setNextMeetingAmpm] = useState<"AM" | "PM">("PM");
  const [nextMeetingTimezone, setNextMeetingTimezone] = useState(
    meeting?.nextMeetingTimezone || meeting?.timezone || studentTz,
  );
  const [summaryMessage, setSummaryMessage] = useState(meeting?.summary || "");
  const [followedUpOnActionItems, setFollowedUpOnActionItems] = useState<"YES" | "NO">(
    meeting?.followedUpOnActionItems ? "YES" : "NO",
  );
  const [duration, setDuration] = useState(meeting?.duration || 30);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timezoneOptions = TIMEZONE_OPTIONS.some((o) => o.value === nextMeetingTimezone)
    ? TIMEZONE_OPTIONS
    : [...TIMEZONE_OPTIONS, { value: nextMeetingTimezone, label: nextMeetingTimezone }];

  useEffect(() => {
    let template = SUMMARY_TEMPLATES[meetingType] || SUMMARY_TEMPLATES.Other;
    template = template.replace("{name}", student.name.split(" ")[0]);
    template = template.replace("{notes}", notes || "our discussion");

    const validItems = studentActionItems.filter((item) => item.task.trim() !== "");
    if (validItems.length > 0) {
      const itemsList = validItems
        .map((item) => `• ${item.task} (Due: ${item.dueDate})`)
        .join("\n");
      template += `\n\nYour Action Items:\n${itemsList}`;
    }

    setSummaryMessage(template);
  }, [meetingType, otherType, student.name, notes, studentActionItems]);

  const addStudentAction = () => {
    setStudentActionItems([
      ...studentActionItems,
      {
        task: "",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        priority: "MEDIUM",
      },
    ]);
  };

  const removeStudentAction = (index: number) => {
    setStudentActionItems(studentActionItems.filter((_, i) => i !== index));
  };

  const updateStudentAction = (
    index: number,
    patch: Partial<CompleteMeetingData["studentActionItems"][number]>,
  ) => {
    setStudentActionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const addMentorAction = () => {
    setMentorActionItems([...mentorActionItems, ""]);
  };

  const removeMentorAction = (index: number) => {
    setMentorActionItems(mentorActionItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!notes.trim()) {
      setError("Meeting notes are required.");
      return;
    }

    const validStudentItems = studentActionItems.filter((item) => item.task.trim() !== "");
    if (validStudentItems.length === 0) {
      setError("At least one action item for the student is required.");
      return;
    }

    let finalNextMeetingDate: string | undefined;
    if (nextStep === "SCHEDULE") {
      if (!nextMeetingDateOnly || !nextMeetingTime) {
        setError("Please select a date and time for the next meeting.");
        return;
      }
      if (!nextMeetingType) {
        setError("Please select a type for the next meeting.");
        return;
      }

      let [hours, minutes] = nextMeetingTime.split(":").map(Number);
      if (nextMeetingAmpm === "PM" && hours < 12) hours += 12;
      if (nextMeetingAmpm === "AM" && hours === 12) hours = 0;
      const time24 = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      finalNextMeetingDate = zonedDateTimeToUtcIso(
        nextMeetingDateOnly,
        time24,
        nextMeetingTimezone || studentTz,
      );
    }

    setSubmitting(true);
    try {
      await onSubmit({
        notes,
        meetingType: meetingType === "Other" ? otherType : meetingType,
        meetingDate,
        duration,
        studentActionItems: validStudentItems,
        mentorActionItems: mentorActionItems.filter((item) => item.trim() !== ""),
        nextStep,
        nextMeetingType: nextStep === "SCHEDULE" ? nextMeetingType : undefined,
        nextMeetingDate: finalNextMeetingDate,
        nextMeetingTimezone: nextStep === "SCHEDULE" ? nextMeetingTimezone : undefined,
        summaryMessage,
        followedUpOnActionItems,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to complete meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", !embedded && "max-h-[90vh]")}>
      {!embedded && (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/50 p-6">
          <div>
            <h3 className="text-xl font-bold text-white">Complete Meeting</h3>
            <p className="mt-1 text-xs text-slate-500">
              Session with {student.name}
              {meeting
                ? ` • ${formatInTimezone(meeting.date, meeting.timezone || studentTz, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : " • Unscheduled"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div
          className={cn(
            "min-h-0 flex-1 space-y-8 overflow-y-auto",
            embedded ? "px-1 pb-2" : "p-6",
          )}
        >
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Row 1: Session + next steps */}
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Info className="h-4 w-4" /> Session details
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Meeting type" htmlFor="meeting-type" required>
                  <SelectMenu
                    value={meetingType}
                    onChange={setMeetingType}
                    options={MEETING_TYPE_OPTIONS}
                    className="w-full"
                  />
                </FormField>
                <FormField label="Date of meeting" htmlFor="meeting-date" required>
                  <DatePicker value={meetingDate} onChange={setMeetingDate} />
                </FormField>
                <FormField label="Duration (minutes)" htmlFor="meeting-duration" required>
                  <Input
                    id="meeting-duration"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                  />
                </FormField>
                <FormField label="Followed up on past tasks?" htmlFor="followed-up">
                  <SelectMenu
                    value={followedUpOnActionItems}
                    onChange={(v) => setFollowedUpOnActionItems(v as "YES" | "NO")}
                    options={[
                      { value: "YES", label: "Yes" },
                      { value: "NO", label: "No" },
                    ]}
                    className="w-full"
                  />
                </FormField>
              </div>

              {meetingType === "Other" && (
                <FormField label="Specify type" htmlFor="other-type" required>
                  <Input
                    id="other-type"
                    value={otherType}
                    onChange={(e) => setOtherType(e.target.value)}
                    placeholder="Enter meeting type..."
                    required
                  />
                </FormField>
              )}

              <FormField
                label="Meeting notes"
                htmlFor="meeting-notes"
                required
                hint="Internal notes for mentors / history"
              >
                <Textarea
                  id="meeting-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[140px] resize-y"
                  placeholder="What did you discuss? Key takeaways..."
                  required
                />
              </FormField>
            </section>

            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Calendar className="h-4 w-4" /> Next meeting
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNextStep("SCHEDULE")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    nextStep === "SCHEDULE"
                      ? "border-indigo-500 bg-indigo-600/10 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700",
                  )}
                >
                  <p className="text-sm font-semibold">Schedule now</p>
                  <p className="mt-1 text-xs opacity-70">Book the follow-up immediately.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setNextStep("DEFER")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    nextStep === "DEFER"
                      ? "border-amber-500 bg-amber-600/10 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700",
                  )}
                >
                  <p className="text-sm font-semibold">Defer</p>
                  <p className="mt-1 text-xs opacity-70">Schedule later from reminders.</p>
                </button>
              </div>

              {nextStep === "SCHEDULE" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Type" htmlFor="next-meeting-type" className="sm:col-span-2">
                    <SelectMenu
                      value={nextMeetingType}
                      onChange={setNextMeetingType}
                      options={MEETING_TYPE_OPTIONS}
                      className="w-full"
                    />
                  </FormField>
                  <FormField label="Date" htmlFor="next-meeting-date">
                    <DatePicker value={nextMeetingDateOnly} onChange={setNextMeetingDateOnly} />
                  </FormField>
                  <FormField label="Time" htmlFor="next-meeting-time">
                    <TimePicker
                      time={nextMeetingTime}
                      ampm={nextMeetingAmpm}
                      onChange={({ time, ampm }) => {
                        setNextMeetingTime(time);
                        setNextMeetingAmpm(ampm);
                      }}
                    />
                  </FormField>
                  <FormField
                    label="Timezone"
                    htmlFor="next-meeting-tz"
                    className="sm:col-span-2"
                    hint={`Defaults to student’s timezone (${studentTz})`}
                  >
                    <SelectMenu
                      value={nextMeetingTimezone}
                      onChange={setNextMeetingTimezone}
                      options={timezoneOptions}
                      className="w-full"
                      leftIcon={<Globe className="h-4 w-4" />}
                    />
                  </FormField>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                  No follow-up booked yet. You’ll get reminders to schedule one later.
                </p>
              )}

              <FormField
                label="Summary message to student"
                htmlFor="summary-message"
                hint="Sent as a DM when you complete this meeting"
              >
                <div className="relative">
                  <Textarea
                    id="summary-message"
                    value={summaryMessage}
                    onChange={(e) => setSummaryMessage(e.target.value)}
                    className="min-h-[140px] resize-y pr-10"
                    placeholder="Edit the summary message..."
                  />
                  <Sparkles className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-indigo-500 opacity-50" />
                </div>
              </FormField>
            </section>
          </div>

          {/* Row 2: Action items */}
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Plus className="h-4 w-4" /> Student action items
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={addStudentAction}
                >
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {studentActionItems.map((item, index) => (
                  <div
                    key={index}
                    className="relative space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStudentAction(index)}
                      className="absolute right-2 top-2 h-8 w-8 text-slate-500 hover:text-rose-400"
                      aria-label="Remove action item"
                    >
                      <Trash2 size={16} />
                    </Button>
                    <FormField label="Task" htmlFor={`task-${index}`} required>
                      <Input
                        id={`task-${index}`}
                        value={item.task}
                        onChange={(e) => updateStudentAction(index, { task: e.target.value })}
                        placeholder="e.g. Draft Personal Statement"
                        className="pr-10"
                        required
                      />
                    </FormField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Due date" htmlFor={`due-${index}`} required>
                        <DatePicker
                          value={item.dueDate}
                          onChange={(value) => updateStudentAction(index, { dueDate: value })}
                        />
                      </FormField>
                      <FormField label="Priority" htmlFor={`priority-${index}`}>
                        <SelectMenu
                          value={item.priority}
                          onChange={(value) =>
                            updateStudentAction(index, {
                              priority: value as "HIGH" | "MEDIUM" | "LOW",
                            })
                          }
                          options={PRIORITY_OPTIONS}
                          className="w-full"
                        />
                      </FormField>
                    </div>
                    <FormField label="Resource link" htmlFor={`resource-${index}`} hint="Optional">
                      <Input
                        id={`resource-${index}`}
                        type="url"
                        value={item.resourceLink || ""}
                        onChange={(e) =>
                          updateStudentAction(index, { resourceLink: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </FormField>
                  </div>
                ))}
                {studentActionItems.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-800 py-6 text-center text-xs italic text-slate-500">
                    Add at least one task for the student (required).
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <Clock className="h-4 w-4" /> Your follow-ups (mentor)
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={addMentorAction}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Private to you — reminders for what you still need to do for this student.
              </p>
              <div className="space-y-2">
                {mentorActionItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const next = [...mentorActionItems];
                        next[index] = e.target.value;
                        setMentorActionItems(next);
                      }}
                      placeholder="e.g. Review draft PS by Friday"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMentorAction(index)}
                      className="text-slate-500 hover:text-rose-400"
                      aria-label="Remove mentor action"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                {mentorActionItems.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-800 py-6 text-center text-xs italic text-slate-500">
                    Optional — add anything you owe the student.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center justify-end gap-2 border-t border-slate-800",
            embedded ? "px-1 pt-4" : "px-6 py-4",
          )}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            leftIcon={<CheckSquare className="h-4 w-4" />}
            isLoading={submitting}
            onClick={() => void handleSubmit()}
          >
            {meeting?.completed ? "Save Meeting" : "Complete Meeting"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CompleteMeetingForm;
