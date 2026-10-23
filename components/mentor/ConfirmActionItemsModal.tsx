"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  FileText,
  GripVertical,
  Library,
  Link2,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { ActionItemBookshelfItem, ActionItem, Meeting, Student } from "@/lib/types";
import { Button, DatePicker, ResourcePicker } from "@/components/ui";
import { Input } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import CompleteMeetingForm, { type CompleteMeetingData } from "@/components/mentor/CompleteMeetingForm";
import { ActionItemBookshelfModal } from "@/components/action-items/ActionItemBookshelfModal";
import { cn } from "@/lib/utils/cn";
import { formatMeetingLocal } from "@/lib/utils/dateUtils";
import { extractGeminiFullNotes, type ExtractedActionItem } from "@/lib/utils/geminiFullNotes";
import { readMeetingAiDraft } from "@/lib/utils/meetingAiDraft";

export interface ReviewActionItem {
  id: string;
  task: string;
  description: string;
  dueDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  resourceLink: string;
}

export interface ConfirmedActionPlan {
  student: ReviewActionItem[];
  mentor: ReviewActionItem[];
}

const PRIORITY_DOT = {
  HIGH: "bg-rose-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-sky-500",
} as const;

let itemSeq = 0;

function nextId() {
  itemSeq += 1;
  return `review-${itemSeq}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function blankItem(): ReviewActionItem {
  return {
    id: nextId(),
    task: "",
    description: "",
    dueDate: "",
    priority: "MEDIUM",
    resourceLink: "",
  };
}

function fromExtracted(item: ExtractedActionItem | string): ReviewActionItem {
  if (typeof item === "string") {
    return { ...blankItem(), task: item };
  }
  return {
    ...blankItem(),
    task: item.task,
    dueDate: item.dueDate || "",
  };
}

function ResourceLine({
  link,
  onChange,
}: {
  link: string;
  onChange: (link: string) => void;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Resource</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            type="url"
            value={link}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste a link (https://...)"
            className="h-9 pl-8"
          />
        </div>
        <ResourcePicker
          value={link}
          onPick={onChange}
          className="h-9 w-full sm:w-40"
        />
      </div>
    </div>
  );
}

function PrioritySelect({
  value,
  onChange,
}: {
  value: ReviewActionItem["priority"];
  onChange: (value: ReviewActionItem["priority"]) => void;
}) {
  return (
    <label className="block min-w-[7.5rem]">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Priority</span>
      <span className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[value])} />
        <select
          aria-label="Priority"
          value={value}
          onChange={(event) => onChange(event.target.value as ReviewActionItem["priority"])}
          className="h-full w-full bg-transparent text-xs text-slate-100 outline-none"
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </span>
    </label>
  );
}

function DueField({
  value,
  onChange,
  missing,
}: {
  value: string;
  onChange: (value: string) => void;
  missing?: boolean;
}) {
  return (
    <label className="block min-w-[9.5rem]">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Due date</span>
      <DatePicker
        value={value}
        onChange={onChange}
        placeholder="Choose date"
        className={cn("h-9", missing && "border-rose-500/70")}
      />
    </label>
  );
}

export function ConfirmActionItemsModal({
  student,
  meeting,
  mentorName,
  onClose,
  onContinue,
}: {
  student: Student;
  meeting?: Meeting;
  mentorName: string;
  onClose: () => void;
  onContinue: (plan: ConfirmedActionPlan) => void;
}) {
  const extracted = useMemo(
    () =>
      extractGeminiFullNotes(meeting?.notes || "", student.name, {
        mentorName,
        meetingDate: meeting?.date || "",
      }),
    [meeting?.notes, meeting?.date, student.name, mentorName],
  );
  const aiDraft = readMeetingAiDraft(meeting?.ai_draft);

  const [studentItems, setStudentItems] = useState<ReviewActionItem[]>(() => {
    if (extracted.hasNextSteps) return extracted.studentActionItems.map(fromExtracted);
    return (aiDraft?.studentActionItems || [])
      .filter((item) => item.task?.trim())
      .map((item) => fromExtracted({ task: item.task, dueDate: item.dueDate || "" }));
  });
  const [mentorItems, setMentorItems] = useState<ReviewActionItem[]>(() => {
    if (extracted.hasNextSteps) return extracted.mentorActionItems.map(fromExtracted);
    return (aiDraft?.mentorActionItems || []).map((task) => fromExtracted(task)).filter((item) => item.task);
  });
  const [unassigned, setUnassigned] = useState<ReviewActionItem[]>(() => {
    if (extracted.hasNextSteps) return extracted.unassignedActionItems.map(fromExtracted);
    return (aiDraft?.unassignedActionItems || []).map((task) => fromExtracted(task)).filter((item) => item.task);
  });
  const [error, setError] = useState("");
  const [bookshelfOpen, setBookshelfOpen] = useState(false);
  const [bookshelfTarget, setBookshelfTarget] = useState<"student" | "mentor">("student");

  const addFromBookshelf = (item: ActionItemBookshelfItem) => {
    const next: ReviewActionItem = {
      ...blankItem(),
      task: item.title,
      description: item.description || "",
      priority: item.priority || "MEDIUM",
      resourceLink: item.resourceLink?.trim() || "",
    };
    if (bookshelfTarget === "mentor") setMentorItems((prev) => [...prev, next]);
    else setStudentItems((prev) => [...prev, next]);
    setBookshelfOpen(false);
  };

  const patch = (
    list: ReviewActionItem[],
    setList: (next: ReviewActionItem[]) => void,
    id: string,
    change: Partial<ReviewActionItem>,
  ) => {
    setList(list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  };

  const move = (from: "student" | "mentor", id: string) => {
    const source = from === "student" ? studentItems : mentorItems;
    const item = source.find((row) => row.id === id);
    if (!item) return;
    if (from === "student") {
      setStudentItems((prev) => prev.filter((row) => row.id !== id));
      setMentorItems((prev) => [...prev, item]);
    } else {
      setMentorItems((prev) => prev.filter((row) => row.id !== id));
      setStudentItems((prev) => [...prev, item]);
    }
  };

  const assign = (id: string, to: "student" | "mentor") => {
    const item = unassigned.find((row) => row.id === id);
    if (!item) return;
    setUnassigned((prev) => prev.filter((row) => row.id !== id));
    if (to === "student") setStudentItems((prev) => [...prev, item]);
    else setMentorItems((prev) => [...prev, item]);
  };

  const continueNext = () => {
    const studentReady = studentItems.filter((item) => item.task.trim());
    const mentorReady = mentorItems.filter((item) => item.task.trim());
    const stillOpen = unassigned.filter((item) => item.task.trim());
    if (stillOpen.length) {
      setError("Assign every item under Needs assignment to the student or the mentor.");
      return;
    }
    if (studentReady.length === 0) {
      setError("Add at least one student action item before continuing.");
      return;
    }
    if ([...studentReady, ...mentorReady].some((item) => !item.dueDate)) {
      setError("Every action item needs a due date. Leave none blank.");
      return;
    }
    setError("");
    onContinue({ student: studentReady, mentor: mentorReady });
  };

  const when = meeting?.date
    ? formatMeetingLocal(meeting.date, { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <Modal open onClose={onClose} size="wide" closeOnBackdrop closeOnEscape>
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Confirm Action Items</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Meeting with {student.name}
              {when ? ` • ${when}` : ""}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section
          tone="student"
          title={`Student: ${firstName(student.name)}`}
          subtitle="Items assigned to the student"
          count={studentItems.length}
          onAdd={() => setStudentItems((prev) => [...prev, blankItem()])}
          onBookshelf={() => {
            setBookshelfTarget("student");
            setBookshelfOpen(true);
          }}
        >
          {studentItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              missingDate={Boolean(error) && item.task.trim() !== "" && !item.dueDate}
              onChange={(change) => patch(studentItems, setStudentItems, item.id, change)}
              onMove={() => move("student", item.id)}
              onDelete={() => setStudentItems((prev) => prev.filter((row) => row.id !== item.id))}
            />
          ))}
        </Section>
        <Section
          tone="mentor"
          title={`Mentor: ${firstName(mentorName || "You")}`}
          subtitle="Items assigned to you"
          count={mentorItems.length}
          onAdd={() => setMentorItems((prev) => [...prev, blankItem()])}
          onBookshelf={() => {
            setBookshelfTarget("mentor");
            setBookshelfOpen(true);
          }}
        >
          {mentorItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              missingDate={Boolean(error) && item.task.trim() !== "" && !item.dueDate}
              onChange={(change) => patch(mentorItems, setMentorItems, item.id, change)}
              onMove={() => move("mentor", item.id)}
              onDelete={() => setMentorItems((prev) => prev.filter((row) => row.id !== item.id))}
            />
          ))}
        </Section>
      </div>

      <section className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Needs assignment</h3>
            <p className="text-xs text-slate-400">Choose who will be responsible and set a due date for each item.</p>
          </div>
        </div>
        {unassigned.length === 0 ? (
          <p className="rounded-xl border border-dashed border-amber-500/20 px-3 py-4 text-center text-xs text-slate-500">
            Nothing is waiting for an owner.
          </p>
        ) : (
          <div className="space-y-2">
            {unassigned.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                  <div className="flex min-w-0 flex-1 gap-2">
                    <GripVertical className="mt-2 h-4 w-4 shrink-0 text-slate-600" />
                    <div className="min-w-0 flex-1">
                      <textarea
                        value={item.task}
                        onChange={(event) => patch(unassigned, setUnassigned, item.id, { task: event.target.value })}
                        rows={2}
                        className="w-full resize-none whitespace-pre-wrap break-words bg-transparent text-sm text-slate-100 outline-none"
                        placeholder="Action item"
                      />
                      <textarea
                        value={item.description}
                        onChange={(event) => patch(unassigned, setUnassigned, item.id, { description: event.target.value })}
                        rows={1}
                        className="mt-1 w-full resize-none bg-transparent text-xs text-slate-400 outline-none"
                        placeholder="Details"
                      />
                      <ResourceLine
                        link={item.resourceLink}
                        onChange={(resourceLink) => patch(unassigned, setUnassigned, item.id, { resourceLink })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Assign to</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="secondary" onClick={() => assign(item.id, "student")}>Student</Button>
                        <Button type="button" size="sm" onClick={() => assign(item.id, "mentor")}>Mentor</Button>
                      </div>
                    </div>
                    <DueField
                      value={item.dueDate}
                      missing={Boolean(error) && !item.dueDate}
                      onChange={(dueDate) => patch(unassigned, setUnassigned, item.id, { dueDate })}
                    />
                    <PrioritySelect
                      value={item.priority}
                      onChange={(priority) => patch(unassigned, setUnassigned, item.id, { priority })}
                    />
                    <button
                      type="button"
                      aria-label="Delete action item"
                      onClick={() => setUnassigned((prev) => prev.filter((row) => row.id !== item.id))}
                      className="mb-0.5 rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
        <Button type="button" onClick={continueNext} className="w-full sm:w-auto">Confirm & Continue</Button>
      </div>

      <ActionItemBookshelfModal
        open={bookshelfOpen}
        onClose={() => setBookshelfOpen(false)}
        onPick={addFromBookshelf}
      />
    </Modal>
  );
}

function Section({
  tone,
  title,
  subtitle,
  count,
  onAdd,
  onBookshelf,
  children,
}: {
  tone: "student" | "mentor";
  title: string;
  subtitle: string;
  count: number;
  onAdd: () => void;
  onBookshelf?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              tone === "student" ? "bg-indigo-500/15 text-indigo-300" : "bg-amber-500/15 text-amber-300",
            )}
          >
            <UserRound className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            tone === "student" ? "bg-indigo-500/15 text-indigo-200" : "bg-amber-500/15 text-amber-200",
          )}
        >
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
      <div className="mt-3 flex flex-wrap gap-3">
        {onBookshelf ? (
          <button
            type="button"
            onClick={onBookshelf}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <Library className="h-3.5 w-3.5" /> Bookshelf
          </button>
        ) : null}
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </div>
    </section>
  );
}

export function CompleteMeetingFlow({
  open,
  title,
  description,
  student,
  meeting,
  mentorName,
  existingActionItems = [],
  onClose,
  onSubmit,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: {
  open: boolean;
  title: string;
  description?: string;
  student: Student;
  meeting?: Meeting;
  mentorName: string;
  existingActionItems?: ActionItem[];
  onClose: () => void;
  onSubmit: (data: CompleteMeetingData) => void | Promise<void>;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}) {
  const [plan, setPlan] = useState<ConfirmedActionPlan | null>(null);
  // Editing or logging an already-completed meeting should show the saved form,
  // not re-run Confirm Action Items (which would drop due dates).
  const needsConfirm = Boolean(meeting && !meeting.completed);

  useEffect(() => {
    if (!open) setPlan(null);
  }, [open]);

  if (!open) return null;

  if (needsConfirm && !plan) {
    return (
      <ConfirmActionItemsModal
        student={student}
        meeting={meeting}
        mentorName={mentorName}
        onClose={onClose}
        onContinue={setPlan}
      />
    );
  }

  const meetingItems = meeting?.id
    ? existingActionItems.filter((item) => {
        const byMeeting =
          item.meeting_id === meeting.id ||
          (item as { meetingId?: string }).meetingId === meeting.id;
        const byCreated = Boolean(meeting.actionItemsCreated?.includes(item.id));
        return byMeeting || byCreated;
      })
    : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      size="wide"
      fullHeight
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
    >
      <CompleteMeetingForm
        student={student}
        meeting={meeting}
        embedded
        existingActionItems={meetingItems}
        confirmedPlan={
          plan
            ? {
                student: plan.student.map(({ task, description, dueDate, priority, resourceLink }) => ({
                  task,
                  description,
                  dueDate,
                  priority,
                  resourceLink,
                })),
                mentor: plan.mentor.map(({ task, description, dueDate, priority, resourceLink }) => ({
                  task,
                  description,
                  dueDate,
                  priority,
                  resourceLink,
                })),
              }
            : undefined
        }
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

function ItemCard({
  item,
  missingDate,
  onChange,
  onMove,
  onDelete,
}: {
  item: ReviewActionItem;
  missingDate?: boolean;
  onChange: (change: Partial<ReviewActionItem>) => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 gap-2">
          <GripVertical className="mt-2 h-4 w-4 shrink-0 text-slate-600" />
          <div className="min-w-0 flex-1">
            <textarea
              value={item.task}
              onChange={(event) => onChange({ task: event.target.value })}
              rows={2}
              className="w-full resize-none whitespace-pre-wrap break-words bg-transparent text-sm leading-snug text-slate-100 outline-none"
              placeholder="Action item"
            />
            <textarea
              value={item.description}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={1}
              className="mt-1 w-full resize-none bg-transparent text-xs text-slate-400 outline-none"
              placeholder="Details"
            />
            <ResourceLine link={item.resourceLink} onChange={(resourceLink) => onChange({ resourceLink })} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <DueField value={item.dueDate} missing={missingDate} onChange={(dueDate) => onChange({ dueDate })} />
          <PrioritySelect value={item.priority} onChange={(priority) => onChange({ priority })} />
          <button
            type="button"
            aria-label="Move to the other person"
            onClick={onMove}
            className="mb-0.5 rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete action item"
            onClick={onDelete}
            className="mb-0.5 rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
