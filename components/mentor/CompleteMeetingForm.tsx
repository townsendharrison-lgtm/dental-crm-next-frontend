"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Library,
  ExternalLink,
  Check,
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
  TimezoneHint,
  ResourcePicker,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  formatMeetingLocal,
  resolveStudentTimezone,
  zonedDateTimeToUtcIso,
} from "@/lib/utils/dateUtils";
import {
  fillMeetingSummaryTemplate,
  formatNextMeetingForTimezone,
} from "@/lib/utils/meetingSummary";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { usePreviewSubject } from "@/lib/hooks/usePreviewSubject";
import { useMentor, useUpdateMentor } from "@/lib/hooks/useMentors";
import { DEFAULT_MEETING_TYPES } from "@/lib/api/adminSettings";
import { timezoneSelectOptions } from "@/lib/utils/timezoneOptions";
import { MeetingTimePresetsPicker } from "@/components/mentor/MeetingTimePresetsPicker";
import {
  clockFrom24,
  dueDateFromDays,
  matchSessionType,
  readMeetingAiDraft,
} from "@/lib/utils/meetingAiDraft";
import { extractGeminiFullNotes } from "@/lib/utils/geminiFullNotes";
import {
  ActionItemBookshelfModal,
  SaveToBookshelfButton,
} from "@/components/action-items/ActionItemBookshelfModal";
import type { ActionItemBookshelfItem } from "@/lib/types";
import { toast } from "sonner";

interface CompleteMeetingFormProps {
  student: Student;
  meeting?: Meeting;
  onClose: () => void;
  onSubmit: (data: CompleteMeetingData) => void | Promise<void>;
  /** When true, skip the built-in header (parent Modal provides chrome). */
  embedded?: boolean;
}

export type CommitmentStatus = "ALL" | "SOME" | "NONE";

export const INCOMPLETE_REASONS = [
  { value: "UNCLEAR_INSTRUCTIONS", label: "Unclear instructions" },
  { value: "TIME_MANAGEMENT", label: "Time management" },
  { value: "AVOIDANCE", label: "Avoidance/lack of follow-through" },
  { value: "ACADEMIC", label: "Academic issue" },
  { value: "PERSONAL", label: "Personal issue" },
  { value: "MENTOR_DELAY", label: "Mentor delay" },
  { value: "OTHER", label: "Other" },
] as const;

