"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Clock,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  Student,
  ReadinessStatus,
  Meeting,
  ActionItem,
  Mentor,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { parseLocalDate, isUpcomingMeetingDate } from "@/lib/utils/dateUtils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export type StrengthHistorySeries = {
  studentId: string;
  name: string;
  history: Array<{ strength_score: number; recorded_at: string }>;
};

interface MentorAnalyticsViewProps {
  students: Student[];
  meetings?: Meeting[];
  actionItems?: ActionItem[];
  mentorId?: string;
  mentors?: Mentor[];
  /** Real strength score snapshots per assigned student */
  strengthHistories?: StrengthHistorySeries[];
  historiesLoading?: boolean;
  /** Hide the heavy page header when embedded in a subpage shell */
  compact?: boolean;
  onNavigateSchedule?: () => void;
  onNavigateStudents?: () => void;
}

function studentIdOf(a: { studentId?: string | null; student_id?: string | null }) {
  return a.studentId || a.student_id || "";
}

function mentorIdOf(a: { mentorId?: string | null; mentor_id?: string | null }) {
  return a.mentorId || a.mentor_id || "";
}

function dueOf(a: { dueDate?: string | null; due_date?: string | null }) {
  return a.dueDate || a.due_date || "";
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
}

function endOfMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999);
}

function scoreAtOrBefore(
  history: Array<{ strength_score: number; recorded_at: string }>,
  cutoff: Date,
): number | null {
  let best: number | null = null;
  let bestTs = -Infinity;
  for (const row of history) {
    const ts = new Date(row.recorded_at).getTime();
    if (Number.isNaN(ts) || ts > cutoff.getTime()) continue;
    if (ts >= bestTs) {
      bestTs = ts;
      best = Math.max(0, Math.min(100, Math.round(Number(row.strength_score) || 0)));
    }
  }
  return best;
}

