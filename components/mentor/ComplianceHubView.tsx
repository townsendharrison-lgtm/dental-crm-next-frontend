"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import {
  formatMeetingLocal,
  isUpcomingMeetingDate,
  parseLocalDate,
} from "@/lib/utils/dateUtils";
import type { ActionItem, Meeting, Mentor, Student } from "@/lib/types";
import type {
  MentorComplianceRow,
  OperationalAlert,
  PriorityInsight,
} from "@/lib/utils/mentorCompliance";

interface ComplianceHubViewProps {
  summary: {
    critical: MentorComplianceRow[];
    atRisk: MentorComplianceRow[];
    compliant: MentorComplianceRow[];
    slaBreaches: MentorComplianceRow[];
    avgCompliance: number;
    totalMentors: number;
  };
  insights: PriorityInsight[];
  alerts: OperationalAlert[];
  rows: MentorComplianceRow[];
  students: Student[];
  mentors: Mentor[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  unassignedCount: number;
  onOpenChat: (mentorId: string) => void;
  onSendNudge: (mentorId: string, mentorName: string, reason?: string) => void;
  onAuditMentor: (mentorId: string) => void;
  mentorsHref?: string;
  nudgesHref?: string;
  slaHref?: string;
  scheduleHref?: string;
  tasksHref?: string;
}

type StudentAlertRow = {
  id: string;
  name: string;
  mentorName: string;
  meta?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isShellStudent(s: Student) {
  return !!s.email?.toLowerCase().endsWith("@school-selection.local");
}

function mentorNameOf(s: Student, mentors: Mentor[]) {
  const mid = s.mentorId || s.profile?.mentor_id;
  const mentor =
    mentors.find((m) => m.id === mid) ||
    mentors.find((m) => (m.studentIds || []).includes(s.id));
  return mentor?.name?.trim() || mentor?.email || "Unassigned";
}

function meetingStudentId(m: Meeting) {
  return m.student_id || m.studentId || "";
}

function hasUpcomingMeeting(studentId: string, meetings: Meeting[], now = new Date()) {
  return meetings.some(
    (m) =>
      meetingStudentId(m) === studentId &&
      !m.completed &&
      isUpcomingMeetingDate(m.date, now),
  );
}

function lastCompletedMeetingMs(studentId: string, meetings: Meeting[]) {
  let latest = Number.NEGATIVE_INFINITY;
  for (const m of meetings) {
    if (meetingStudentId(m) !== studentId || !m.completed) continue;
    try {
      const ms = parseLocalDate(m.date).getTime();
      if (Number.isFinite(ms) && ms > latest) latest = ms;
    } catch {
      /* ignore */
    }
  }
  return Number.isFinite(latest) ? latest : null;
}

function contactMsOf(s: Student) {
  const raw =
    s.lastContactDate ||
    s.profile?.last_contact_date ||
    s.lastMeetingDate ||
    s.profile?.last_meeting_date ||
    null;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function daysBetween(fromMs: number) {
  return Math.max(0, Math.floor((Date.now() - fromMs) / DAY_MS));
}

function dueDateOf(t: ActionItem) {
  return t.due_date || t.dueDate || "";
}

function studentIdOfTask(t: ActionItem) {
  return t.student_id || t.studentId || "";
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function AlertCohortCard({
  title,
  count,
  tone,
  items,
  empty,
  action,
}: {
  title: string;
  count: number;
  tone: "rose" | "amber" | "indigo";
  items: StudentAlertRow[];
  empty: string;
  action?: React.ReactNode;
}) {
  const wrap =
    tone === "rose"
      ? "border-rose-500/20 bg-rose-500/5 shadow-[0_0_24px_-12px_rgba(244,63,94,0.35)]"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/5 shadow-[0_0_24px_-12px_rgba(245,158,11,0.35)]"
        : "border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_24px_-12px_rgba(99,102,241,0.35)]";
  const countCls =
    tone === "rose" ? "text-rose-400" : tone === "amber" ? "text-amber-400" : "text-indigo-300";

  return (
    <div className={cn("flex flex-col rounded-2xl border p-5", wrap)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn("text-3xl font-black tabular-nums tracking-tight", countCls)}>
            {count}
          </p>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
        </div>
        {action}
      </div>
      <div className="mt-4 max-h-56 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs italic text-slate-600">{empty}</p>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"
            >
              <p className="truncate text-sm font-semibold text-white">{s.name}</p>
              <p className="truncate text-[11px] text-slate-500">Mentor: {s.mentorName}</p>
              {s.meta ? (
                <p className="mt-0.5 text-[10px] font-medium text-slate-600">{s.meta}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const tagTone: Record<PriorityInsight["tagTone"], string> = {
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
};

export default function ComplianceHubView({
  summary,
  insights,
  alerts,
  rows,
  students,
  mentors,
  meetings,
  actionItems,
  unassignedCount,
  onOpenChat,
  onSendNudge,
  onAuditMentor,
  mentorsHref = "/mentor-manager/mentors",
  nudgesHref = "/mentor-manager/alerts",
  slaHref = "/mentor-manager/reporting",
  scheduleHref = "/mentor-manager/schedule",
  tasksHref = "/mentor-manager/tasks",
}: ComplianceHubViewProps) {
  const router = useRouter();
  const [scheduleTab, setScheduleTab] = useState<"weekly" | "upcoming">("weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  usePageHeaderAction({
    label: "Manage Assignments",
    icon: <LayoutGrid className="h-4 w-4" />,
    onClick: () => router.push(`${mentorsHref}?view=assignments`),
  });

  const topRisk = [...rows]
    .filter((r) => r.band !== "compliant")
    .sort((a, b) => a.complianceScore - b.complianceScore)
    .slice(0, 6);

  const unassignedStudents = useMemo(
    () =>
      students
        .filter((s) => {
          if (isShellStudent(s)) return false;
          return !(s.mentorId || s.profile?.mentor_id);
        })
        .map((s) => ({
          id: s.id,
          name: s.name || "Unnamed student",
          mentorName: mentorNameOf(s, mentors),
          meta: undefined as string | undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, mentors],
  );

  const studentAlerts = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = Date.now() - 30 * DAY_MS;
    const fortyFiveDaysAgo = Date.now() - 45 * DAY_MS;
    const monitored = students.filter((s) => !isShellStudent(s));

    const noNextMeeting = monitored
      .filter((s) => !hasUpcomingMeeting(s.id, meetings, now))
      .map((s) => {
        const last = lastCompletedMeetingMs(s.id, meetings);
        return {
          id: s.id,
          name: s.name || "Unnamed student",
          mentorName: mentorNameOf(s, mentors),
          meta: last != null ? `${daysBetween(last)}d since last meeting` : "Never met",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const noContactOneMonth = monitored
      .filter((s) => {
        const lastContact = contactMsOf(s);
        const lastCompleted = lastCompletedMeetingMs(s.id, meetings);
        const last = Math.max(
          lastContact ?? Number.NEGATIVE_INFINITY,
          lastCompleted ?? Number.NEGATIVE_INFINITY,
        );
        if (!Number.isFinite(last) || last === Number.NEGATIVE_INFINITY) return true;
        return last < thirtyDaysAgo;
      })
      .map((s) => {
        const lastContact = contactMsOf(s);
        const lastCompleted = lastCompletedMeetingMs(s.id, meetings);
        const last = Math.max(
          lastContact ?? Number.NEGATIVE_INFINITY,
          lastCompleted ?? Number.NEGATIVE_INFINITY,
        );
        const days =
          Number.isFinite(last) && last !== Number.NEGATIVE_INFINITY
            ? daysBetween(last)
            : null;
        return {
          id: s.id,
          name: s.name || "Unnamed student",
          mentorName: mentorNameOf(s, mentors),
          meta: days != null ? `${days}d since contact` : "No contact logged",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const noMeetingOneAndHalfMonth = monitored
      .filter((s) => {
        const last = lastCompletedMeetingMs(s.id, meetings);
        if (last == null) return true;
        return last < fortyFiveDaysAgo;
      })
      .map((s) => {
        const last = lastCompletedMeetingMs(s.id, meetings);
        return {
          id: s.id,
          name: s.name || "Unnamed student",
          mentorName: mentorNameOf(s, mentors),
          meta: last != null ? `${daysBetween(last)}d since meeting` : "Never completed",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { noNextMeeting, noContactOneMonth, noMeetingOneAndHalfMonth };
  }, [students, mentors, meetings]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  React.useEffect(() => {
    if (scheduleTab !== "weekly") return;
    const stillInWeek = weekDays.some(
      (d) => d.toDateString() === selectedDate.toDateString(),
    );
    if (!stillInWeek) setSelectedDate(weekDays[0]);
  }, [weekDays, scheduleTab, selectedDate]);

  const weekMeetings = useMemo(() => {
    const start = weekDays[0].getTime();
    const end = new Date(weekDays[6]);
    end.setHours(23, 59, 59, 999);
    const endMs = end.getTime();
    return meetings.filter((m) => {
      if (m.completed) return false;
      try {
        const t = parseLocalDate(m.date).getTime();
        return t >= start && t <= endMs;
      } catch {
        return false;
      }
    });
  }, [meetings, weekDays]);

  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    return [...meetings]
      .filter((m) => !m.completed && isUpcomingMeetingDate(m.date, now))
      .sort(
        (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      )
      .slice(0, 12);
  }, [meetings]);

  const dayMeetings = useMemo(() => {
    return weekMeetings
      .filter((m) => parseLocalDate(m.date).toDateString() === selectedDate.toDateString())
      .sort(
        (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      );
  }, [weekMeetings, selectedDate]);

  const activeTasks = useMemo(() => {
    return actionItems
      .filter((t) => {
        const status = (t.status || "").toUpperCase();
        return status !== "COMPLETED" && status !== "DONE";
      })
      .sort((a, b) => {
        const ad = dueDateOf(a) ? parseLocalDate(dueDateOf(a)).getTime() : Number.POSITIVE_INFINITY;
        const bd = dueDateOf(b) ? parseLocalDate(dueDateOf(b)).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
  }, [actionItems]);

  const resolveStudentName = (id: string) =>
    students.find((s) => s.id === id)?.name || "Student";

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Stats: Unassigned + contact/meeting alerts */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AlertCohortCard
          title="Unassigned"
          count={unassignedCount}
          tone="indigo"
          empty="No students waiting for a mentor pairing."
          items={unassignedStudents}
          action={
            <Link href={`${mentorsHref}?view=assignments&group=unassigned`}>
              <Button
                size="sm"
                variant="outline"
                className="border-indigo-500/30 bg-indigo-600/15 text-indigo-200 hover:bg-indigo-600/25 hover:text-indigo-100"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                View
              </Button>
            </Link>
          }
        />
        <AlertCohortCard
          title="No next meeting scheduled"
          count={studentAlerts.noNextMeeting.length}
          tone="rose"
          empty="All students have a next meeting"
          items={studentAlerts.noNextMeeting}
        />
        <AlertCohortCard
          title="No contact in >1 month"
          count={studentAlerts.noContactOneMonth.length}
          tone="amber"
          empty="No stale contact alerts"
          items={studentAlerts.noContactOneMonth}
        />
        <AlertCohortCard
          title="No meeting in >1.5 months"
          count={studentAlerts.noMeetingOneAndHalfMonth.length}
          tone="rose"
          empty="No meeting-gap alerts"
          items={studentAlerts.noMeetingOneAndHalfMonth}
        />
      </section>

      {/* Weekly schedule + Active tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20 sm:p-6 lg:col-span-2">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white">
                  {scheduleTab === "weekly" ? "Weekly Schedule" : "Upcoming Meetings"}
                </h3>
                {scheduleTab === "weekly" && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {weekDays[0].toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    –{" "}
                    {weekDays[6].toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => setScheduleTab("weekly")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    scheduleTab === "weekly"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleTab("upcoming")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    scheduleTab === "upcoming"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  Upcoming
                </button>
              </div>
              {scheduleTab === "weekly" && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setWeekOffset((p) => p - 1)}
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setWeekOffset((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {scheduleTab === "weekly" ? (
            <>
              <div className="mb-4 grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const hasEvents = weekMeetings.some(
                    (m) => parseLocalDate(m.date).toDateString() === day.toDateString(),
                  );
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "flex flex-col items-center rounded-xl p-2 transition-colors",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-800 bg-slate-950 hover:border-slate-700",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[9px] font-semibold uppercase tracking-wider",
                          isSelected
                            ? "text-indigo-100"
                            : isToday
                              ? "text-indigo-400"
                              : "text-slate-500",
                        )}
                      >
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isSelected
                            ? "text-white"
                            : isToday
                              ? "text-indigo-400"
                              : "text-slate-300",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      {hasEvents && (
                        <span
                          className={cn(
                            "mt-1 h-1 w-1 rounded-full",
                            isSelected ? "bg-white" : "bg-indigo-500",
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-0.5">
                {dayMeetings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
                    <p className="text-sm text-slate-500">No meetings on this day.</p>
                  </div>
                ) : (
                  dayMeetings.map((meeting) => {
                    const mDate = parseLocalDate(meeting.date);
                    const sid = meetingStudentId(meeting);
                    const studentName = sid ? resolveStudentName(sid) : "Group / General";
                    return (
                      <div
                        key={meeting.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition-colors hover:border-indigo-500/40"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-indigo-200 shadow-inner">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/80 leading-none">
                              {mDate.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className="mt-1 text-xl font-semibold leading-none text-white tabular-nums">
                              {mDate.getDate()}
                            </span>
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">
                                {meeting.title || "Mentorship Session"}
                              </p>
                              <Badge className="border-indigo-500/20 bg-indigo-500/10 text-[9px] text-indigo-300">
                                Meeting
                              </Badge>
                            </div>
                            <p className="truncate text-xs text-slate-500">
                              {formatMeetingLocal(meeting.date, {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZoneName: "short",
                              })}{" "}
                              · {studentName}
                            </p>
                          </div>
                        </div>
                        <Link href={scheduleHref}>
                          <Button size="sm" variant="secondary">
                            Open
                          </Button>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="max-h-[400px] space-y-2.5 overflow-y-auto">
              {upcomingMeetings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
                  <p className="text-sm text-slate-500">No upcoming meetings.</p>
                </div>
              ) : (
                upcomingMeetings.map((meeting) => {
                  const mDate = parseLocalDate(meeting.date);
                  const sid = meetingStudentId(meeting);
                  const studentName = sid ? resolveStudentName(sid) : "Group / General";
                  return (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10">
                          <span className="text-[10px] font-semibold uppercase text-indigo-300/80">
                            {mDate.toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                          <span className="mt-1 text-xl font-semibold text-white tabular-nums">
                            {mDate.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {meeting.title || "Mentorship Session"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {formatMeetingLocal(meeting.date, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              timeZoneName: "short",
                            })}{" "}
                            · {studentName}
                          </p>
                        </div>
                      </div>
                      <Link href={scheduleHref}>
                        <Button size="sm" variant="secondary">
                          Open
                        </Button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-[2rem] border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white">
                  Active Tasks
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {activeTasks.length} pending
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[380px] flex-1 space-y-2 overflow-y-auto">
            {activeTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8" />}
                title="All caught up"
                description="No open tasks. Create one or check View all tasks."
              />
            ) : (
              activeTasks.slice(0, 12).map((task) => {
                const due = dueDateOf(task);
                const sid = studentIdOfTask(task);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <p className="truncate text-sm font-medium text-white">{task.task}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          "text-[9px]",
                          task.priority === "HIGH"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                            : task.priority === "MEDIUM"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : "border-slate-700 bg-slate-800 text-slate-400",
                        )}
                      >
                        {task.priority || "MEDIUM"}
                      </Badge>
                      {due ? (
                        <span className="text-[10px] text-slate-500">
                          Due{" "}
                          {parseLocalDate(due).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : null}
                      {sid ? (
                        <span className="truncate text-[10px] text-slate-500">
                          {resolveStudentName(sid)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link href={tasksHref} className="mt-4 block">
            <Button variant="secondary" className="w-full rounded-xl">
              View all tasks
            </Button>
          </Link>
        </div>
      </div>

      {/* Priority Intelligence */}
      <section className="relative z-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-slate-600 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <Brain className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Priority Intelligence</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Predictive analysis & behavioral triggers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Engine Active
              </span>
            </div>
          </div>

          {insights.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="h-8 w-8" />}
              title="All clear"
              description="No burnout, latency, or engagement signals right now."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 transition-all hover:border-slate-600"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <Zap className="h-5 w-5 text-indigo-400" />
                    </div>
                    <span
                      className={cn(
                        "rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
                        tagTone[insight.tagTone],
                      )}
                    >
                      {insight.tag}
                    </span>
                  </div>
                  <h4 className="mb-2 text-lg font-bold tracking-tight text-white">
                    {insight.title}
                  </h4>
                  <p className="mb-6 text-sm leading-relaxed text-slate-400">{insight.detail}</p>
                  {insight.mentorId && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 uppercase tracking-widest"
                        onClick={() =>
                          onSendNudge(insight.mentorId!, insight.title, insight.detail)
                        }
                      >
                        Nudge
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 uppercase tracking-widest"
                        onClick={() => onAuditMentor(insight.mentorId!)}
                      >
                        Audit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Operational alerts */}
      <section className="relative z-10">
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
                <ShieldAlert className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Active Operational Alerts
              </h3>
            </div>
            <Link
              href={nudgesHref}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View all nudges
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-6 text-sm text-emerald-300">
              No operational SLA alerts — mentors are within thresholds.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.slice(0, 6).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex flex-col justify-between gap-4 rounded-2xl border bg-slate-900 p-5 transition-all sm:flex-row sm:items-center sm:p-6",
                    alert.severity === "urgent"
                      ? "border-slate-800 hover:border-rose-500/30"
                      : "border-slate-800 hover:border-amber-500/30",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950",
                        alert.severity === "urgent" ? "text-rose-500" : "text-amber-500",
                      )}
                    >
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-bold tracking-tight text-white">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                    </div>
                  </div>
                  {alert.mentorId && (
                    <Button
                      className={cn(
                        "shrink-0 uppercase tracking-widest shadow-xl",
                        alert.severity === "urgent"
                          ? "bg-rose-600 shadow-rose-600/20 hover:bg-rose-500"
                          : "bg-amber-600 shadow-amber-600/20 hover:bg-amber-500",
                      )}
                      rightIcon={<ArrowUpRight className="h-4 w-4" />}
                      onClick={() =>
                        onSendNudge(alert.mentorId!, alert.mentorName || "Mentor", alert.message)
                      }
                    >
                      Send Nudge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Mentors needing attention */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-lg">
              <Users className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Mentors needing attention
              </h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                Critical and at-risk roster snapshot
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: "Critical", color: "bg-rose-500", count: summary.critical.length },
              { label: "At Risk", color: "bg-amber-500", count: summary.atRisk.length },
              { label: "Compliant", color: "bg-emerald-500", count: summary.compliant.length },
            ].map((cat) => (
              <div
                key={cat.label}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2"
              >
                <div className={cn("h-2 w-2 rounded-full", cat.color)} />
                <span className="text-xs font-bold text-white">{cat.count}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {cat.label}
                </span>
              </div>
            ))}
            <Link href={mentorsHref}>
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Full roster
              </Button>
            </Link>
            <Link href={slaHref}>
              <Button size="sm" variant="ghost">
                SLA Report
              </Button>
            </Link>
          </div>
        </div>

        {topRisk.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
            <EmptyState
              icon={<ShieldAlert className="h-8 w-8" />}
              title="Everyone compliant"
              description="No mentors are currently in critical or at-risk bands."
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {topRisk.map((row) => (
              <div
                key={row.mentor.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl transition-all hover:border-indigo-500/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    name={row.name}
                    src={row.mentor.avatar}
                    size="lg"
                    className="rounded-xl"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-lg font-bold text-white">{row.name}</h4>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          row.band === "critical"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-400",
                        )}
                      >
                        {row.band === "critical" ? "Critical" : "At risk"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {row.studentCount} students · Latency {row.latencyLabel} · Compliance{" "}
                      {row.complianceScore}%
                    </p>
                    {row.issues[0] && (
                      <p className="mt-1 text-sm text-slate-400">{row.issues[0]}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                    onClick={() => onOpenChat(row.mentor.id)}
                  >
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSendNudge(row.mentor.id, row.name, row.issues.join(" · "))}
                  >
                    Nudge
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onAuditMentor(row.mentor.id)}>
                    Audit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