export interface CompleteMeetingData {
  officialSummary: string;
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
  commitmentsCompleted: CommitmentStatus;
  incompleteReason?: string;
  incompleteReasonDetail?: string;
  verifiedSummary: boolean;
  verifiedSchoolTimeline: boolean;
  duration: number;
}

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const FALLBACK_OTHER_TEMPLATE =
  DEFAULT_MEETING_TYPES.find((t) => t.label === "Other")?.summaryTemplate ||
  "Hi {name}, thanks for our meeting today. We discussed {notes}.\n\n{actionItems}";

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
  const platformConfig = usePlatformConfig();
  const { user } = useAuth();
  const { role } = useRole();
  const { subjectId: previewMentorId } = usePreviewSubject("MENTOR");
  const mentorId =
    role === "MENTOR" ? previewMentorId || user?.id || "" : "";
  const { data: mentorProfile } = useMentor(mentorId);
  const updateMentorMutation = useUpdateMentor();
  const defaultAvailability =
    mentorProfile?.defaultAvailability ||
    mentorProfile?.profile?.default_availability ||
    [];

  const meetingTypes = useMemo(() => {
    const types =
      platformConfig.meetingTypes?.length > 0
        ? platformConfig.meetingTypes
        : DEFAULT_MEETING_TYPES;
    const hasOther = types.some((t) => t.label.trim().toLowerCase() === "other");
    return hasOther
      ? types
      : [
          ...types,
          {
            id: "other",
            label: "Other",
            summaryTemplate: FALLBACK_OTHER_TEMPLATE,
            recommendedActionItems: [],
          },
        ];
  }, [platformConfig.meetingTypes]);

  const meetingTypeLabels = useMemo(
    () => meetingTypes.map((t) => t.label),
    [meetingTypes],
  );
  const meetingTypeOptions = useMemo(
    () => meetingTypeLabels.map((type) => ({ value: type, label: type })),
    [meetingTypeLabels],
  );
  const summaryByLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of meetingTypes) map[t.label] = t.summaryTemplate;
    return map;
  }, [meetingTypes]);

  const defaultType = meetingTypeLabels[0] || "Other";
  const aiDraft = readMeetingAiDraft(meeting?.ai_draft);
  const copiedNotes = extractGeminiFullNotes(meeting?.notes || "", student.name);
  const draftedNext = aiDraft?.nextMeeting?.mentioned ? aiDraft.nextMeeting : null;
  const draftedNextType = matchSessionType(draftedNext?.typeName, meetingTypeLabels);
  const draftedClock = clockFrom24(draftedNext?.time);
  const notesDocUrl = (meeting?.notes_doc_url || meeting?.transcript_doc_url || "").trim();

  const [officialSummary, setOfficialSummary] = useState(
    (copiedNotes.hasSummary ? copiedNotes.summary : "") ||
      aiDraft?.summary?.trim() ||
      meeting?.official_summary ||
      "",
  );
  const [commitmentsCompleted, setCommitmentsCompleted] = useState<CommitmentStatus | "">(
    meeting?.commitments_completed || "",
  );
  const [incompleteReason, setIncompleteReason] = useState(meeting?.incomplete_reason || "");
  const [incompleteReasonDetail, setIncompleteReasonDetail] = useState(
    meeting?.incomplete_reason_detail || "",
  );
  const [verifiedSummary, setVerifiedSummary] = useState(false);
  const [verifiedSchoolTimeline, setVerifiedSchoolTimeline] = useState(false);
  const [meetingType, setMeetingType] = useState(
    meeting?.meetingType && meetingTypeLabels.includes(meeting.meetingType)
      ? meeting.meetingType
      : meeting?.meetingType && !meetingTypeLabels.includes(meeting.meetingType)
        ? "Other"
        : defaultType,
  );
  const [meetingDate, setMeetingDate] = useState(
    meeting?.date ? meeting.date.split("T")[0] : new Date().toISOString().split("T")[0],
  );
  const [otherType, setOtherType] = useState(
    meeting?.meetingType && !meetingTypeLabels.includes(meeting.meetingType)
      ? meeting.meetingType
      : "",
  );
  const [studentActionItems, setStudentActionItems] = useState<
    CompleteMeetingData["studentActionItems"]
  >(() => {
    const source = copiedNotes.hasNextSteps
      ? copiedNotes.studentActionItems.map((task) => ({
          task,
          dueInDays: 7,
          priority: "MEDIUM" as const,
        }))
      : aiDraft?.studentActionItems || [];
    return source
      .filter((item) => item.task?.trim())
      .map((item) => ({
        task: item.task.trim(),
        dueDate: dueDateFromDays(item.dueInDays || 7),
        priority: item.priority || "MEDIUM",
      }));
  });
  const [mentorActionItems, setMentorActionItems] = useState<string[]>(() => {
    if (copiedNotes.hasNextSteps) return copiedNotes.mentorActionItems;
    const drafted = (aiDraft?.mentorActionItems || []).map((item) => item.trim()).filter(Boolean);
    if (drafted.length) return drafted;
    return parseMentorActionItems(meeting?.mentorActionItems);
  });
  const [nextStep, setNextStep] = useState<"SCHEDULE" | "DEFER">("SCHEDULE");
  const [nextMeetingType, setNextMeetingType] = useState(draftedNextType.type || defaultType);
  const [nextOtherType, setNextOtherType] = useState(draftedNextType.custom);
  const [nextMeetingDateOnly, setNextMeetingDateOnly] = useState(
    draftedNext?.date && /^\d{4}-\d{2}-\d{2}$/.test(draftedNext.date) ? draftedNext.date : "",
  );
  const [nextMeetingTime, setNextMeetingTime] = useState(draftedClock?.time || "12:00");
  const [nextMeetingAmpm, setNextMeetingAmpm] = useState<"AM" | "PM">(draftedClock?.ampm || "PM");
  const [nextMeetingTimezone, setNextMeetingTimezone] = useState(
    meeting?.nextMeetingTimezone || meeting?.timezone || studentTz,
  );
  const [summaryMessage, setSummaryMessage] = useState(meeting?.summary || "");
  const [duration, setDuration] = useState(meeting?.duration || 30);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookshelfOpen, setBookshelfOpen] = useState(false);

  const timezoneOptions = timezoneSelectOptions(nextMeetingTimezone);

  useEffect(() => {
    if (!meetingTypeLabels.includes(meetingType)) {
      setMeetingType(defaultType);
    }
    if (nextMeetingType && !meetingTypeLabels.includes(nextMeetingType)) {
      setNextMeetingType(defaultType);
    }
  }, [meetingTypeLabels, meetingType, nextMeetingType, defaultType]);

  useEffect(() => {
    const template =
      summaryByLabel[meetingType] ||
      summaryByLabel.Other ||
      FALLBACK_OTHER_TEMPLATE;

    let nextMeetingLabel = "";
    if (nextStep === "SCHEDULE" && nextMeetingDateOnly && nextMeetingTime) {
      let [hours, minutes] = nextMeetingTime.split(":").map(Number);
      if (nextMeetingAmpm === "PM" && hours < 12) hours += 12;
      if (nextMeetingAmpm === "AM" && hours === 12) hours = 0;
      const time24 = `${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}`;
      const iso = zonedDateTimeToUtcIso(
        nextMeetingDateOnly,
        time24,
        nextMeetingTimezone || studentTz,
      );
      nextMeetingLabel = formatNextMeetingForTimezone(iso, studentTz);
    }

    setSummaryMessage(
      fillMeetingSummaryTemplate({
        template,
        studentFirstName: student.name.split(" ")[0],
        notes: officialSummary,
        actionItems: studentActionItems,
        nextMeetingLabel,
      }),
    );
  }, [
    meetingType,
    otherType,
    student.name,
    officialSummary,
    studentActionItems,
    summaryByLabel,
    nextStep,
    nextMeetingDateOnly,
    nextMeetingTime,
    nextMeetingAmpm,
    nextMeetingTimezone,
    studentTz,
  ]);

  const defaultDueDate = () =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const recommendedForType = useMemo(() => {
    const match = meetingTypes.find((type) => type.label === meetingType);
    return (match?.recommendedActionItems || []).filter((item) => item.task.trim());
  }, [meetingTypes, meetingType]);

  const addStudentAction = (task = "") => {
    setStudentActionItems((prev) => [
      ...prev,
      {
        task,
        dueDate: defaultDueDate(),
        priority: "MEDIUM",
      },
    ]);
  };

  const addFromBookshelf = (item: ActionItemBookshelfItem) => {
    const preset = {
      task: item.title,
      description: item.description || "",
      dueDate: defaultDueDate(),
      priority: item.priority || ("MEDIUM" as const),
      ...(item.resourceLink?.trim() ? { resourceLink: item.resourceLink.trim() } : {}),
    };
    setStudentActionItems((prev) => {
      const emptyIndex = prev.findIndex((row) => !row.task.trim());
      if (emptyIndex >= 0) {
        return prev.map((row, index) =>
          index === emptyIndex ? { ...row, ...preset, dueDate: row.dueDate || preset.dueDate } : row,
        );
      }
      return [...prev, preset];
    });
    setBookshelfOpen(false);
  };

  const addRecommendedAction = (task: string, resourceLink?: string) => {
    setStudentActionItems((prev) => {
      const alreadyAdded = prev.some(
        (item) => item.task.trim().toLowerCase() === task.trim().toLowerCase(),
      );
      if (alreadyAdded) return prev;
      return [
        ...prev,
        {
          task,
          dueDate: defaultDueDate(),
          priority: "MEDIUM",
          ...(resourceLink?.trim() ? { resourceLink: resourceLink.trim() } : {}),
        },
      ];
    });
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

    if (!commitmentsCompleted) {
      setError("Say whether previous commitments were completed.");
      return;
    }
    if (commitmentsCompleted !== "ALL" && !incompleteReason) {
      setError("Choose a reason for the incomplete commitments.");
      return;
    }
    if (commitmentsCompleted !== "ALL" && incompleteReason === "OTHER" && !incompleteReasonDetail.trim()) {
      setError("Describe the other reason for the incomplete commitments.");
      return;
    }
    if (meetingType === "Other" && !otherType.trim()) {
      setError("Name this meeting type.");
      return;
    }
    if (!officialSummary.trim()) {
      setError("The meeting summary is required. Review and edit it before submitting.");
      return;
    }

    const validStudentItems = studentActionItems.filter((item) => item.task.trim() !== "");
    if (validStudentItems.length === 0) {
      setError("At least one student action item is required.");
      return;
    }
    if (!verifiedSummary || !verifiedSchoolTimeline) {
      setError("Check both verify boxes before submitting.");
      return;
    }

    let finalNextMeetingDate: string | undefined;
    let resolvedNextType = nextMeetingType;
    if (nextStep === "SCHEDULE") {
      if (nextMeetingType === "Other" && !nextOtherType.trim()) {
        setError("Name the next meeting type.");
        return;
      }
      resolvedNextType = nextMeetingType === "Other" ? nextOtherType.trim() : nextMeetingType;
      if (!nextMeetingDateOnly || !nextMeetingTime) {
        setError("Please select a date and time for the next meeting.");
        return;
      }
      if (!resolvedNextType) {
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
        officialSummary: officialSummary.trim(),
        meetingType: meetingType === "Other" ? otherType.trim() : meetingType,
        meetingDate,
        duration,
        studentActionItems: validStudentItems,
        mentorActionItems: mentorActionItems.filter((item) => item.trim() !== ""),
        nextStep,
        nextMeetingType: nextStep === "SCHEDULE" ? resolvedNextType : undefined,
        nextMeetingDate: finalNextMeetingDate,
        nextMeetingTimezone: nextStep === "SCHEDULE" ? nextMeetingTimezone : undefined,
        summaryMessage,
        commitmentsCompleted,
        incompleteReason: commitmentsCompleted === "ALL" ? undefined : incompleteReason,
        incompleteReasonDetail:
          commitmentsCompleted !== "ALL" && incompleteReason === "OTHER"
            ? incompleteReasonDetail.trim()
            : undefined,
        verifiedSummary,
        verifiedSchoolTimeline,
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
                ? ` • ${formatMeetingLocal(meeting.date, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
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
                    options={meetingTypeOptions}
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
                <FormField label="Previous commitments completed" htmlFor="commitments" required>
                  <SelectMenu
                    value={commitmentsCompleted}
                    onChange={(value) => {
                      setCommitmentsCompleted(value as CommitmentStatus);
                      if (value === "ALL") {
                        setIncompleteReason("");
                        setIncompleteReasonDetail("");
                      }
                    }}
                    options={[
                      { value: "ALL", label: "All" },
                      { value: "SOME", label: "Some" },
                      { value: "NONE", label: "None" },
                    ]}
                    placeholder="Select"
                    className="w-full"
                  />
                </FormField>
              </div>

              {commitmentsCompleted === "SOME" || commitmentsCompleted === "NONE" ? (
                <div className="space-y-3">
                  <FormField
                    label="Reason for incomplete commitments"
                    htmlFor="incomplete-reason"
                    required
                  >
                    <SelectMenu
                      value={incompleteReason}
                      onChange={setIncompleteReason}
                      options={INCOMPLETE_REASONS.map((reason) => ({
                        value: reason.value,
                        label: reason.label,
                      }))}
                      placeholder="Select a reason"
                      className="w-full"
                    />
                  </FormField>
                  {incompleteReason === "OTHER" && (
                    <FormField label="Other reason" htmlFor="incomplete-other" required>
                      <Input
                        id="incomplete-other"
                        value={incompleteReasonDetail}
                        onChange={(e) => setIncompleteReasonDetail(e.target.value)}
                        placeholder="Describe the reason"
                      />
                    </FormField>
                  )}
                </div>
              ) : null}

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
                label="Complete notes"
                htmlFor="notes-doc"
                hint="Google Doc from this meeting. Shared automatically with anyone who has the link."
              >
                {notesDocUrl ? (
                  <a
                    id="notes-doc"
                    href={notesDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-indigo-300 hover:border-indigo-500/40 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open notes document
                  </a>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-800 px-4 py-3 text-sm text-slate-500">
                    No notes document is attached to this meeting yet.
                  </p>
                )}
              </FormField>

              <FormField
                label="Meeting summary"
                htmlFor="official-summary"
                required
                hint="Copied from the Summary in the Gemini notes. Review and edit before submitting. This becomes the official meeting record."
              >
                <Textarea
                  id="official-summary"
                  value={officialSummary}
                  onChange={(e) => setOfficialSummary(e.target.value)}
                  className="min-h-[160px] resize-y"
                  placeholder="Summary from the meeting notes. Edit, delete, or add anything that is missing."
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
                  <FormField label="Type" htmlFor="next-meeting-type" className="sm:col-span-2" required>
                    <SelectMenu
                      value={nextMeetingType}
                      onChange={setNextMeetingType}
                      options={meetingTypeOptions}
                      className="w-full"
                    />
                  </FormField>
                  {nextMeetingType === "Other" && (
                    <FormField
                      label="Name this meeting type"
                      htmlFor="next-other-type"
                      className="sm:col-span-2"
                      required
                    >
                      <Input
                        id="next-other-type"
                        value={nextOtherType}
                        onChange={(e) => setNextOtherType(e.target.value)}
                        placeholder="Enter meeting type..."
                      />
                    </FormField>
                  )}
                  {!!mentorId && (
                    <div className="sm:col-span-2">
                      <MeetingTimePresetsPicker
                        mode="apply"
                        savedPresets={defaultAvailability}
                        onApply={(_label, next) => {
                          setNextMeetingDateOnly(next.date);
                          setNextMeetingTime(next.time);
                          setNextMeetingAmpm(next.ampm);
                        }}
                        isSavingPresets={updateMentorMutation.isPending}
                        onSavePresets={async (presets) => {
                          try {
                            await updateMentorMutation.mutateAsync({
                              id: mentorId,
                              updates: { default_availability: presets },
                            });
                            toast.success("Time presets saved");
                          } catch (err: unknown) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed to save presets",
                            );
                            throw err;
                          }
                        }}
                      />
                    </div>
                  )}
                  <FormField label="Date" htmlFor="next-meeting-date">
                    <DatePicker value={nextMeetingDateOnly} onChange={setNextMeetingDateOnly} />
                  </FormField>
                  <FormField
                    label={
                      <>
                        Time
                        <TimezoneHint
                          date={nextMeetingDateOnly}
                          time={nextMeetingTime}
                          ampm={nextMeetingAmpm}
                          timeZone={nextMeetingTimezone}
                        />
                      </>
                    }
                    htmlFor="next-meeting-time"
                  >
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
                  <Plus className="h-4 w-4" /> Student next steps / action items
                </h4>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Library size={14} />}
                    onClick={() => setBookshelfOpen(true)}
                  >
                    Bookshelf
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => addStudentAction()}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Required. Copied from Next steps in the Gemini notes when the student’s name is on
                the line. Use the recommended tasks or add your own.
              </p>

              {recommendedForType.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-emerald-300">
                    Recommended for {meetingType}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recommendedForType.map((recommended) => {
                      const added = studentActionItems.some(
                        (item) =>
                          item.task.trim().toLowerCase() === recommended.task.trim().toLowerCase(),
                      );
                      return (
                        <button
                          key={recommended.task}
                          type="button"
                          disabled={added}
                          onClick={() =>
                            addRecommendedAction(recommended.task, recommended.resourceLink)
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                            added
                              ? "cursor-default border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "cursor-pointer border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500/50 hover:text-white",
                          )}
                        >
                          {added ? (
                            <CheckSquare className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          {recommended.task}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    <FormField label="Details" htmlFor={`details-${index}`} hint="Optional">
                      <Textarea
                        id={`details-${index}`}
                        value={item.description || ""}
                        onChange={(e) => updateStudentAction(index, { description: e.target.value })}
                        placeholder="Steps that come with this task"
                        className="min-h-[68px]"
                      />
                    </FormField>
                    <div className="flex justify-end">
                      <SaveToBookshelfButton
                        title={item.task}
                        description={item.description}
                        priority={item.priority}
                        resourceLink={item.resourceLink}
                      />
                    </div>
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
                    <FormField label="Resource link" htmlFor={`resource-${index}`} hint="Optional. Pick from the student resources list, or paste a link.">
                      <div className="flex items-center gap-2">
                        <Input
                          id={`resource-${index}`}
                          type="url"
                          value={item.resourceLink || ""}
                          onChange={(e) =>
                            updateStudentAction(index, { resourceLink: e.target.value })
                          }
                          placeholder="https://..."
                          className="min-w-0 flex-1"
                        />
                        <ResourcePicker
                          value={item.resourceLink || ""}
                          onPick={(link) => updateStudentAction(index, { resourceLink: link })}
                        />
                      </div>
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
                  <Clock className="h-4 w-4" /> Mentor next steps / action items
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
                Private to you. Next steps in the Gemini notes that are not assigned to the student
                are copied here, including Dental School Guide follow-ups.
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

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verify</p>
          <VerifyCheck checked={verifiedSummary} onChange={setVerifiedSummary}>
            Did you verify the summary and action items are correct and add what needed to be added?
          </VerifyCheck>
          <VerifyCheck checked={verifiedSchoolTimeline} onChange={setVerifiedSchoolTimeline}>
            Did you update the school selection and timeline if needed?
          </VerifyCheck>
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
            {!meeting
              ? "Log Completed Meeting"
              : meeting.completed
                ? "Save Meeting"
                : "Complete Meeting"}
          </Button>
        </div>
      </form>
      <ActionItemBookshelfModal
        open={bookshelfOpen}
        onClose={() => setBookshelfOpen(false)}
        onPick={addFromBookshelf}
      />
    </div>
  );
};

function VerifyCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-600 bg-slate-950 text-transparent",
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-snug text-slate-200">{children}</span>
    </button>
  );
}

export default CompleteMeetingForm;