const STUDENT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const MentorAnalyticsView: React.FC<MentorAnalyticsViewProps> = ({
  students,
  meetings = [],
  actionItems = [],
  mentorId,
  mentors = [],
  strengthHistories = [],
  historiesLoading = false,
  compact = false,
  onNavigateSchedule,
  onNavigateStudents,
}) => {
  const [timeframe, setTimeframe] = useState<"6M" | "1Y">("6M");

  const currentMentor = mentors.find((m) => m.id === mentorId) || mentors[0];

  const mentorMeetings = useMemo(() => {
    if (!mentorId) return meetings;
    const studentIds = new Set(students.map((s) => s.id));
    return meetings.filter((m) => {
      if (mentorIdOf(m) === mentorId) return true;
      if ((m.attendees || []).includes(mentorId)) return true;
      const sid = studentIdOf(m);
      return Boolean(sid && studentIds.has(sid));
    });
  }, [meetings, mentorId, students]);

  const mentorActions = useMemo(() => {
    const studentIds = new Set(students.map((s) => s.id));
    return actionItems.filter((a) => studentIds.has(studentIdOf(a)));
  }, [actionItems, students]);

  const monthKeys = useMemo(() => {
    const count = timeframe === "6M" ? 6 : 12;
    const now = new Date();
    const keys: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d));
    }
    return keys;
  }, [timeframe]);

  const complianceScore = Math.min(
    100,
    Math.max(
      0,
      Number(
        currentMentor?.complianceScore ?? currentMentor?.profile?.compliance_score ?? 0,
      ),
    ),
  );

  const latencyHours = useMemo(() => {
    const raw =
      currentMentor?.avgResponseTimeValue ??
      currentMentor?.profile?.avg_response_time_value ??
      currentMentor?.avgResponseTime ??
      currentMentor?.profile?.avg_response_time;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const n = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }, [currentMentor]);

  const latencyLabel =
    typeof currentMentor?.avgResponseTime === "string" &&
    currentMentor.avgResponseTime.trim()
      ? currentMentor.avgResponseTime
      : latencyHours != null
        ? `${latencyHours.toFixed(1)}h`
        : "—";

  const meetingVelocity = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const recent = mentorMeetings.filter((m) => {
      try {
        const d = parseLocalDate(m.date);
        return d >= start && d <= now;
      } catch {
        return false;
      }
    }).length;
    return Math.round((recent / 3) * 10) / 10;
  }, [mentorMeetings]);

  /** Real monthly meeting completion % (no fabricated compliance history). */
  const meetingCompletionData = useMemo(() => {
    return monthKeys.map((key) => {
      const monthMeetings = mentorMeetings.filter((m) => {
        try {
          return monthKey(parseLocalDate(m.date)) === key;
        } catch {
          return false;
        }
      });
      const total = monthMeetings.length;
      const completed = monthMeetings.filter((m) => m.completed).length;
      return {
        month: monthLabel(key),
        scheduled: total,
        completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : null,
      };
    });
  }, [monthKeys, mentorMeetings]);

  const seriesForChart = useMemo(() => {
    if (strengthHistories.length > 0) return strengthHistories.slice(0, 8);
    return students.slice(0, 8).map((s) => ({
      studentId: s.id,
      name: s.name,
      history: [
        {
          strength_score: Math.round(Number(s.strengthScore ?? s.profile?.strength_score ?? 0)),
          recorded_at: new Date().toISOString(),
        },
      ],
    }));
  }, [strengthHistories, students]);

  /** Real strength snapshots carried forward by month. */
  const studentStrengthData = useMemo(() => {
    return monthKeys.map((key) => {
      const cutoff = endOfMonth(key);
      const point: Record<string, string | number | null> = { month: monthLabel(key) };
      const scores: number[] = [];

      seriesForChart.forEach((series) => {
        const label = series.name.split(" ")[0] || series.name;
        const score = scoreAtOrBefore(series.history, cutoff);
        point[label] = score;
        if (score != null) scores.push(score);
      });

      point.avgStrength = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      return point;
    });
  }, [monthKeys, seriesForChart]);

  const activityData = useMemo(() => {
    return monthKeys.map((key) => {
      const meetingsCount = mentorMeetings.filter((m) => {
        try {
          return monthKey(parseLocalDate(m.date)) === key;
        } catch {
          return false;
        }
      }).length;

      const tasksCount = mentorActions.filter((a) => {
        if (a.status !== "COMPLETED") return false;
        const stamp = a.updated_at || a.created_at || dueOf(a);
        if (!stamp) return false;
        try {
          return monthKey(parseLocalDate(String(stamp).slice(0, 10))) === key;
        } catch {
          return false;
        }
      }).length;

      return {
        month: monthLabel(key),
        meetings: meetingsCount,
        tasks: tasksCount,
      };
    });
  }, [monthKeys, mentorMeetings, mentorActions]);

  const readinessData = [
    {
      name: "Ready",
      value: students.filter((s) => s.readiness === ReadinessStatus.GREEN).length,
      color: "#10b981",
    },
    {
      name: "At Risk",
      value: students.filter((s) => s.readiness === ReadinessStatus.YELLOW).length,
      color: "#f59e0b",
    },
    {
      name: "Critical",
      value: students.filter((s) => s.readiness === ReadinessStatus.RED).length,
      color: "#ef4444",
    },
  ];

  const stats = [
    {
      label: "Compliance Score",
      value: `${complianceScore}%`,
      change: complianceScore >= 95 ? "On target" : "Below target",
      trend: complianceScore >= 95 ? "up" : "down",
      icon: ShieldAlert,
      color: "text-emerald-400",
    },
    {
      label: "Active Students",
      value: String(students.length),
      change: "Roster",
      trend: "neutral",
      icon: Users,
      color: "text-indigo-400",
    },
    {
      label: "Avg. Response Time",
      value: latencyLabel,
      change:
        latencyHours == null
          ? "Not set"
          : latencyHours <= 12
            ? "Within SLA"
            : "SLA risk",
      trend:
        latencyHours == null ? "neutral" : latencyHours <= 12 ? "up" : "down",
      icon: Clock,
      color: "text-amber-400",
    },
    {
      label: "Meeting Velocity",
      value: `${meetingVelocity}/mo`,
      change: "Last 3 months",
      trend: meetingVelocity >= 4 ? "up" : "neutral",
      icon: Calendar,
      color: "text-rose-400",
    },
  ] as const;

  const complianceGaps = useMemo(() => {
    const gaps: Array<{
      title: string;
      desc: string;
      severity: "high" | "medium";
      affected: string[];
    }> = [];
    const now = new Date();

    if (latencyHours != null && latencyHours > 12) {
      gaps.push({
        title: "High Response Latency",
        desc: `Average response time is ${latencyHours.toFixed(1)}h, exceeding the 12h SLA.`,
        severity: "high",
        affected: [],
      });
    }

    const studentsWithoutMeeting = students.filter((student) => {
      const hasUpcoming = mentorMeetings.some(
        (m) =>
          studentIdOf(m) === student.id &&
          !m.completed &&
          isUpcomingMeetingDate(m.date, now),
      );
      return !hasUpcoming;
    });
    if (studentsWithoutMeeting.length > 0) {
      gaps.push({
        title: "Missing Student Meetings",
        desc: `${studentsWithoutMeeting.length} student${studentsWithoutMeeting.length === 1 ? "" : "s"} have no upcoming meetings scheduled.`,
        severity: "medium",
        affected: studentsWithoutMeeting.map((s) => s.name),
      });
    }

    const overdueTasks = mentorActions.filter((item) => {
      if (item.status === "COMPLETED") return false;
      if (item.status === "OVERDUE") return true;
      const due = dueOf(item);
      if (!due) return false;
      return parseLocalDate(due).getTime() < now.getTime();
    });
    if (overdueTasks.length > 0) {
      const affectedIds = new Set(overdueTasks.map((t) => studentIdOf(t)));
      gaps.push({
        title: "Overdue Action Items",
        desc: `${overdueTasks.length} task${overdueTasks.length === 1 ? "" : "s"} are past due.`,
        severity: "high",
        affected: students.filter((s) => affectedIds.has(s.id)).map((s) => s.name),
      });
    }

    const fortyFiveDaysFromNow = new Date();
    fortyFiveDaysFromNow.setDate(now.getDate() + 45);
    const studentsWithNoTasksSoon = students.filter((student) => {
      const hasTasksSoon = mentorActions.some((item) => {
        const due = dueOf(item);
        if (!due || studentIdOf(item) !== student.id) return false;
        if (item.status === "COMPLETED") return false;
        const dueDate = parseLocalDate(due);
        return dueDate <= fortyFiveDaysFromNow && dueDate >= now;
      });
      return !hasTasksSoon;
    });
    if (studentsWithNoTasksSoon.length > 0) {
      gaps.push({
        title: "Stagnant Student Plans",
        desc: `${studentsWithNoTasksSoon.length} student${studentsWithNoTasksSoon.length === 1 ? "" : "s"} have no open tasks in the next 45 days.`,
        severity: "medium",
        affected: studentsWithNoTasksSoon.map((s) => s.name),
      });
    }

    return gaps;
  }, [students, mentorMeetings, mentorActions, latencyHours]);

  const atRiskCount = readinessData.find((r) => r.name === "At Risk")?.value || 0;
  const criticalCount = readinessData.find((r) => r.name === "Critical")?.value || 0;
  const insightCopy =
    criticalCount > 0
      ? `${criticalCount} student${criticalCount === 1 ? "" : "s"} are critical. Prioritize meetings and overdue tasks this week.`
      : atRiskCount > 0
        ? `${atRiskCount} student${atRiskCount === 1 ? "" : "s"} are at risk. Front-load meetings this week and clear overdue tasks.`
        : students.length === 0
          ? "Accept pending assignments to start building your analytics baseline."
          : "Your cohort looks healthy. Keep response latency under 12h and stay ahead on meetings.";

  const hasMeetingTrendData = meetingCompletionData.some((d) => (d.scheduled || 0) > 0);
  const hasStrengthTrendData = studentStrengthData.some(
    (d) => d.avgStrength != null || seriesForChart.some((s) => {
      const label = s.name.split(" ")[0] || s.name;
      return d[label] != null;
    }),
  );

  return (
    <div className={cn("space-y-5 animate-in fade-in duration-300", !compact && "pb-10")}>
      {!compact && (
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-white">Performance Analytics</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Mentorship impact from live meetings, tasks, and compliance signals.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                  stat.trend === "up"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : stat.trend === "down"
                      ? "bg-rose-500/10 text-rose-400"
                      : "bg-slate-800 text-slate-400",
                )}
              >
                {stat.trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                {stat.trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {complianceGaps.length > 0 && (
        <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/15 p-2 text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Compliance gaps</h3>
              <p className="text-xs text-rose-300/70">Areas that need attention</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {complianceGaps.map((gap) => (
              <div
                key={gap.title}
                className="group relative rounded-xl border border-white/5 bg-slate-950/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      gap.severity === "high"
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-amber-500/10 text-amber-400",
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white">{gap.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{gap.desc}</p>
                    {gap.affected.length > 0 && (
                      <p className="mt-2 text-[10px] text-slate-500">
                        {gap.affected.slice(0, 4).join(", ")}
                        {gap.affected.length > 4 ? ` +${gap.affected.length - 4}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 lg:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Meeting completion rate</h3>
              <p className="text-xs text-slate-500">
                Completed vs scheduled meetings ({timeframe === "6M" ? "6" : "12"} months)
              </p>
            </div>
            <div className="flex gap-2">
              {(["6M", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    timeframe === tf
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white",
                  )}
                >
                  {tf === "6M" ? "6 Months" : "1 Year"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px] w-full sm:h-[320px]">
            {!hasMeetingTrendData ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="No meetings in this range"
                description="Completion rate appears once meetings are scheduled on your calendar."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={timeframe}>
                <LineChart data={meetingCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value, name) => {
                      if (name === "completionRate") {
                        return value == null ? ["No meetings", "Completion"] : [`${value}%`, "Completion"];
                      }
                      return [value, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="completionRate"
                    stroke="#6366f1"
                    strokeWidth={3}
                    connectNulls={false}
                    dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">Readiness mix</h3>
          <p className="mb-4 text-xs text-slate-500">Current status distribution</p>
          {students.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No students yet"
              description="Your readiness mix will appear once students are assigned."
            />
          ) : (
            <>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-semibold text-white">{students.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Students
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={readinessData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {readinessData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {readinessData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Student strength progression</h3>
            <p className="text-xs text-slate-500">
              Live strength history snapshots ({timeframe === "6M" ? "6" : "12"} months)
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full bg-white" /> Avg strength
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-3 border-t border-dashed border-slate-500" /> Student path
            </span>
          </div>
        </div>
        {students.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No progression data"
            description="Strength trends appear after students are on your roster."
          />
        ) : historiesLoading ? (
          <div className="flex h-[320px] items-center justify-center text-slate-500">
            Loading strength history…
          </div>
        ) : !hasStrengthTrendData ? (
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No strength history yet"
            description="Scores are recorded as student profiles update. Current scores will appear once available."
          />
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studentStrengthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgStrength"
                  name="Average Strength"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  connectNulls
                  dot={{ r: 3, fill: "#ffffff", strokeWidth: 0 }}
                />
                {seriesForChart.map((series, idx) => {
                  const label = series.name.split(" ")[0] || series.name;
                  return (
                    <Line
                      key={series.studentId}
                      type="monotone"
                      dataKey={label}
                      name={series.name}
                      stroke={STUDENT_COLORS[idx % STUDENT_COLORS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      connectNulls
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly engagement</h3>
              <p className="text-xs text-slate-500">Scheduled meetings and completed tasks</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#1e293b", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="meetings" name="Meetings" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="tasks" name="Tasks done" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-indigo-500/30 bg-indigo-600 p-5 text-white">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Mentor insight</h3>
            <p className="mt-3 text-sm leading-relaxed text-indigo-100">{insightCopy}</p>
          </div>
          <div className="mt-6 space-y-2">
            <Button
              className="w-full bg-white text-indigo-700 hover:bg-indigo-50"
              onClick={onNavigateSchedule}
            >
              Review schedule
            </Button>
            <Button
              variant="secondary"
              className="w-full border-indigo-400/40 bg-indigo-500 text-white hover:bg-indigo-400"
              onClick={onNavigateStudents}
            >
              Open student roster
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorAnalyticsView;
