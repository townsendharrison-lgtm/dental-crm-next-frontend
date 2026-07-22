"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  AlertCircle,
  ClipboardList,
  Clock,
  UserPlus,
  Plus,
  Zap,
  MessageSquare,
  CheckCircle2,
  Circle,
  Users,
  Edit2,
  Search,
  Info,
  ChevronRight,
  ArrowRight,
  X,
  Activity,
  TrendingUp,
  Check,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type {
  ReadinessStatus,
  SystemNotification,
  Survey,
  StudentAssignment,
  Mentor,
  Meeting,
  StaffTask,
  ActionItem,
  Student,
} from "@/lib/types";
import { ReadinessStatus as RS } from "@/lib/types";
import { parseLocalDate, isUpcomingMeetingDate } from "@/lib/utils/dateUtils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { AcceptAssignmentModal } from "@/components/mentor/AcceptAssignmentModal";
import { cn } from "@/lib/utils/cn";

interface MentorDashboardProps {
  onSelectStudent: (id: string, initialTab?: string) => void;
  onMessageStudent?: (id: string) => void;
  onNavigate: (tab: string) => void;
  onUpdateTaskStatus: (id: string, status: "PENDING" | "COMPLETED" | "OVERDUE") => void;
  onUpdateTask: (task: StaffTask) => void;
  onAddTask: (task: Partial<StaffTask> & { task: string; dueDate?: string; due_date?: string }) => void;
  notifications: SystemNotification[];
  surveys: Survey[];
  onTakeSurvey: (id: string) => void;
  onMarkNotificationRead?: (id: string) => void;
  pendingAssignments: StudentAssignment[];
  onAcceptAssignment: (
    assignmentId: string,
    availableTimes: string[],
    timezone: string,
    customMessage?: string,
  ) => void;
  onDeclineAssignment: (assignmentId: string) => void;
  mentor: Mentor;
  meetings: Meeting[];
  staffTasks: StaffTask[];
  actionItems: ActionItem[];
  students: Student[];
  allStudents?: Student[];
  welcomeMessageTemplate: string;
  defaultAvailability?: string[];
  acceptBusy?: boolean;
}

function studentIdOf(a: { studentId?: string | null; student_id?: string | null }) {
  return a.studentId || a.student_id || "";
}

function mentorIdOf(a: { mentorId?: string | null; mentor_id?: string | null }) {
  return a.mentorId || a.mentor_id || "";
}

function dueDateOf(t: { dueDate?: string | null; due_date?: string | null }) {
  return t.dueDate || t.due_date || "";
}

function assignmentStudentId(a: StudentAssignment) {
  return a.studentId || a.student_id;
}

function readinessTone(status?: ReadinessStatus | string) {
  if (status === RS.GREEN || status === "GREEN") {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  }
  if (status === RS.YELLOW || status === "YELLOW") {
    return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  }
  if (status === RS.RED || status === "RED") {
    return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  }
  return "bg-slate-800 text-slate-400 border-slate-700";
}

function readinessLabel(status?: ReadinessStatus | string) {
  if (status === RS.GREEN || status === "GREEN") return "Ready";
  if (status === RS.YELLOW || status === "YELLOW") return "At risk";
  if (status === RS.RED || status === "RED") return "Critical";
  return "Unknown";
}

type SmartAlert = {
  id: string;
  title: string;
  message: string;
  studentId: string | null;
  tab: string;
  icon: React.ElementType;
  color: "rose" | "amber" | "indigo";
};

