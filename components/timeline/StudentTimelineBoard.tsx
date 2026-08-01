"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Milestone,
  Student,
  TimelineBookshelfItem,
  TimelineCardColors,
  TimelineCardType,
  TimelineResourceLink,
} from "@/lib/types";
import { DEFAULT_TIMELINE_CARD_COLORS } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DatePicker } from "@/components/ui/DatePicker";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { cn } from "@/lib/utils/cn";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useSyncMilestones,
} from "@/lib/hooks/useMilestones";
import { studentsApi } from "@/lib/api/students";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { useAuth } from "@/lib/hooks/useAuth";

export type TimelineBoardMode = "student" | "mentor";

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthRange(start?: string | null, end?: string | null): string[] {
  const now = new Date();
  const fallbackStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let s = start || fallbackStart;
  let e = end;
  if (!e) {
    const [y, m] = s.split("-").map(Number);
    const endDate = new Date(y, m - 1 + 11, 1);
    e = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
  }
  const [sy, sm] = s.split("-").map(Number);
  const [ey, em] = e.split("-").map(Number);
  let cursor = new Date(sy, sm - 1, 1);
  const last = new Date(ey, em - 1, 1);
  if (cursor > last) {
    const tmp = s;
    s = e;
    e = tmp;
    cursor = new Date(ey, em - 1, 1);
  }
  const out: string[] = [];
  const endCursor = new Date(e.split("-").map(Number)[0], e.split("-").map(Number)[1] - 1, 1);
  while (cursor <= endCursor && out.length < 48) {
    out.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

function toMonthInputValue(yyyyMm: string) {
  return yyyyMm || "";
}

const CARD_TYPE_OPTIONS: { value: TimelineCardType; label: string }[] = [
  { value: "Meeting", label: "Meeting" },
  { value: "Milestone", label: "Milestone" },
  { value: "Task", label: "Task" },
  { value: "Other", label: "Other" },
];

export interface StudentTimelineBoardProps {
  student: Student;
  mode: TimelineBoardMode;
  cardColors?: TimelineCardColors;
  showBookshelf?: boolean;
  bookshelfItems?: TimelineBookshelfItem[];
  /** Preferred month for bookshelf insert (e.g. first open / current) */
  onOpenBookshelf?: (preferredMonth?: string) => void;
  onInsertFromBookshelf?: (item: TimelineBookshelfItem, month: string) => void;
}

type CardFormState = {
  title: string;
  cardType: TimelineCardType;
  description: string;
  resourceLinks: TimelineResourceLink[];
  targetDate: string;
  month: string;
};

const emptyForm = (month: string): CardFormState => ({
  title: "",
  cardType: "Milestone",
  description: "",
  resourceLinks: [],
  targetDate: "",
  month,
});

function TimelineCardView({
  milestone,
  color,
  canDelete,
  canEdit,
  onToggle,
  onEdit,
  onDelete,
  dragHandleProps,
  style,
  isOverlay,
}: {
  milestone: Milestone;
  color: string;
  canDelete: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
  style?: React.CSSProperties;
  isOverlay?: boolean;
}) {
  const done = milestone.status === "Completed";
  const type = (milestone.cardType || "Milestone") as TimelineCardType;
  const targetLabel = milestone.targetDate
    ? new Date(milestone.targetDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      style={style}
      className={cn(
        "group relative rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5",
        isOverlay && "border-indigo-500/40 shadow-xl shadow-black/50",
        done && "opacity-80",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded-md p-0.5 text-slate-600 opacity-40 hover:opacity-100 hover:text-slate-300 active:cursor-grabbing"
          aria-label="Drag card"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-wide" style={{ color }}>
              {type}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-indigo-300"
                  aria-label="Edit card"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-rose-950/50 hover:text-rose-400"
                  aria-label="Delete card"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onToggle}
                className={cn(
                  "cursor-pointer rounded-lg p-1.5",
                  done
                    ? "text-emerald-400 hover:bg-emerald-500/10"
                    : "text-slate-500 hover:bg-slate-800 hover:text-emerald-300",
                )}
                aria-label={done ? "Mark as ongoing" : "Mark as completed"}
                title={done ? "Mark as ongoing" : "Mark as completed"}
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <span
                className={cn(
                  "ml-0.5 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 bg-slate-950/70 text-slate-300",
                )}
              >
                {done ? "Completed" : "Ongoing"}
              </span>
            </div>
          </div>

          <h4
            className={cn(
              "mt-2 text-base font-semibold leading-snug tracking-tight sm:text-[17px]",
              done ? "text-slate-400 line-through decoration-slate-600" : "text-white",
            )}
          >
            {milestone.title}
          </h4>

          {targetLabel && (
            <p className="mt-1.5 text-[13px] text-slate-500">
              Target date · {targetLabel}
            </p>
          )}

          {milestone.description ? (
            <p className="mt-2.5 text-[13px] leading-relaxed text-slate-400">
              {milestone.description}
            </p>
          ) : null}

          {(milestone.resourceLinks || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(milestone.resourceLinks || []).map((link, i) => (
                <a
                  key={`${link.url}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-indigo-300 hover:text-indigo-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 opacity-70" />
                  {link.label || "Resource"}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableTimelineCard(props: {
  milestone: Milestone;
  color: string;
  canDelete: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.milestone.id,
    data: { type: "card", milestone: props.milestone },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <TimelineCardView {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function MonthSection({
  month,
  open,
  onToggle,
  primaryGoal,
  canEditGoal,
  onSaveGoal,
  children,
  onAdd,
  isCurrent,
  isLast,
}: {
  month: string;
  open: boolean;
  onToggle: () => void;
  primaryGoal?: string;
  canEditGoal: boolean;
  onSaveGoal: (goal: string) => void;
  children: React.ReactNode;
  onAdd: () => void;
  isCurrent: boolean;
  isLast?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `month:${month}`, data: { month } });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(primaryGoal || "");

  useEffect(() => {
    setGoalDraft(primaryGoal || "");
  }, [primaryGoal]);

  return (
    <div
      ref={setNodeRef}
      className={cn("relative pl-10 sm:pl-12", isOver && "rounded-2xl bg-indigo-500/[0.04]")}
    >
      {/* Bridge space-y-8 (32px) + next node center (14px) */}
      {!isLast && (
        <div className="pointer-events-none absolute bottom-[-46px] left-[13px] top-[14px] w-px bg-slate-800" />
      )}
      <div
        className={cn(
          "absolute left-[13px] top-2 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2",
          isCurrent
            ? "border-indigo-400 bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
            : "border-slate-600 bg-slate-950",
        )}
      />

      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-start justify-between gap-3 py-1 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              {monthLabel(month)}
            </h3>
            {isCurrent && (
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                Current month
              </span>
            )}
          </div>
          {!editingGoal && (
            <p className="mt-1.5 text-sm leading-snug text-slate-400">
              {primaryGoal ? (
                <>
                  <span className="text-slate-500">Primary goal: </span>
                  {primaryGoal}
                </>
              ) : canEditGoal ? (
                <span className="text-slate-600">No primary goal set</span>
              ) : null}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-1.5 h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-3 pb-6">
          {canEditGoal && (
            <div>
              {editingGoal ? (
                <div className="flex flex-col gap-2 sm:max-w-xl sm:flex-row">
                  <Input
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    placeholder="Primary goal for this month…"
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onSaveGoal(goalDraft.trim());
                        setEditingGoal(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingGoal(true)}
                  className="cursor-pointer text-xs font-medium text-indigo-300 hover:text-indigo-200"
                >
                  {primaryGoal ? "Edit primary goal" : "Add primary goal"}
                </button>
              )}
            </div>
          )}
          {children}
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Add card
          </button>
        </div>
      )}
    </div>
  );
}

export function StudentTimelineBoard({
  student,
  mode,
  cardColors = DEFAULT_TIMELINE_CARD_COLORS,
  showBookshelf = false,
  onOpenBookshelf,
}: StudentTimelineBoardProps) {
  const { user } = useAuth();
  const studentId = student.id;
  const queryClient = useQueryClient();
  const { data: milestones = [], isLoading } = useMilestones(studentId);
  const createMilestone = useCreateMilestone(studentId);
  const updateMilestone = useUpdateMilestone(studentId);
  const deleteMilestone = useDeleteMilestone(studentId);
  const syncMilestones = useSyncMilestones(studentId);

  const canManageRange = mode === "mentor";
  const [timelineStart, setTimelineStart] = useState(
    student.timelineStart || student.profile?.timeline_start || "",
  );
  const [timelineEnd, setTimelineEnd] = useState(
    student.timelineEnd || student.profile?.timeline_end || "",
  );
  const [monthGoals, setMonthGoals] = useState<Record<string, string>>(
    student.timelineMonthGoals || student.profile?.timeline_month_goals || {},
  );
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardModal, setCardModal] = useState<{
    mode: "create" | "edit";
    id?: string;
    form: CardFormState;
  } | null>(null);
  const [savingRange, setSavingRange] = useState(false);

  useEffect(() => {
    setTimelineStart(student.timelineStart || student.profile?.timeline_start || "");
    setTimelineEnd(student.timelineEnd || student.profile?.timeline_end || "");
    setMonthGoals(student.timelineMonthGoals || student.profile?.timeline_month_goals || {});
  }, [
    student.timelineStart,
    student.timelineEnd,
    student.timelineMonthGoals,
    student.profile?.timeline_start,
    student.profile?.timeline_end,
    student.profile?.timeline_month_goals,
  ]);

  const months = useMemo(
    () => buildMonthRange(timelineStart || null, timelineEnd || null),
    [timelineStart, timelineEnd],
  );

  const byMonth = useMemo(() => {
    const map: Record<string, Milestone[]> = {};
    for (const m of months) map[m] = [];
    for (const card of milestones) {
      if (!map[card.month]) map[card.month] = [];
      map[card.month].push(card);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return map;
  }, [milestones, months]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeCard = milestones.find((m) => m.id === activeId) || null;
  const nowKey = currentMonthKey();

  const canDeleteCard = (m: Milestone) => {
    if (mode === "mentor") return true;
    if (m.createdBy) return m.createdBy === user?.id;
    return Boolean(m.isCustom);
  };

  const canEditCard = (m: Milestone) => {
    if (mode === "mentor") return true;
    if (m.createdBy) return m.createdBy === user?.id;
    return Boolean(m.isCustom);
  };

  const persistRange = async (start: string, end: string, goals?: Record<string, string>) => {
    setSavingRange(true);
    try {
      await studentsApi.update(studentId, {
        timelineStart: start || null,
        timelineEnd: end || null,
        timelineMonthGoals: goals ?? monthGoals,
      } as Partial<Student>);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save timeline range");
    } finally {
      setSavingRange(false);
    }
  };

  const toggleMonth = (month: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const handleSaveCard = async () => {
    if (!cardModal) return;
    const { form, mode: formMode, id } = cardModal;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (formMode === "create") {
        await createMilestone.mutateAsync({
          title: form.title.trim(),
          month: form.month,
          cardType: form.cardType,
          description: form.description,
          resourceLinks: form.resourceLinks.filter((r) => r.url.trim()),
          targetDate: form.targetDate || null,
          status: "Planned",
          isCustom: true,
        });
        toast.success("Card added");
        setOpenMonths((prev) => new Set(prev).add(form.month));
      } else if (id) {
        await updateMilestone.mutateAsync({
          id,
          updates: {
            title: form.title.trim(),
            month: form.month,
            cardType: form.cardType,
            description: form.description,
            resourceLinks: form.resourceLinks.filter((r) => r.url.trim()),
            targetDate: form.targetDate || null,
          },
        });
        toast.success("Card updated");
      }
      setCardModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save card");
    }
  };

  const findContainer = (id: string) => {
    if (id.startsWith("month:")) return id.replace("month:", "");
    const card = milestones.find((m) => m.id === id);
    return card?.month;
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragOver = (_event: DragOverEvent) => {
    /* visual only via isOver */
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeCardId = String(active.id);
    const fromMonth = findContainer(activeCardId);
    let toMonth = findContainer(String(over.id));
    if (String(over.id).startsWith("month:")) {
      toMonth = String(over.id).replace("month:", "");
    }
    if (!fromMonth || !toMonth) return;

    const fromList = [...(byMonth[fromMonth] || [])];
    const toList = fromMonth === toMonth ? fromList : [...(byMonth[toMonth] || [])];
    const fromIndex = fromList.findIndex((c) => c.id === activeCardId);
    if (fromIndex < 0) return;

    let overIndex = toList.findIndex((c) => c.id === String(over.id));
    if (overIndex < 0) overIndex = toList.length;

    const moved = fromList[fromIndex];
    const patches: Array<{ id: string; month: string; sortOrder: number }> = [];

    if (fromMonth === toMonth) {
      const reordered = arrayMove(fromList, fromIndex, overIndex);
      reordered.forEach((c, i) => patches.push({ id: c.id, month: fromMonth, sortOrder: i }));
    } else {
      fromList.splice(fromIndex, 1);
      toList.splice(overIndex, 0, { ...moved, month: toMonth });
      fromList.forEach((c, i) => patches.push({ id: c.id, month: fromMonth, sortOrder: i }));
      toList.forEach((c, i) => patches.push({ id: c.id, month: toMonth, sortOrder: i }));
      setOpenMonths((prev) => new Set(prev).add(toMonth!));
    }

    try {
      await syncMilestones.mutateAsync(patches);
    } catch (err: any) {
      toast.error(err?.message || "Failed to move card");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Application Roadmap
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            Month-by-month plan with meetings, milestones, tasks, and resources.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showBookshelf && onOpenBookshelf && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<BookOpen className="h-3.5 w-3.5" />}
              onClick={() => {
                const preferred =
                  Array.from(openMonths)[0] || nowKey || months[0];
                onOpenBookshelf(preferred);
              }}
            >
              Preset Bookshelf
            </Button>
          )}
        </div>
      </div>

      {canManageRange && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Timeline range</p>
              <p className="text-xs text-slate-500">Months shown on this roadmap.</p>
            </div>
            <Button
              type="button"
              size="sm"
              isLoading={savingRange}
              onClick={() => void persistRange(timelineStart, timelineEnd)}
              leftIcon={<Calendar className="h-3.5 w-3.5" />}
            >
              Apply
            </Button>
          </div>
          <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Start">
              <MonthPicker
                value={toMonthInputValue(timelineStart)}
                onChange={setTimelineStart}
                placeholder="Start month"
                allowClear={false}
              />
            </FormField>
            <FormField label="End">
              <MonthPicker
                value={toMonthInputValue(timelineEnd)}
                onChange={setTimelineEnd}
                placeholder="End month"
                allowClear={false}
                min={timelineStart || undefined}
              />
            </FormField>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          <p className="text-sm text-slate-500">Loading timeline…</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="relative space-y-8">
            {months.map((month, index) => {
              const cards = byMonth[month] || [];
              const open = openMonths.has(month);
              return (
                <MonthSection
                  key={month}
                  month={month}
                  open={open}
                  onToggle={() => toggleMonth(month)}
                  primaryGoal={monthGoals[month]}
                  canEditGoal={canManageRange}
                  isCurrent={month === nowKey}
                  isLast={index === months.length - 1}
                  onSaveGoal={async (goal) => {
                    const next = { ...monthGoals, [month]: goal };
                    if (!goal) delete next[month];
                    setMonthGoals(next);
                    await persistRange(timelineStart, timelineEnd, next);
                    toast.success("Primary goal saved");
                  }}
                  onAdd={() => {
                    setOpenMonths((prev) => new Set(prev).add(month));
                    setCardModal({ mode: "create", form: emptyForm(month) });
                  }}
                >
                  <SortableContext
                    items={cards.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {cards.length === 0 ? (
                        <p className="text-sm text-slate-600">No cards this month yet.</p>
                      ) : (
                        cards.map((card) => (
                          <SortableTimelineCard
                            key={card.id}
                            milestone={card}
                            color={
                              cardColors[(card.cardType || "Milestone") as TimelineCardType] ||
                              DEFAULT_TIMELINE_CARD_COLORS.Milestone
                            }
                            canDelete={canDeleteCard(card)}
                            canEdit={canEditCard(card)}
                            onToggle={async () => {
                              try {
                                await updateMilestone.mutateAsync({
                                  id: card.id,
                                  updates: {
                                    status:
                                      card.status === "Completed" ? "Planned" : "Completed",
                                  },
                                });
                              } catch (err: any) {
                                toast.error(err?.message || "Failed to update");
                              }
                            }}
                            onEdit={() =>
                              setCardModal({
                                mode: "edit",
                                id: card.id,
                                form: {
                                  title: card.title,
                                  cardType: (card.cardType || "Milestone") as TimelineCardType,
                                  description: card.description || "",
                                  resourceLinks: [...(card.resourceLinks || [])],
                                  targetDate: card.targetDate || "",
                                  month: card.month,
                                },
                              })
                            }
                            onDelete={async () => {
                              if (!window.confirm(`Delete “${card.title}”?`)) return;
                              try {
                                await deleteMilestone.mutateAsync(card.id);
                                toast.success("Card deleted");
                              } catch (err: any) {
                                toast.error(err?.message || "Failed to delete");
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </MonthSection>
              );
            })}
          </div>
          <DragOverlay>
            {activeCard ? (
              <TimelineCardView
                milestone={activeCard}
                color={
                  cardColors[(activeCard.cardType || "Milestone") as TimelineCardType] ||
                  DEFAULT_TIMELINE_CARD_COLORS.Milestone
                }
                canDelete={false}
                canEdit={false}
                onToggle={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        open={!!cardModal}
        onClose={() => setCardModal(null)}
        title={cardModal?.mode === "edit" ? "Edit card" : "Add card"}
        size="lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCardModal(null)}>
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              onClick={() => void handleSaveCard()}
              isLoading={createMilestone.isPending || updateMilestone.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        {cardModal && (
          <div className="space-y-4">
            <FormField label="Type" required>
              <SelectMenu
                value={cardModal.form.cardType}
                onChange={(v) =>
                  setCardModal({
                    ...cardModal,
                    form: { ...cardModal.form, cardType: v as TimelineCardType },
                  })
                }
                options={CARD_TYPE_OPTIONS}
              />
            </FormField>
            <FormField label="Title" required>
              <Input
                value={cardModal.form.title}
                onChange={(e) =>
                  setCardModal({
                    ...cardModal,
                    form: { ...cardModal.form, title: e.target.value },
                  })
                }
                placeholder="e.g. Request letters of recommendation"
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={cardModal.form.description}
                onChange={(e) =>
                  setCardModal({
                    ...cardModal,
                    form: { ...cardModal.form, description: e.target.value },
                  })
                }
                placeholder="Why it matters, notes…"
                className="min-h-[90px]"
              />
            </FormField>
            <FormField label="Target date">
              <DatePicker
                value={cardModal.form.targetDate}
                onChange={(d) =>
                  setCardModal({
                    ...cardModal,
                    form: { ...cardModal.form, targetDate: d },
                  })
                }
              />
            </FormField>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Resource links</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setCardModal({
                      ...cardModal,
                      form: {
                        ...cardModal.form,
                        resourceLinks: [
                          ...cardModal.form.resourceLinks,
                          { label: "", url: "" },
                        ],
                      },
                    })
                  }
                >
                  Add link
                </Button>
              </div>
              {cardModal.form.resourceLinks.length === 0 ? (
                <p className="text-xs text-slate-500">No resource links yet.</p>
              ) : (
                cardModal.form.resourceLinks.map((link, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...cardModal.form.resourceLinks];
                        next[index] = { ...next[index], label: e.target.value };
                        setCardModal({
                          ...cardModal,
                          form: { ...cardModal.form, resourceLinks: next },
                        });
                      }}
                    />
                    <Input
                      placeholder="https://…"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...cardModal.form.resourceLinks];
                        next[index] = { ...next[index], url: e.target.value };
                        setCardModal({
                          ...cardModal,
                          form: { ...cardModal.form, resourceLinks: next },
                        });
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const next = cardModal.form.resourceLinks.filter((_, i) => i !== index);
                        setCardModal({
                          ...cardModal,
                          form: { ...cardModal.form, resourceLinks: next },
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
