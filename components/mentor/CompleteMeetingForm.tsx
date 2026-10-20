"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  CheckSquare,
  AlertCircle,
  Globe,
  Library,
  ExternalLink,
  Check,
  FileText,
  Mail,
  ListChecks,
  UserRound,
  Shield,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  ChevronLeft,
  Clock,
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
import { timezoneLabel, timezoneSelectOptions } from "@/lib/utils/timezoneOptions";
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
  const [resourceOpen, setResourceOpen] = useState<number[]>([]);

  const timezoneOptions = timezoneSelectOptions(nextMeetingTimezone);
  const studentTzLabel = timezoneLabel(studentTz);
  const durationOptions = useMemo(() => {
    const presets = [15, 30, 45, 60, 90, 120];
    const values = presets.includes(duration) ? presets : [duration, ...presets].sort((a, b) => a - b);
    return values.map((value) => ({ value: String(value), label: String(value) }));
  }, [duration]);

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

  const saveLabel = !meeting
    ? "Log Completed Meeting"
    : meeting.completed
      ? "Save Meeting"
      : "Complete Meeting";

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
            "min-h-0 flex-1 space-y-4 overflow-y-auto sm:space-y-6",
            embedded ? "pb-2" : "p-3 sm:p-6",
          )}
        >
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-800/80 bg-slate-900/95 py-2 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> Back to student
            </button>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="button"
                leftIcon={<CheckSquare className="h-4 w-4" />}
                isLoading={submitting}
                onClick={() => void handleSubmit()}
                className="w-full sm:w-auto"
              >
                {saveLabel}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
            <div className="space-y-4">
              <FormCard
                icon={<Calendar className="h-4 w-4" />}
                iconClass="bg-indigo-500/15 text-indigo-300"
                title="Meeting Details"
                subtitle="Basic information about this meeting."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Meeting type" htmlFor="meeting-type" required>
                    <SelectMenu
                      value={meetingType}
                      onChange={setMeetingType}
                      options={meetingTypeOptions}
                      className="w-full"
                    />
                  </FormField>
                  <FormField label="Date" htmlFor="meeting-date" required>
                    <DatePicker value={meetingDate} onChange={setMeetingDate} />
                  </FormField>
                  <FormField label="Duration (minutes)" htmlFor="meeting-duration" required>
                    <SelectMenu
                      value={String(duration)}
                      onChange={(value) => setDuration(parseInt(value, 10) || 0)}
                      options={durationOptions}
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

                <div className="grid gap-3 sm:grid-cols-2">
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
                  <FormField label="Meeting materials / notes document" htmlFor="notes-doc">
                    {notesDocUrl ? (
                      <a
                        id="notes-doc"
                        href={notesDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open notes document
                      </a>
                    ) : (
                      <p className="flex h-10 items-center rounded-lg border border-dashed border-slate-800 px-3 text-sm text-slate-500">
                        No notes document yet
                      </p>
                    )}
                  </FormField>
                </div>

                {commitmentsCompleted === "SOME" || commitmentsCompleted === "NONE" ? (
                  <div className="space-y-3">
                    <FormField label="Reason for incomplete commitments" htmlFor="incomplete-reason" required>
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
              </FormCard>

              <FormCard
                icon={<FileText className="h-4 w-4" />}
                iconClass="bg-indigo-500/15 text-indigo-300"
                title="Meeting Summary"
                subtitle="Capture what you discussed, key decisions, and next steps."
              >
                <NoteEditor
                  id="official-summary"
                  value={officialSummary}
                  onChange={setOfficialSummary}
                  placeholder="Summary from the meeting notes. Edit, delete, or add anything that is missing."
                />
              </FormCard>

              <FormCard
                icon={<Mail className="h-4 w-4" />}
                iconClass="bg-indigo-500/15 text-indigo-300"
                title="Summary message to student"
                subtitle="This will be sent to the student after you save the meeting."
              >
                <NoteEditor
                  id="summary-message"
                  value={summaryMessage}
                  onChange={setSummaryMessage}
                  placeholder="Edit the summary message..."
                />
              </FormCard>
            </div>

            <div className="space-y-4">
              <FormCard
                icon={<Calendar className="h-4 w-4" />}
                iconClass="bg-indigo-500/15 text-indigo-300"
                title="Next Meeting"
                subtitle="Schedule a follow-up meeting or defer for now."
              >
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setNextStep("SCHEDULE")}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl border p-3 text-left",
                      nextStep === "SCHEDULE"
                        ? "border-indigo-400/70 bg-indigo-500/10 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700",
                    )}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="h-4 w-4 text-indigo-300" /> Schedule now
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">Book the follow-up immediately.</span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded-full border",
                        nextStep === "SCHEDULE" ? "border-indigo-300 bg-indigo-400" : "border-slate-600",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNextStep("DEFER")}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl border p-3 text-left",
                      nextStep === "DEFER"
                        ? "border-slate-500 bg-slate-800 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700",
                    )}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-slate-400" /> Defer
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">Schedule later from reminders.</span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded-full border",
                        nextStep === "DEFER" ? "border-slate-300 bg-slate-200" : "border-slate-600",
                      )}
                    />
                  </button>
                </div>

                {nextStep === "SCHEDULE" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
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
                              toast.error(err instanceof Error ? err.message : "Failed to save presets");
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
                    <FormField label="Timezone" htmlFor="next-meeting-tz" className="sm:col-span-2">
                      <SelectMenu
                        value={nextMeetingTimezone}
                        onChange={setNextMeetingTimezone}
                        options={timezoneOptions}
                        className="w-full"
                        leftIcon={<Globe className="h-4 w-4" />}
                      />
                      <p className="text-xs text-slate-500">
                        Defaults to student’s timezone ({studentTzLabel}).
                      </p>
                    </FormField>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                    No follow-up booked yet. You’ll get reminders to schedule one later.
                  </p>
                )}
              </FormCard>

              <FormCard
                icon={<ListChecks className="h-4 w-4" />}
                iconClass="bg-emerald-500/15 text-emerald-300"
                title="Student Next Steps / Action Items"
                subtitle="Tasks for the student. These will appear in their dashboard."
                action={
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Library size={14} />}
                      onClick={() => setBookshelfOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      Bookshelf
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={() => addStudentAction()}
                      className="w-full sm:w-auto"
                    >
                      Add item
                    </Button>
                  </div>
                }
              >
                <p className="text-xs text-slate-500">
                  Copied from Next steps in the Gemini notes when the student’s name is on the line.
                </p>
                {recommendedForType.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recommendedForType.map((recommended) => {
                      const added = studentActionItems.some(
                        (item) => item.task.trim().toLowerCase() === recommended.task.trim().toLowerCase(),
                      );
                      return (
                        <button
                          key={recommended.task}
                          type="button"
                          disabled={added}
                          onClick={() => addRecommendedAction(recommended.task, recommended.resourceLink)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                            added
                              ? "cursor-default border-slate-700 bg-slate-800 text-slate-400"
                              : "cursor-pointer border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500",
                          )}
                        >
                          {added ? <CheckSquare className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          {recommended.task}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-2">
                  {studentActionItems.map((item, index) => {
                    const showResource = resourceOpen.includes(index) || Boolean(item.resourceLink);
                    return (
                      <div key={index} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                          <FitTextarea
                            id={`task-${index}`}
                            value={item.task}
                            onChange={(e) => updateStudentAction(index, { task: e.target.value })}
                            placeholder="Task for the student"
                            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                            required
                          />
                          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                            <DatePicker
                              value={item.dueDate}
                              onChange={(value) => updateStudentAction(index, { dueDate: value })}
                            />
                            <select
                              aria-label="Priority"
                              value={item.priority}
                              onChange={(e) =>
                                updateStudentAction(index, {
                                  priority: e.target.value as "HIGH" | "MEDIUM" | "LOW",
                                })
                              }
                              className={cn(
                                "h-8 rounded-lg px-2 text-xs font-bold",
                                PRIORITY_PILL[item.priority],
                              )}
                            >
                              <option value="HIGH">High</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="LOW">Low</option>
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400"
                              aria-label="Resource link"
                              onClick={() =>
                                setResourceOpen((prev) =>
                                  prev.includes(index) ? prev.filter((n) => n !== index) : [...prev, index],
                                )
                              }
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStudentAction(index)}
                              className="h-8 w-8 text-slate-500 hover:text-rose-400"
                              aria-label="Remove action item"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                        <FitTextarea
                          id={`details-${index}`}
                          value={item.description || ""}
                          onChange={(e) => updateStudentAction(index, { description: e.target.value })}
                          placeholder="Details (optional)"
                          className="min-h-[44px] resize-none"
                        />
                        <div className="flex justify-end">
                          <SaveToBookshelfButton
                            title={item.task}
                            description={item.description}
                            priority={item.priority}
                            resourceLink={item.resourceLink}
                          />
                        </div>
                        {showResource && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              id={`resource-${index}`}
                              type="url"
                              value={item.resourceLink || ""}
                              onChange={(e) => updateStudentAction(index, { resourceLink: e.target.value })}
                              placeholder="https://..."
                              className="min-w-0 flex-1"
                            />
                            <ResourcePicker
                              value={item.resourceLink || ""}
                              onPick={(link) => updateStudentAction(index, { resourceLink: link })}
                              className="h-10 w-full sm:w-36"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {studentActionItems.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-800 py-6 text-center text-xs italic text-slate-500">
                      Add at least one task for the student (required).
                    </p>
                  )}
                </div>
              </FormCard>

              <FormCard
                icon={<UserRound className="h-4 w-4" />}
                iconClass="bg-amber-500/15 text-amber-300"
                title="Mentor Next Steps / Follow-Ups"
                subtitle="Private tasks for you. Copied from Gemini notes."
                action={
                  <Button
                    type="button"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={addMentorAction}
                    className="w-full sm:w-auto"
                  >
                    Add item
                  </Button>
                }
              >
                <div className="space-y-2">
                  {mentorActionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                      <FitTextarea
                        value={item}
                        onChange={(e) => {
                          const next = [...mentorActionItems];
                          next[index] = e.target.value;
                          setMentorActionItems(next);
                        }}
                        placeholder="Follow-up for you"
                        className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMentorAction(index)}
                        className="h-8 w-8 text-slate-500 hover:text-rose-400"
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
              </FormCard>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <Shield className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Quick Verification</h4>
                  <p className="mt-0.5 text-xs text-slate-500">Confirm everything is accurate before saving.</p>
                </div>
              </div>
              <div className="space-y-3 lg:max-w-xl">
                <VerifyCheck checked={verifiedSummary} onChange={setVerifiedSummary}>
                  Did you verify the summary and action items are correct and add what needed to be added?
                </VerifyCheck>
                <VerifyCheck checked={verifiedSchoolTimeline} onChange={setVerifiedSchoolTimeline}>
                  Did you update the school selection and timeline if needed?
                </VerifyCheck>
              </div>
            </div>
          </section>
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

function FormCard({
  icon,
  iconClass,
  title,
  subtitle,
  action,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconClass)}>
            {icon}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
    >
      {children}
    </button>
  );
}

function wrapSelection(
  el: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (value: string) => void,
) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const selected = el.value.slice(start, end);
  const next = `${el.value.slice(0, start)}${before}${selected}${after}${el.value.slice(end)}`;
  onChange(next);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(cursorStart, cursorEnd);
  });
}

function prefixLines(
  el: HTMLTextAreaElement,
  prefix: string,
  onChange: (value: string) => void,
) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const selected = el.value.slice(start, end) || "";
  const replaced = (selected || " ").split("\n").map((line) => `${prefix}${line}`).join("\n");
  const next = `${el.value.slice(0, start)}${replaced}${el.value.slice(end)}`;
  onChange(next);
}

function NoteEditor({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const limit = 2000;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex items-center gap-0.5 border-b border-slate-800 px-2 py-1.5">
        <ToolbarButton label="Bold" onClick={() => ref.current && wrapSelection(ref.current, "**", "**", onChange)}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => ref.current && wrapSelection(ref.current, "*", "*", onChange)}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" onClick={() => ref.current && prefixLines(ref.current, "- ", onChange)}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => ref.current && prefixLines(ref.current, "1. ", onChange)}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={() => ref.current && wrapSelection(ref.current, "[", "](https://)", onChange)}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[140px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500"
      />
      <p className={cn("px-3 pb-2 text-right text-[11px]", value.length > limit ? "text-amber-300" : "text-slate-500")}>
        {value.length}/{limit}
      </p>
    </div>
  );
}

const PRIORITY_PILL: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "bg-rose-500 text-white",
  MEDIUM: "bg-amber-400 text-slate-950",
  LOW: "bg-sky-500 text-white",
};

function FitTextarea({
  className,
  value,
  onChange,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    fit();
  }, [value]);

  return (
    <Textarea
      {...props}
      ref={ref}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        fit();
      }}
      className={cn("overflow-hidden", className)}
    />
  );
}

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
            ? "border-indigo-400 bg-indigo-500 text-white"
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