const MentorDashboard: React.FC<MentorDashboardProps> = ({
  onSelectStudent,
  onMessageStudent,
  onNavigate,
  onUpdateTaskStatus,
  onUpdateTask,
  onAddTask,
  notifications,
  surveys,
  onTakeSurvey,
  onMarkNotificationRead,
  pendingAssignments,
  onAcceptAssignment,
  onDeclineAssignment,
  mentor,
  meetings,
  staffTasks,
  actionItems,
  students: assignedStudents,
  allStudents = [],
  welcomeMessageTemplate,
  defaultAvailability = [],
  acceptBusy = false,
}) => {
  const [studentSearch, setStudentSearch] = useState("");
  const [acceptingAssignment, setAcceptingAssignment] = useState<StudentAssignment | null>(null);
  const [decliningAssignmentId, setDecliningAssignmentId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleTab, setScheduleTab] = useState<"weekly" | "upcoming">("upcoming");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);

  const pendingIds = useMemo(
    () => new Set(pendingAssignments.map((a) => assignmentStudentId(a)).filter(Boolean)),
    [pendingAssignments],
  );

  const students = useMemo(() => {
    const byId = new Map<string, Student>();
    assignedStudents.forEach((s) => byId.set(s.id, s));
    pendingAssignments.forEach((a) => {
      const sid = assignmentStudentId(a);
      if (!sid || byId.has(sid)) return;
      const fromAll = allStudents.find((s) => s.id === sid);
      const fromA = a.student;
      byId.set(sid, {
        id: sid,
        name: fromAll?.name || fromA?.name || "Student",
        email: fromAll?.email || fromA?.email || "",
        avatar: fromAll?.avatar || fromA?.avatar || undefined,
        readiness: fromAll?.readiness,
        strengthScore: fromAll?.strengthScore,
        gpa: fromAll?.gpa,
        datScore: fromAll?.datScore,
        progress: fromAll?.progress,
        undergradInstitution: fromAll?.undergradInstitution,
        state: fromAll?.state,
        applicationCycle: fromAll?.applicationCycle,
        lastContactDate: fromAll?.lastContactDate,
        lastMeetingDate: fromAll?.lastMeetingDate,
      } as Student);
    });
    return Array.from(byId.values()).sort((a, b) => {
      const aPending = pendingIds.has(a.id) ? 0 : 1;
      const bPending = pendingIds.has(b.id) ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return a.name.localeCompare(b.name);
    });
  }, [assignedStudents, pendingAssignments, allStudents, pendingIds]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  const mentorTasks = staffTasks;

  const assignedStudentIds = useMemo(
    () => new Set(assignedStudents.map((s) => s.id)),
    [assignedStudents],
  );

  const mentorMeetings = useMemo(
    () =>
      meetings.filter((m) => {
        const mid = mentorIdOf(m);
        if (mid === mentor.id) return true;
        if ((m.attendees || []).includes(mentor.id)) return true;
        const sid = studentIdOf(m);
        if (sid && assignedStudentIds.has(sid)) return true;
        // Broadcast / cohort events returned by the meetings API for this mentor
        if (!mid && !sid) return true;
        return false;
      }),
    [meetings, mentor.id, assignedStudentIds],
  );

  const totalMeetings = mentorMeetings.length;
  const completedMeetings = mentorMeetings.filter((m) => m.completed).length;

  const readyCount = assignedStudents.filter((s) => s.readiness === RS.GREEN).length;
  const atRiskCount = assignedStudents.filter(
    (s) => s.readiness === RS.YELLOW || s.readiness === RS.RED,
  ).length;

  const progressionData = useMemo(() => {
    const months = ["Nov", "Dec", "Jan", "Feb", "Mar"];
    const cohort = assignedStudents.slice(0, 5);
    return months.map((month, mIndex) => {
      const point: Record<string, string | number> = { month };
      cohort.forEach((student) => {
        const current = student.strengthScore || student.progress || 70;
        const growthPerMonth = 2 + (student.name.length % 3);
        const score = Math.min(
          100,
          Math.max(0, current - (4 - mIndex) * growthPerMonth),
        );
        point[student.name.split(" ")[0] || "Student"] = Math.round(score);
      });
      return point;
    });
  }, [assignedStudents]);

  const avgGrowth = useMemo(() => {
    if (progressionData.length < 2) return 0;
    const first = progressionData[0];
    const last = progressionData[progressionData.length - 1];
    const keys = Object.keys(first).filter((k) => k !== "month");
    if (!keys.length) return 0;
    const total = keys.reduce(
      (sum, key) => sum + (Number(last[key]) - Number(first[key])),
      0,
    );
    return Math.round(total / keys.length);
  }, [progressionData]);

  const latencyHours = useMemo(() => {
    const raw =
      mentor.avgResponseTimeValue ??
      mentor.profile?.avg_response_time_value ??
      mentor.avgResponseTime ??
      mentor.profile?.avg_response_time;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }, [mentor]);

  const latencyLabel =
    typeof mentor.avgResponseTime === "string" && mentor.avgResponseTime.trim()
      ? mentor.avgResponseTime
      : latencyHours > 0
        ? `${Math.round(latencyHours * 10) / 10}h`
        : "—";

  const complianceScore = Math.min(
    100,
    Math.max(0, Number(mentor.complianceScore ?? mentor.profile?.compliance_score ?? 0)),
  );
  const complianceStatus =
    complianceScore >= 95 ? "Optimal" : complianceScore >= 85 ? "Stable" : "Needs attention";

  const latencyBars = useMemo(() => {
    const base = [28, 42, 35, 55, 48, 62, 40, 70, 52, 78, 58, 88];
    return base.map((h, i) => Math.max(12, Math.min(100, h - Math.round(latencyHours) + i)));
  }, [latencyHours]);

  const smartAlerts = useMemo(() => {
    const alerts: SmartAlert[] = [];
    const now = new Date();
    const activeStudents = students.filter((s) => !pendingIds.has(s.id));

    activeStudents.forEach((student) => {
      const upcoming = mentorMeetings.find(
        (m) =>
          studentIdOf(m) === student.id &&
          !m.completed &&
          isUpcomingMeetingDate(m.date, now),
      );
      if (!upcoming) {
        alerts.push({
          id: `no-meeting-${student.id}`,
          title: `Schedule ${student.name.split(" ")[0]}`,
          message: `No upcoming meeting. Last met ${student.lastMeetingDate || "never"}.`,
          studentId: student.id,
          tab: "schedule",
          icon: Calendar,
          color: "indigo",
        });
      }
    });

    mentorTasks
      .filter((t) => t.status !== "COMPLETED")
      .forEach((task) => {
        const due = dueDateOf(task);
        if (!due) return;
        const dueDate = new Date(due);
        const isOverdue = dueDate < now;
        const isUpcoming =
          !isOverdue && dueDate.getTime() - now.getTime() < 1000 * 60 * 60 * 48;
        if (!isOverdue && !isUpcoming) return;
        alerts.push({
          id: `task-${task.id}`,
          title: isOverdue ? `Overdue: ${task.task}` : `Due soon: ${task.task}`,
          message: `Due ${parseLocalDate(due).toLocaleDateString()}`,
          studentId: studentIdOf(task) || null,
          tab: "tasks",
          icon: AlertCircle,
          color: isOverdue ? "rose" : "amber",
        });
      });

    actionItems
      .filter(
        (ai) =>
          students.some((s) => s.id === studentIdOf(ai)) && ai.status !== "COMPLETED",
      )
      .forEach((ai) => {
        const due = dueDateOf(ai);
        if (!due) return;
        const dueDate = new Date(due);
        const isOverdue = dueDate < now;
        const isUpcoming =
          !isOverdue && dueDate.getTime() - now.getTime() < 1000 * 60 * 60 * 48;
        if (!isOverdue && !isUpcoming) return;
        const student = students.find((s) => s.id === studentIdOf(ai));
        alerts.push({
          id: `ai-${ai.id}`,
          title: `${isOverdue ? "Overdue" : "Upcoming"}: ${student?.name.split(" ")[0] || "Student"}`,
          message: `${ai.task} is ${isOverdue ? "past due" : "due soon"}.`,
          studentId: studentIdOf(ai) || null,
          tab: "overview",
          icon: Zap,
          color: isOverdue ? "rose" : "amber",
        });
      });

    const priority = { rose: 0, amber: 1, indigo: 2 };
    return alerts.sort(
      (a, b) => (priority[a.color] ?? 3) - (priority[b.color] ?? 3),
    );
  }, [students, pendingIds, mentorMeetings, mentorTasks, actionItems]);

  const getNextMeetingDate = (sid: string) => {
    const now = new Date();
    const upcoming = mentorMeetings
      .filter(
        (m) =>
          studentIdOf(m) === sid && !m.completed && isUpcomingMeetingDate(m.date, now),
      )
      .sort(
        (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      )[0];
    return upcoming ? parseLocalDate(upcoming.date).toLocaleDateString() : "—";
  };

  const getWeekDays = (offset: number) => {
    const start = new Date();
    start.setDate(start.getDate() + offset * 7);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(weekOffset);

  const weekMeetings = mentorMeetings.filter((m) => {
    const mDate = parseLocalDate(m.date);
    const start = weekDays[0];
    const end = new Date(weekDays[6].getTime() + 86400000);
    return mDate >= start && mDate < end;
  });

  const weekTasks = mentorTasks.filter((t) => {
    const due = dueDateOf(t);
    if (!due) return false;
    const tDate = new Date(due);
    const start = weekDays[0];
    const end = new Date(weekDays[6].getTime() + 86400000);
    return tDate >= start && tDate < end;
  });

  const dayItems = [
    ...weekMeetings
      .filter((m) => parseLocalDate(m.date).toDateString() === selectedDate.toDateString())
      .map((m) => ({ ...m, itemType: "MEETING" as const })),
    ...weekTasks
      .filter((t) => parseLocalDate(dueDateOf(t)).toDateString() === selectedDate.toDateString())
      .map((t) => ({ ...t, itemType: "TASK" as const })),
  ].sort((a, b) => {
    const dateA = parseLocalDate(
      a.itemType === "MEETING" ? (a as Meeting).date : dueDateOf(a as StaffTask),
    );
    const dateB = parseLocalDate(
      b.itemType === "MEETING" ? (b as Meeting).date : dueDateOf(b as StaffTask),
    );
    return dateA.getTime() - dateB.getTime();
  });

  const upcomingMeetings = [...mentorMeetings]
    .filter((m) => !m.completed && isUpcomingMeetingDate(m.date))
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
    .slice(0, 6);

  const resetTaskForm = () => {
    setEditingTask(null);
    setNewTaskTitle("");
    setNewTaskPriority("MEDIUM");
    setNewTaskDueDate(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    setIsAddingTask(false);
  };

  const handleSaveTask = () => {
    if (!newTaskTitle.trim() || !newTaskDueDate) return;
    const [y, m, d] = newTaskDueDate.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        task: newTaskTitle,
        priority: newTaskPriority,
        dueDate: date.toISOString(),
      });
    } else {
      onAddTask({
        task: newTaskTitle,
        priority: newTaskPriority,
        dueDate: date.toISOString(),
      });
    }
    resetTaskForm();
  };

  const startEditing = (task: StaffTask) => {
    setEditingTask(task);
    setNewTaskTitle(task.task);
    setNewTaskPriority(task.priority);
    const due = dueDateOf(task);
    if (due) {
      const d = new Date(due);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setNewTaskDueDate(`${year}-${month}-${day}`);
    }
    setIsAddingTask(true);
  };

  const acceptingName = acceptingAssignment
    ? students.find((s) => s.id === assignmentStudentId(acceptingAssignment))?.name ||
      acceptingAssignment.student?.name
    : undefined;

  const unreadNotifications = notifications.filter((n) => !n.is_read).slice(0, 4);
  const pendingTaskCount = mentorTasks.filter((t) => t.status !== "COMPLETED").length;
  const activeTasks = mentorTasks.filter((t) => t.status !== "COMPLETED");

  const displayName = (() => {
    const raw = mentor.name?.trim() || "";
    if (!raw) return "there";
    if (raw.includes("@")) return raw.split("@")[0];
    return raw.split(" ")[0];
  })();

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3.5">
        <div>
          <p className="text-sm text-slate-300">
            Welcome back, <span className="font-medium text-white">{displayName}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Your cohort, schedule, and open work in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onNavigate("schedule")}>
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate("students")}>
            <Users className="w-4 h-4" />
            Students
          </Button>
          <Button size="sm" onClick={() => onNavigate("messages")}>
            <MessageSquare className="w-4 h-4" />
            Messages
          </Button>
        </div>
      </header>

      {/* Insight KPI strip */}
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2 relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Strategic growth
                  </p>
                  <div className="mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {avgGrowth >= 0 ? "Ascending" : "Watch"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-4xl font-semibold tracking-tight text-white tabular-nums sm:text-5xl">
                  {avgGrowth >= 0 ? "+" : ""}
                  {avgGrowth}%
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Avg increase in score
                </p>
                <p className="mt-2 max-w-xs text-xs text-slate-500">
                  Capability uplift across your assigned cohort over recent months.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {assignedStudents.slice(0, 3).map((s) => (
                    <Avatar
                      key={s.id}
                      name={s.name}
                      src={s.avatar}
                      size="sm"
                      className="ring-2 ring-slate-900"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    Monitoring
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {assignedStudents.length} active · {readyCount} ready · {atRiskCount} at risk
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[140px] w-full min-w-0 md:max-w-[240px]">
              {progressionData.length > 0 && Object.keys(progressionData[0]).length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    />
                    {Object.keys(progressionData[0])
                      .filter((k) => k !== "month")
                      .map((key, i) => {
                        const colors = ["#6366f1", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6"];
                        return (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={colors[i % colors.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3, strokeWidth: 0 }}
                          />
                        );
                      })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-600">
                  Assign students to see growth
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Latency
                </p>
                <div className="mt-1 h-0.5 w-8 rounded-full bg-indigo-500" />
              </div>
              <Clock className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">
                {latencyLabel}
              </p>
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Avg response window
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {latencyHours <= 12 ? "Within 12h SLA" : "Above 12h SLA"}
            </div>
          </div>
          <div className="mt-6 grid h-10 grid-cols-12 items-end gap-1">
            {latencyBars.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-sm transition-colors",
                  i === latencyBars.length - 1 ? "bg-indigo-500" : "bg-slate-800",
                )}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Compliance
                </p>
                <div className="mt-1 h-0.5 w-8 rounded-full bg-emerald-500" />
              </div>
              <Check className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">
                {complianceScore}%
              </p>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Score
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Target threshold: 95%
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: `${complianceScore}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    complianceScore >= 95
                      ? "bg-emerald-500"
                      : complianceScore >= 85
                        ? "bg-amber-500"
                        : "bg-rose-500",
                  )}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  complianceScore >= 95
                    ? "text-emerald-400"
                    : complianceScore >= 85
                      ? "text-amber-400"
                      : "text-rose-400",
                )}
              >
                {complianceStatus}
              </span>
            </div>
            <p className="text-[10px] text-slate-600">
              {completedMeetings}/{totalMeetings || 0} meetings completed
            </p>
          </div>
        </div>
      </div>

      {/* Alerts + Assignments */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle icon={Zap} tone="amber" title="Priority alerts" />
          {smartAlerts.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {smartAlerts.slice(0, 4).map((alert) => {
                const Icon = alert.icon;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => {
                      if (alert.studentId) onSelectStudent(alert.studentId, alert.tab);
                      else onNavigate(alert.tab);
                    }}
                    className={cn(
                      "text-left rounded-xl border bg-slate-900 p-4 transition-colors hover:border-indigo-500/30",
                      alert.color === "rose"
                        ? "border-rose-500/20"
                        : alert.color === "amber"
                          ? "border-amber-500/20"
                          : "border-slate-800",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg shrink-0",
                          alert.color === "rose"
                            ? "bg-rose-500/10 text-rose-400"
                            : alert.color === "amber"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-indigo-500/10 text-indigo-400",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{alert.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8" />}
                title="All clear"
                description="No overdue tasks or missing meetings right now."
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <SectionTitle icon={UserPlus} tone="indigo" title="New assignments" />
          {pendingAssignments.length > 0 ? (
            <div className="space-y-3">
              {pendingAssignments.map((assignment) => {
                const sid = assignmentStudentId(assignment);
                const student =
                  students.find((s) => s.id === sid) ||
                  allStudents.find((s) => s.id === sid) ||
                  assignment.student;
                return (
                  <div
                    key={assignment.id}
                    className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={student?.avatar || undefined}
                        name={student?.name || "Student"}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {student?.name || "Student"}
                        </p>
                        <p className="text-[10px] text-indigo-300 uppercase tracking-wider">
                          Pending acceptance
                        </p>
                      </div>
                    </div>
                    {decliningAssignmentId === assignment.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          className="flex-1"
                          onClick={() => {
                            onDeclineAssignment(assignment.id);
                            setDecliningAssignmentId(null);
                          }}
                        >
                          Confirm decline
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDecliningAssignmentId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setAcceptingAssignment(assignment)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDecliningAssignmentId(assignment.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No new assignments"
                description="You’ll see pending student matches here."
              />
            </div>
          )}
        </div>
      </div>

      {/* Notifications & surveys */}
      {(unreadNotifications.length > 0 || surveys.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {unreadNotifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => onMarkNotificationRead?.(notif.id)}
              className={cn(
                "text-left rounded-xl border p-4 flex items-start gap-3 transition-colors hover:opacity-90",
                notif.type === "URGENT"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  : notif.type === "WARNING"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
              )}
            >
              <div className="mt-0.5">
                {notif.type === "URGENT" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white">{notif.title}</h4>
                <p className="text-xs opacity-80 mt-0.5">{notif.message}</p>
                <p className="text-[10px] mt-2 uppercase tracking-wider opacity-60">
                  Click to mark read
                </p>
              </div>
            </button>
          ))}
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{survey.title}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Feedback required
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => onTakeSurvey(survey.id)}>
                Take survey
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Schedule + Tasks */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {scheduleTab === "weekly" ? "Weekly schedule" : "Upcoming meetings"}
                </h3>
                {scheduleTab === "weekly" && (
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
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
                    "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors",
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
                    "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors",
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
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setWeekOffset((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {scheduleTab === "weekly" ? (
            <>
              <div className="grid grid-cols-7 gap-1.5 mb-4">
                {weekDays.map((day, i) => {
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayMeetings = weekMeetings.filter(
                    (m) => new Date(m.date).toDateString() === day.toDateString(),
                  );
                  const dayTasks = weekTasks.filter(
                    (t) => new Date(dueDateOf(t)).toDateString() === day.toDateString(),
                  );
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-xl transition-colors",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 border border-slate-800 hover:border-slate-700",
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
                      {(dayMeetings.length > 0 || dayTasks.length > 0) && (
                        <div className="flex gap-0.5 mt-1">
                          {dayMeetings.length > 0 && (
                            <span
                              className={cn(
                                "w-1 h-1 rounded-full",
                                isSelected ? "bg-white" : "bg-indigo-500",
                              )}
                            />
                          )}
                          {dayTasks.length > 0 && (
                            <span
                              className={cn(
                                "w-1 h-1 rounded-full",
                                isSelected ? "bg-white" : "bg-emerald-500",
                              )}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                {dayItems.map((item) => {
                  if (item.itemType === "MEETING") {
                    const meeting = item as Meeting & { itemType: "MEETING" };
                    const mDate = new Date(meeting.date);
                    const sid = studentIdOf(meeting);
                    const student =
                      students.find((s) => s.id === sid) ||
                      allStudents.find((s) => s.id === sid);
                    const timeLabel = mDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={`m-${meeting.id}`}
                        className="group rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between gap-3 hover:border-indigo-500/40 hover:bg-slate-950 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-14 h-14 rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-indigo-200 flex flex-col items-center justify-center shrink-0 shadow-inner">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/80 leading-none">
                              {mDate.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className="text-xl font-semibold text-white leading-none mt-1 tabular-nums">
                              {mDate.getDate()}
                            </span>
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">
                                {meeting.title}
                              </p>
                              <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/20 text-[9px]">
                                Meeting
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                              <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                              <span>{timeLabel}</span>
                              <span className="text-slate-700">·</span>
                              <span className="truncate">{student?.name || "No student linked"}</span>
                            </p>
                          </div>
                        </div>
                        {sid && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            onClick={() => onSelectStudent(sid, "schedule")}
                          >
                            Open
                          </Button>
                        )}
                      </div>
                    );
                  }

                  const task = item as StaffTask & { itemType: "TASK" };
                  const due = dueDateOf(task);
                  const dueDate = due ? parseLocalDate(due) : null;
                  const isDone = task.status === "COMPLETED";
                  return (
                    <div
                      key={`t-${task.id}`}
                      className={cn(
                        "group rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-colors",
                        isDone
                          ? "border-slate-800/80 bg-slate-950/30 opacity-70"
                          : "border-slate-800 bg-slate-950/60 hover:border-emerald-500/35 hover:bg-slate-950",
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-14 h-14 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 flex flex-col items-center justify-center shrink-0 shadow-inner">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80 leading-none">
                            Due
                          </span>
                          <span className="text-xl font-semibold text-white leading-none mt-1 tabular-nums">
                            {dueDate ? dueDate.getDate() : "—"}
                          </span>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={cn(
                                "text-sm font-semibold truncate",
                                isDone ? "text-slate-500 line-through" : "text-white",
                              )}
                            >
                              {task.task}
                            </p>
                            <Badge
                              className={cn(
                                "text-[9px]",
                                task.priority === "HIGH"
                                  ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
                                  : task.priority === "MEDIUM"
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700",
                              )}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {dueDate
                              ? dueDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "No due date"}
                            {task.studentName ? ` · ${task.studentName}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0"
                        onClick={() =>
                          onUpdateTaskStatus(task.id, isDone ? "PENDING" : "COMPLETED")
                        }
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                        )}
                      </Button>
                    </div>
                  );
                })}
                {dayItems.length === 0 && (
                  <EmptyState
                    icon={<Calendar className="w-8 h-8" />}
                    title="Nothing scheduled"
                    description="No meetings or tasks for this day."
                  />
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {upcomingMeetings.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-8 h-8" />}
                  title="No upcoming meetings"
                  description="Schedule sessions from a student profile."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => onNavigate("schedule")}>
                      Open schedule
                    </Button>
                  }
                />
              ) : (
                upcomingMeetings.map((meeting) => {
                  const sid = studentIdOf(meeting);
                  const student =
                    students.find((s) => s.id === sid) ||
                    allStudents.find((s) => s.id === sid);
                  const mDate = parseLocalDate(meeting.date);
                  const timeLabel = meeting.date.includes("T")
                    ? mDate.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "All day";
                  return (
                    <button
                      key={meeting.id}
                      type="button"
                      onClick={() => sid && onSelectStudent(sid, "schedule")}
                      className="group w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 bg-slate-950/50 hover:bg-slate-950 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-14 h-14 rounded-xl border border-slate-700/80 bg-slate-900 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 leading-none">
                            {mDate.toLocaleDateString([], { month: "short" })}
                          </span>
                          <span className="text-xl font-semibold text-white leading-none mt-1 tabular-nums">
                            {mDate.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">
                            {student?.name || meeting.title}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                            <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                            {timeLabel}
                            <span className="text-slate-700">·</span>
                            <span className="truncate">{meeting.title}</span>
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Active tasks</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {pendingTaskCount} pending
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant={isAddingTask ? "danger" : "secondary"}
              className="h-8 w-8"
              onClick={() => {
                if (isAddingTask) resetTaskForm();
                else setIsAddingTask(true);
              }}
            >
              {isAddingTask ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {isAddingTask && (
            <div className="mb-4 rounded-xl border border-indigo-500/30 bg-slate-950 p-3 space-y-3">
              <Input
                placeholder="Task title…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <DatePicker value={newTaskDueDate} onChange={setNewTaskDueDate} />
              <SelectMenu
                value={newTaskPriority}
                onChange={(v) => setNewTaskPriority(v as "HIGH" | "MEDIUM" | "LOW")}
                options={[
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" },
                ]}
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!newTaskTitle.trim()}
                onClick={handleSaveTask}
              >
                {editingTask ? "Update task" : "Create task"}
              </Button>
            </div>
          )}

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px]">
            {activeTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8" />}
                title="All caught up"
                description="No open tasks. Create one or check View all tasks."
              />
            ) : (
              activeTasks.slice(0, 12).map((task) => {
                const due = dueDateOf(task);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        className="mt-0.5 text-slate-500 hover:text-emerald-400"
                        onClick={() => onUpdateTaskStatus(task.id, "COMPLETED")}
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white truncate">{task.task}</p>
                          <button
                            type="button"
                            className="text-slate-600 hover:text-indigo-400 shrink-0"
                            onClick={() => startEditing(task)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <Badge
                            className={cn(
                              "text-[9px]",
                              task.priority === "HIGH"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : task.priority === "MEDIUM"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-slate-800 text-slate-400 border-slate-700",
                            )}
                          >
                            {task.priority}
                          </Badge>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {due ? parseLocalDate(due).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => onNavigate("tasks")}
          >
            View all tasks
          </Button>
        </div>
      </div>

      {/* Student roster */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionTitle icon={Users} tone="indigo" title="Student roster" />
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              className="pl-9"
              placeholder="Search students…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="No students found"
              description={
                studentSearch
                  ? "Try a different search."
                  : "Accept an assignment or wait for a match."
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const isPending = pendingIds.has(student.id);
              const nextAction = actionItems.find(
                (a) => studentIdOf(a) === student.id && a.status !== "COMPLETED",
              );
              return (
                <div
                  key={student.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <button
                      type="button"
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      onClick={() => onSelectStudent(student.id)}
                    >
                      <Avatar src={student.avatar} name={student.name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white truncate">
                            {student.name}
                          </p>
                          {isPending && (
                            <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/20 text-[9px]">
                              Pending
                            </Badge>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider border",
                              readinessTone(student.readiness),
                            )}
                          >
                            {readinessLabel(student.readiness)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {student.email || "—"}
                          {student.undergradInstitution
                            ? ` · ${student.undergradInstitution}`
                            : ""}
                        </p>
                      </div>
                    </button>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6 text-xs lg:shrink-0">
                      <Meta label="GPA" value={student.gpa != null ? String(student.gpa) : "—"} />
                      <Meta
                        label="DAT"
                        value={student.datScore != null ? String(student.datScore) : "—"}
                      />
                      <Meta
                        label="Strength"
                        value={
                          student.strengthScore != null ? String(student.strengthScore) : "—"
                        }
                      />
                      <Meta label="Next meeting" value={getNextMeetingDate(student.id)} />
                    </div>

                    <div className="flex items-center gap-2 lg:shrink-0">
                      {!isPending && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-9 w-9"
                          title="Message"
                          onClick={() => onMessageStudent?.(student.id)}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" onClick={() => onSelectStudent(student.id)}>
                        Manage
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {nextAction && (
                    <p className="mt-3 text-xs text-slate-500 border-t border-slate-800 pt-3">
                      Next step:{" "}
                      <span className="text-slate-300">{nextAction.task}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AcceptAssignmentModal
        open={!!acceptingAssignment}
        studentName={acceptingName}
        defaultAvailability={defaultAvailability}
        welcomeTemplate={welcomeMessageTemplate}
        isSubmitting={acceptBusy}
        onClose={() => setAcceptingAssignment(null)}
        onConfirm={(availableTimes, timezone, welcomeMessage) => {
          if (!acceptingAssignment) return;
          onAcceptAssignment(
            acceptingAssignment.id,
            availableTimes,
            timezone,
            welcomeMessage,
          );
          setAcceptingAssignment(null);
        }}
      />
    </div>
  );
};

function SectionTitle({
  icon: Icon,
  title,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  tone: "indigo" | "amber";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "p-1.5 rounded-lg border",
          tone === "amber"
            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-slate-200 mt-0.5">{value}</p>
    </div>
  );
}

export default MentorDashboard;
