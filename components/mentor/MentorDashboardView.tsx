"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
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
  Trash2,
  Search,
  Info,
  ChevronRight,
  ArrowRight,
  X,
  Activity,
  TrendingUp,
  Check,
  Video,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  parseLocalDate,
  isUpcomingMeetingDate,
  formatMeetingLocal,
  formatMeetingLocalTime,
} from "@/lib/utils/dateUtils";
import { TimezoneHint } from "@/components/ui/TimezoneHint";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { AcceptAssignmentModal } from "@/components/mentor/AcceptAssignmentModal";
import { QuickScheduleMeetingModal } from "@/components/mentor/QuickScheduleMeetingModal";
import { SuggestMeetingTimesModal } from "@/components/mentor/SuggestMeetingTimesModal";
import type { CreateMeetingPayload } from "@/lib/api/meetings";
import { studentsApi } from "@/lib/api/students";
import { queryKeys } from "@/lib/api/queryKeys";
import { buildStrengthMonthlySeries } from "@/lib/utils/strengthHistorySeries";
import { cn } from "@/lib/utils/cn";

interface MentorDashboardProps {
  onSelectStudent: (id: string, initialTab?: string) => void;
  onMessageStudent?: (id: string) => void;
  onQuickCreateMeeting?: (payload: CreateMeetingPayload) => void | Promise<void>;
  onSendScheduleSuggestMessage?: (
    studentId: string,
    message: string,
  ) => void | Promise<void>;
  onNavigate: (tab: string) => void;
  onUpdateTaskStatus: (id: string, status: "PENDING" | "COMPLETED" | "OVERDUE") => void;
  onUpdateTask: (task: StaffTask) => void;
  onAddTask: (task: Partial<StaffTask> & { task: string; dueDate?: string; due_date?: string }) => void;
  onDeleteTask?: (taskId: string) => void;
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
  /** Open the standard Accept modal for this assignment (e.g. from push CTA). */
  autoOpenAcceptAssignmentId?: string | null;
  onAutoOpenAcceptConsumed?: () => void;
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

function riskLabel(status?: ReadinessStatus | string) {
  if (status === RS.GREEN || status === "GREEN") return "Low Risk";
  if (status === RS.YELLOW || status === "YELLOW") return "Moderate";
  if (status === RS.RED || status === "RED") return "High Risk";
  return "Unknown";
}

/** Traffic light from Application Readiness progress % (RED under 40 · YELLOW 40–69 · GREEN 70+). */
function readinessFromProgress(progress?: number | null): ReadinessStatus {
  const p = Math.max(0, Math.min(100, Number(progress) || 0));
  if (p >= 70) return RS.GREEN;
  if (p >= 40) return RS.YELLOW;
  return RS.RED;
}

/** Mini 12-month strength sparkline for mentor student roster cards. */
function StrengthYearSparkline({ scores }: { scores: number[] }) {
  if (!scores.length) return null;
  const w = 72;
  const h = 22;
  const max = 100;
  const min = 0;
  const step = scores.length > 1 ? w / (scores.length - 1) : w;
  const points = scores
    .map((score, i) => {
      const x = i * step;
      const y = h - ((Math.max(min, Math.min(max, score)) - min) / (max - min)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const last = scores[scores.length - 1] ?? 0;
  const first = scores[0] ?? 0;
  const up = last >= first;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-1.5 h-[22px] w-[72px]"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={up ? "#34d399" : "#fb7185"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/** Same source as Application Readiness on the student Profile & Docs page. */
function journeyProgressOf(student: Student) {
  return Math.max(
    0,
    Math.min(100, Number(student.progress ?? student.profile?.progress ?? 0) || 0),
  );
}

function formatShortDate(raw?: string | null) {
  if (!raw) return "TBD";
  try {
    return parseLocalDate(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "TBD";
  }
}

type SmartAlert = {
  id: string;
  title: string;
  message: string;
  studentId: string | null;
  tab: string;
  icon: React.ElementType;
  color: "rose" | "amber" | "indigo";
  kind: "no-meeting" | "task" | "action";
};

const MentorDashboard: React.FC<MentorDashboardProps> = ({ 
  onSelectStudent, 
  onMessageStudent,
  onQuickCreateMeeting,
  onSendScheduleSuggestMessage,
  onNavigate,
  onUpdateTaskStatus,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
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
  autoOpenAcceptAssignmentId = null,
  onAutoOpenAcceptConsumed,
}) => {
  const [studentSearch, setStudentSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"GREEN" | "YELLOW" | "RED" | null>(null);
  const [acceptingAssignment, setAcceptingAssignment] = useState<StudentAssignment | null>(null);
  const [decliningAssignmentId, setDecliningAssignmentId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStudent, setScheduleStudent] = useState<Student | null>(null);
  const [suggestStudent, setSuggestStudent] = useState<Student | null>(null);
  const [quickScheduleBusy, setQuickScheduleBusy] = useState(false);

  const openScheduleMeeting = (student?: Student | null) => {
    setScheduleStudent(student || null);
    setScheduleOpen(true);
  };
  const closeScheduleMeeting = () => {
    setScheduleOpen(false);
    setScheduleStudent(null);
  };
  const [suggestMessageBusy, setSuggestMessageBusy] = useState(false);
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

  useEffect(() => {
    if (!autoOpenAcceptAssignmentId) return;
    const match = pendingAssignments.find((a) => a.id === autoOpenAcceptAssignmentId);
    if (!match) return;
    setAcceptingAssignment(match);
    onAutoOpenAcceptConsumed?.();
  }, [autoOpenAcceptAssignmentId, pendingAssignments, onAutoOpenAcceptConsumed]);

  const pendingIds = useMemo(
    () => new Set(pendingAssignments.map((a) => assignmentStudentId(a)).filter(Boolean)),
    [pendingAssignments],
  );

  const students = useMemo(() => {
    const byId = new Map<string, Student>();
    assignedStudents.forEach((s) => {
      const progress = s.progress ?? s.profile?.progress;
      byId.set(s.id, {
        ...s,
        progress,
        readiness: readinessFromProgress(progress),
      });
    });
    pendingAssignments.forEach((a) => {
      const sid = assignmentStudentId(a);
      if (!sid || byId.has(sid)) return;
      const fromAll = allStudents.find((s) => s.id === sid);
      const fromA = a.student;
      const progress = fromAll?.progress ?? fromAll?.profile?.progress;
      byId.set(sid, {
        id: sid,
        name: fromAll?.name || fromA?.name || "Student",
        email: fromAll?.email || fromA?.email || "",
        avatar: fromAll?.avatar || fromA?.avatar || undefined,
        readiness: readinessFromProgress(progress),
        strengthScore: fromAll?.strengthScore,
        gpa: fromAll?.gpa,
        datScore: fromAll?.datScore,
        progress,
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

  const strengthHistoryQueries = useQueries({
    queries: students.map((s) => ({
      queryKey: queryKeys.students.strengthHistory(s.id),
      queryFn: () => studentsApi.strengthHistory(s.id),
      staleTime: 60_000,
    })),
  });

  const strengthHistoryStamp = strengthHistoryQueries
    .map((q) => `${q.dataUpdatedAt}:${q.data?.length ?? 0}`)
    .join("|");

  const strengthYearByStudent = useMemo(() => {
    const map = new Map<string, number[]>();
    students.forEach((s, i) => {
      const history = strengthHistoryQueries[i]?.data || [];
      const current = Math.round(
        Number(s.strengthScore ?? s.profile?.strength_score ?? 0) || 0,
      );
      const series = buildStrengthMonthlySeries(history, current, 12);
      map.set(
        s.id,
        series.map((p) => p.score),
      );
    });
    return map;
    // strengthHistoryQueries is read via stamp to avoid unstable array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, strengthHistoryStamp]);

  const searchMatchedStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  const riskCounts = useMemo(
    () => ({
      GREEN: searchMatchedStudents.filter((s) => s.readiness === RS.GREEN).length,
      YELLOW: searchMatchedStudents.filter((s) => s.readiness === RS.YELLOW).length,
      RED: searchMatchedStudents.filter((s) => s.readiness === RS.RED).length,
    }),
    [searchMatchedStudents],
  );

  const filteredStudents = useMemo(() => {
    if (!riskFilter) return searchMatchedStudents;
    return searchMatchedStudents.filter((s) => s.readiness === riskFilter);
  }, [searchMatchedStudents, riskFilter]);

  const toggleRiskFilter = (level: "GREEN" | "YELLOW" | "RED") => {
    setRiskFilter((prev) => (prev === level ? null : level));
  };

  const mentorTasks = staffTasks.filter(
    (t) => (t.assigned_to || t.assignedTo) === mentor.id,
  );

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

  const avgStrength = useMemo(() => {
    if (!assignedStudents.length) return null;
    const total = assignedStudents.reduce(
      (sum, s) => sum + (Number(s.strengthScore) || Number(s.progress) || 0),
      0,
    );
    return Math.round(total / assignedStudents.length);
  }, [assignedStudents]);

  /** Last 5 calendar months of completed meetings for this mentor (real DB dates). */
  const activityByMonth = useMemo(() => {
    const now = new Date();
    const keys: { key: string; label: string }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      keys.push({
        key,
        label: d.toLocaleString("en-US", { month: "short" }),
      });
    }

    return keys.map(({ key, label }) => {
      const count = mentorMeetings.filter((m) => {
        if (!m.completed || !m.date) return false;
        try {
          const d = parseLocalDate(m.date);
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return mk === key;
        } catch {
          return false;
        }
      }).length;
      return { month: label, meetings: count };
    });
  }, [mentorMeetings]);

  const meetingGrowth = useMemo(() => {
    if (activityByMonth.length < 2) return 0;
    const prev = activityByMonth[activityByMonth.length - 2]?.meetings || 0;
    const curr = activityByMonth[activityByMonth.length - 1]?.meetings || 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }, [activityByMonth]);

  const latencyHours = useMemo(() => {
    const raw =
      mentor.avgResponseTimeValue ??
      mentor.profile?.avg_response_time_value;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    const fallback =
      mentor.avgResponseTime ?? mentor.profile?.avg_response_time;
    if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
    if (typeof fallback === "string") {
      const trimmed = fallback.trim();
      if (!trimmed || trimmed === "—") return 0;
      const minutes = trimmed.match(/^(\d+(?:\.\d+)?)\s*m$/i);
      if (minutes) return Number.parseFloat(minutes[1]) / 60;
      const hours = trimmed.match(/^(\d+(?:\.\d+)?)\s*h?$/i);
      if (hours) return Number.parseFloat(hours[1]);
    }
    return 0;
  }, [mentor]);

  const latencyLabel = useMemo(() => {
    if (latencyHours <= 0) {
      const raw = mentor.avgResponseTime ?? mentor.profile?.avg_response_time;
      if (typeof raw === "string" && raw.trim() && raw.trim() !== "—" && raw.trim() !== "4h") {
        return raw.trim();
      }
      return "—";
    }
    if (latencyHours < 1) return `${Math.max(1, Math.round(latencyHours * 60))}m`;
    return `${Math.round(latencyHours * 10) / 10}h`;
  }, [latencyHours, mentor]);

  const complianceScore = Math.min(
    100,
    Math.max(0, Number(mentor.complianceScore ?? mentor.profile?.compliance_score ?? 0)),
  );
  const complianceStatus =
    complianceScore >= 95 ? "Optimal" : complianceScore >= 85 ? "Stable" : "Needs attention";

  /** Real bars: completed meetings in each of the last 12 weeks (normalized). */
  const latencyBars = useMemo(() => {
    const now = new Date();
    const counts = Array.from({ length: 12 }, (_, i) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (11 - i) * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);
      return mentorMeetings.filter((m) => {
        if (!m.date) return false;
        try {
          const d = parseLocalDate(m.date).getTime();
          return d >= weekStart.getTime() && d < weekEnd.getTime();
        } catch {
          return false;
        }
      }).length;
    });
    const max = Math.max(1, ...counts);
    return counts.map((c) => Math.max(c > 0 ? 18 : 8, Math.round((c / max) * 100)));
  }, [mentorMeetings]);

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
          kind: "no-meeting",
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
          kind: "task",
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
          kind: "action",
        });
      });

      const priority = { rose: 0, amber: 1, indigo: 2 };
    return alerts.sort(
      (a, b) => (priority[a.color] ?? 3) - (priority[b.color] ?? 3),
    );
  }, [students, pendingIds, mentorMeetings, mentorTasks, actionItems]);

  const getNextMeeting = (sid: string) => {
    const now = new Date();
    return (
      mentorMeetings
        .filter(
          (m) =>
            studentIdOf(m) === sid && !m.completed && isUpcomingMeetingDate(m.date, now),
        )
        .sort(
          (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
        )[0] || null
    );
  };

  const getNextMeetingDate = (sid: string) => {
    const upcoming = getNextMeeting(sid);
    if (!upcoming?.date) return "Not Scheduled";
    try {
      return parseLocalDate(upcoming.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Not Scheduled";
    }
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

  const resolveAlertStudent = (studentId: string | null) => {
    if (!studentId) return null;
  return (
      students.find((s) => s.id === studentId) ||
      allStudents.find((s) => s.id === studentId) ||
      null
    );
  };

  return (
    <div className="relative space-y-9 pb-6">
      {/* Ambient HUD backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-600/5 blur-[120px]" />
        <div
          className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-slate-600/5 blur-[120px]"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <header className="flex flex-col justify-between gap-6 py-2 md:flex-row md:items-end">
          <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-[2px] w-10 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
              Operational Command
            </span>
            </div>
          <h2 className="text-4xl font-black leading-none tracking-tighter text-white sm:text-5xl">
            Mentor{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
              Command Center
            </span>
            </h2>
          <p className="mt-4 font-medium text-slate-500">Welcome back, {displayName}.</p>
          </div>
          
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onNavigate("schedule")}>
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate("students")}>
            <Users className="h-4 w-4" />
            Students
          </Button>
          <Button size="sm" onClick={() => onNavigate("messages")}>
            <MessageSquare className="h-4 w-4" />
            Messages
          </Button>
          </div>
        </header>

      {/* Insight KPI strip — actual cohort / meeting / compliance data */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/40 lg:col-span-2">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-500/5 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.03]" />
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                    Strategic growth
                  </p>
                  <div className="h-0.5 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden flex-col items-end md:flex">
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none text-slate-600">
                      Status
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        meetingGrowth >= 0 ? "text-emerald-500" : "text-amber-400",
                      )}
                    >
                      {meetingGrowth >= 0 ? "Ascending" : "Cooling"}
                    </span>
                  </div>
                  <Activity className="h-6 w-6 text-slate-600" />
                </div>
              </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                  <p className="text-6xl font-black tracking-tight text-white tabular-nums sm:text-7xl">
                    {avgStrength != null ? avgStrength : "—"}
                    {avgStrength != null && (
                      <span className="ml-1 text-2xl font-black tracking-normal text-slate-500 sm:text-3xl">
                        /100
                      </span>
                    )}
                      </p>
                    </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Avg strength score
                </p>
                <p className="max-w-[220px] text-[10px] font-medium leading-relaxed text-slate-500">
                  Live average across your assigned cohort. Chart shows completed meetings by month.
                </p>
              </div>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                  {assignedStudents.slice(0, 3).map((s) => (
                    <Avatar
                      key={s.id}
                      name={s.name}
                      src={s.avatar}
                      size="sm"
                      className="shadow-lg ring-2 ring-slate-900"
                    />
                        ))}
                      </div>
                      <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none text-indigo-400">
                    Monitoring
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-600">
                    {assignedStudents.length} active · {readyCount} ready · {atRiskCount} at risk
                  </span>
                      </div>
                    </div>
                  </div>
            <div className="relative mt-2 h-[180px] w-full min-w-0 md:mt-0 md:max-w-[260px]">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/5 blur-2xl" />
              {assignedStudents.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityByMonth}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#1e293b"
                      opacity={0.5}
                    />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: "bold" }}
                      />
                    <YAxis hide allowDecimals={false} domain={[0, "auto"]} />
                      <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: 16,
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                      }}
                      itemStyle={{
                        fontSize: 10,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                      labelStyle={{
                        color: "#64748b",
                        fontSize: 10,
                        marginBottom: 4,
                        fontWeight: 900,
                      }}
                    />
                          <Line
                            type="monotone"
                      dataKey="meetings"
                      name="Meetings done"
                      stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                            animationDuration={2500}
                          />
                    </LineChart>
                  </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-slate-600">
                  Assign students to see activity
                </div>
              )}
              </div>
            </div>
        </div>

        <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/40">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent" />
            <div>
            <div className="mb-10 flex items-center justify-between">
                <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                  Latency
                </p>
                <div className="h-0.5 w-10 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                </div>
              <Clock className="h-6 w-6 text-slate-600 transition-colors duration-500 group-hover:text-indigo-400" />
              </div>
              <div className="space-y-2">
              <p className="text-5xl font-black tracking-tight text-white tabular-nums transition-colors duration-700 group-hover:text-indigo-400 sm:text-6xl">
                {latencyLabel}
                  </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Avg reply to student messages
              </p>
                </div>
            <div
              className={cn(
                "mt-4 inline-flex items-center gap-2 text-[10px] font-black",
                latencyHours <= 0
                  ? "text-slate-500"
                  : latencyHours <= 12
                    ? "text-emerald-400"
                    : "text-amber-400",
              )}
            >
              <div
                className={cn(
                  "rounded-md p-1",
                  latencyHours <= 0
                    ? "bg-slate-500/10"
                    : latencyHours <= 12
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10",
                )}
              >
                <TrendingUp className="h-3 w-3" />
              </div>
              {latencyHours <= 0
                ? "No reply latency yet"
                : latencyHours <= 12
                  ? "Within 12h SLA"
                  : "Above 12h SLA"}
            </div>
                  </div>
          <div className="mt-10 space-y-3">
            <div className="grid h-10 grid-cols-12 items-end gap-1.5">
              {latencyBars.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-colors duration-500",
                    i === latencyBars.length - 1
                      ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      : "bg-slate-800 group-hover:bg-slate-700",
                  )}
                  style={{ height: `${h}%` }}
                  title="Meetings that week"
                />
                ))}
              </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Weekly meetings · last 12 weeks
            </p>
            </div>
        </div>

        <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/40">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent" />
            <div>
            <div className="mb-10 flex items-center justify-between">
                <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                  Compliance
                </p>
                <div className="h-0.5 w-10 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                </div>
              <Check className="h-6 w-6 text-slate-600 transition-colors duration-500 group-hover:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black tracking-tight text-white tabular-nums transition-colors duration-700 group-hover:text-emerald-400 sm:text-6xl">
                  {complianceScore}%
                  </p>
                <span className="text-sm font-black uppercase tracking-widest text-slate-600 transition-colors duration-500 group-hover:text-emerald-500/70">
                  Score
                </span>
                </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Target threshold: 95%
              </p>
              </div>
            </div>
            <div className="mt-10 space-y-5">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950 shadow-inner ring-1 ring-slate-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-shadow duration-500 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.55)]"
                style={{ width: `${complianceScore}%` }}
                />
              </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    complianceScore >= 95
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      : complianceScore >= 85
                        ? "bg-amber-500"
                        : "bg-rose-500",
                  )}
                />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  System status
                </span>
                </div>
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.3em]",
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
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
              {completedMeetings}/{totalMeetings || 0} meetings completed
            </p>
            </div>
        </div>
        </div>

      {/* Notifications & surveys — below KPI cards */}
      {(unreadNotifications.length > 0 || surveys.length > 0) && (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
            <div className="h-[2px] w-8 rounded-full bg-indigo-500/70" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
              Action required
            </span>
              </div>
          <div className="grid gap-3 md:grid-cols-2">
            {unreadNotifications.map((notif) => {
              const category = (notif.category || "").toUpperCase();
              const relatedId =
                notif.related_id || (notif as { relatedId?: string }).relatedId || "";
              const isPendingAssignment =
                category === "ASSIGNMENT" &&
                !!relatedId &&
                !/declined/i.test(notif.title || "");

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-3.5 text-left transition-colors",
                    notif.type === "URGENT"
                      ? "border-rose-500/25 bg-rose-500/5 text-rose-200"
                      : notif.type === "WARNING"
                        ? "border-amber-500/25 bg-amber-500/5 text-amber-200"
                        : "border-indigo-500/25 bg-indigo-500/5 text-indigo-200",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isPendingAssignment) {
                        setAcceptingAssignment(
                          pendingAssignments.find((a) => a.id === relatedId) || null,
                        );
                        return;
                      }
                      onMarkNotificationRead?.(notif.id);
                    }}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === "URGENT" ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
            </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-white">{notif.title}</h4>
                      <p className="mt-0.5 text-xs opacity-80">{notif.message}</p>
                    </div>
                  </button>
                  {isPendingAssignment && (
                    <div className="flex gap-2 pl-7">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setAcceptingAssignment(
                            pendingAssignments.find((a) => a.id === relatedId) || null,
                          );
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          onDeclineAssignment(String(relatedId));
                          onMarkNotificationRead?.(notif.id);
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">{survey.title}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Feedback required
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onTakeSurvey(survey.id)}>
                  Take survey
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts + Assignments */}
      <div className="grid gap-7 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionTitle icon={Zap} tone="amber" title="Priority Intelligence" />
              {smartAlerts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {smartAlerts.slice(0, 4).map((alert) => {
                const Icon = alert.icon;
                const isNoMeeting = alert.kind === "no-meeting" && !!alert.studentId;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl",
                      alert.color === "rose"
                        ? "border-rose-500/20"
                        : alert.color === "amber"
                          ? "border-amber-500/20"
                          : "border-indigo-500/25",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (alert.studentId) onSelectStudent(alert.studentId, alert.tab);
                        else onNavigate(alert.tab);
                      }}
                      className="flex w-full flex-1 items-start gap-3 p-4 text-left"
                    >
                      <div
                        className={cn(
                          "shrink-0 rounded-xl border border-current/10 p-2.5",
                          alert.color === "rose"
                            ? "bg-rose-500/10 text-rose-500"
                            : alert.color === "amber"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-indigo-500/10 text-indigo-500",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {isNoMeeting ? "Needs scheduling" : "System alert"}
                          </span>
                          <span className="rounded-full border border-slate-700/80 bg-slate-800/40 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                            Priority
                          </span>
                        </div>
                        <h4 className="truncate text-sm font-bold text-white">
                          {alert.title}
                        </h4>
                        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-500">
                          {alert.message}
                        </p>
                      </div>
                    </button>

                    {isNoMeeting && (
                      <div className="flex items-center gap-2 border-t border-slate-800/80 bg-slate-950/40 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const s = resolveAlertStudent(alert.studentId);
                            if (s) openScheduleMeeting(s);
                          }}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                        >
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const s = resolveAlertStudent(alert.studentId);
                            if (s) setSuggestStudent(s);
                          }}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          Suggest times
                        </button>
                </div>
              )}
            </div>
                );
              })}
          </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500/20" />
              <p className="text-sm font-medium text-slate-500">
                No critical alerts detected. Systems clear.
              </p>
              </div>
          )}
            </div>

        <div className="space-y-6">
          <SectionTitle icon={UserPlus} tone="indigo" title="New Assignments" />
              {pendingAssignments.length > 0 ? (
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => {
                const sid = assignmentStudentId(assignment);
                const student =
                  students.find((s) => s.id === sid) ||
                  allStudents.find((s) => s.id === sid) ||
                  assignment.student;
                  return (
                  <div
                      key={assignment.id}
                    className="flex flex-col gap-4 rounded-3xl border border-indigo-500/20 bg-indigo-600/5 p-5"
                    >
                      <div className="flex items-center gap-4">
                      <Avatar
                        src={student?.avatar || undefined}
                        name={student?.name || "Student"}
                        size="md"
                        className="rounded-2xl ring-2 ring-indigo-500/20"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">
                          {student?.name || "Student"}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">
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
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-6">
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No new assignments"
                description="You’ll see pending student matches here."
              />
                </div>
              )}
            </div>
          </div>

      {/* Schedule + Tasks */}
      <div className="grid gap-7 lg:grid-cols-3">
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
              {scheduleTab === "upcoming" && onQuickCreateMeeting && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => openScheduleMeeting(null)}
                  aria-label="Create meeting"
                  title="Create meeting"
                >
                  <Plus className="h-4 w-4" />
                </Button>
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
                    const timeLabel = formatMeetingLocalTime(meeting.date);
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
                              <span className="inline-flex items-center gap-1">
                                {timeLabel}
                                <TimezoneHint dateIso={meeting.date} />
                              </span>
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
                    ? formatMeetingLocalTime(meeting.date)
                    : "All day";
                  const joinLink = meeting.link?.trim() || "";
                    return (
                    <div
                      key={meeting.id}
                      className="group w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 bg-slate-950/50 hover:bg-slate-950 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => sid && onSelectStudent(sid, "schedule")}
                        className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
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
                            <span className="inline-flex items-center gap-1">
                              {timeLabel}
                              {meeting.date.includes("T") ? (
                                <TimezoneHint dateIso={meeting.date} />
                              ) : null}
                            </span>
                            <span className="text-slate-700">·</span>
                            <span className="truncate">{meeting.title}</span>
                            </p>
                          </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={joinLink ? "primary" : "secondary"}
                          className="h-8 px-2.5"
                          leftIcon={<Video className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (!joinLink) {
                              toast.error(
                                "No meeting link yet. Add one when you schedule or edit this meeting.",
                              );
                              return;
                            }
                            window.open(joinLink, "_blank", "noopener,noreferrer");
                          }}
                        >
                          Join
                        </Button>
                        <button
                          type="button"
                          onClick={() => sid && onSelectStudent(sid, "schedule")}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-slate-900 cursor-pointer transition-colors"
                          aria-label="Open student schedule"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        </div>
                      </div>
                  );
                 })
              )}
            </div>
          )}
        </div>

        {/* Tasks */}
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
                          <div className="flex items-center gap-1 shrink-0">
                      <button 
                              type="button"
                              className="text-slate-600 hover:text-indigo-400"
                        onClick={() => startEditing(task)}
                              title="Edit task"
                      >
                              <Edit2 className="w-3.5 h-3.5" />
                      </button>
                            {onDeleteTask &&
                              (task.assigned_by || task.assignedBy) === mentor.id && (
                              <button
                                type="button"
                                className="text-slate-600 hover:text-rose-400"
                                onClick={() => {
                                  if (confirm("Delete this task? This cannot be undone.")) {
                                    onDeleteTask(task.id);
                                  }
                                }}
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                          )}
                        </div>
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

      {/* Student Roster — matches original mentor dashboard table */}
      <section className="relative z-10 space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">
              Student Roster
            </h3>
          </div>
          
          <div className="flex max-w-md flex-1 items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 py-2.5 pl-11 pr-4 text-sm text-white transition-all focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                title="Filter low risk"
                onClick={() => toggleRiskFilter("GREEN")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  riskFilter === "GREEN"
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-300",
                )}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {riskCounts.GREEN}
              </button>
              <button
                type="button"
                title="Filter moderate risk"
                onClick={() => toggleRiskFilter("YELLOW")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  riskFilter === "YELLOW"
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-300",
                )}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {riskCounts.YELLOW}
              </button>
              <button
                type="button"
                title="Filter high risk"
                onClick={() => toggleRiskFilter("RED")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  riskFilter === "RED"
                    ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                    : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-300",
                )}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {riskCounts.RED}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[2.5rem] border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead className="border-b border-slate-800 bg-slate-950/30">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Student
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Status &amp; Risk
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Stats
                </th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Strength
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Readiness
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Next Meeting
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Last / Next Session
                </th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStudents.map((student) => {
                const isPending = pendingIds.has(student.id);
                const journey = journeyProgressOf(student);
                const upcomingMeeting = getNextMeeting(student.id);
                const nextMeetingLabel = upcomingMeeting
                  ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="line-clamp-2">
                          {formatMeetingLocal(upcomingMeeting.date, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            timeZoneName: "short",
                          })}
                        </span>
                        {upcomingMeeting.date.includes("T") ? (
                          <TimezoneHint dateIso={upcomingMeeting.date} />
                        ) : null}
                      </span>
                    )
                  : "Not Scheduled";
                const prevSession =
                  student.lastMeetingDate || student.lastContactDate || null;

                const pendingAssignment = isPending
                  ? pendingAssignments.find((a) => assignmentStudentId(a) === student.id) || null
                  : null;

                return (
                <tr 
                  key={student.id}
                    onClick={() => {
                      if (isPending) return;
                      onSelectStudent(student.id, "overview");
                    }}
                    className={cn(
                      "group transition-colors",
                      isPending
                        ? "cursor-default"
                        : "cursor-pointer hover:bg-slate-800/40",
                    )}
                  >
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-4">
                        <Avatar
                          src={student.avatar}
                          name={student.name}
                          size="lg"
                          className="rounded-2xl ring-2 ring-slate-800 transition-all group-hover:ring-indigo-500/50"
                        />
                      <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold tracking-tight text-white transition-colors group-hover:text-indigo-400">
                              {student.name}
                            </h4>
                            {isPending && (
                              <span className="shrink-0 rounded border border-indigo-500/30 bg-indigo-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div>
                        <div
                          className={cn(
                            "mb-1 w-fit rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                            student.readiness === RS.GREEN
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : student.readiness === RS.YELLOW
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-400",
                          )}
                        >
                          {riskLabel(student.readiness)}
                      </div>
                        <p className="whitespace-nowrap text-[10px] font-medium text-slate-500">
                          {student.applicationCycle || "—"}
                        </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          GPA:{" "}
                          <span className="ml-1 text-sm text-white">
                            {student.gpa != null ? student.gpa : "N/A"}
                          </span>
                        </p>
                        <p className="text-[10px] font-medium text-slate-500">
                          DAT: {student.datScore != null ? student.datScore : "N/A"}
                        </p>
                    </div>
                  </td>

                    <td className="px-6 py-4 text-center align-middle">
                      <div className="inline-flex flex-col items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center shadow-inner">
                        <p className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                          Strength · 1Y
                        </p>
                        <p className="text-lg font-black leading-none text-white">
                          {student.strengthScore != null ? student.strengthScore : "—"}
                        </p>
                        <StrengthYearSparkline
                          scores={
                            strengthYearByStudent.get(student.id) || [
                              Math.round(Number(student.strengthScore) || 0),
                            ]
                          }
                        />
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                      <button
                        type="button"
                        title="Open Application Readiness"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student.id, "applications");
                        }}
                        className="flex w-full max-w-[120px] items-center gap-3"
                      >
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${journey}%`,
                              backgroundColor:
                                journey >= 80
                                  ? "#10b981"
                                  : journey >= 50
                                    ? "#f59e0b"
                                    : "#f43f5e",
                            }}
                          />
                      </div>
                        <span className="shrink-0 text-xs font-bold text-white">
                          {journey}%
                        </span>
                      </button>
                  </td>

                  <td className="px-6 py-4 align-middle">
                      <div className="flex max-w-[200px] items-center gap-3">
                        <div className="shrink-0 rounded-lg bg-indigo-500/10 p-1.5">
                          <Calendar className="h-4 w-4 text-indigo-400" />
                      </div>
                        <span className="line-clamp-2 text-[10px] font-medium text-slate-300">
                          {nextMeetingLabel}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div className="whitespace-nowrap">
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                          Prev:{" "}
                          <span className="ml-1 font-medium capitalize text-slate-300">
                            {formatShortDate(prevSession)}
                          </span>
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                          Next:{" "}
                          <span className="ml-1 font-bold capitalize">
                            {getNextMeetingDate(student.id)}
                          </span>
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        {isPending && pendingAssignment ? (
                          decliningAssignmentId === pendingAssignment.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                                  onDeclineAssignment(pendingAssignment.id);
                                  setDecliningAssignmentId(null);
                                }}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDecliningAssignmentId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAcceptingAssignment(pendingAssignment);
                                }}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDecliningAssignmentId(pendingAssignment.id);
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                        title="Send Message"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMessageStudent?.(student.id);
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-400 shadow-lg transition-all hover:border-indigo-500 hover:bg-indigo-600 hover:text-white"
                      >
                              <MessageSquare className="h-4 w-4" />
                      </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectStudent(student.id, "overview");
                              }}
                              className="whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all group-hover:border-indigo-500 group-hover:bg-indigo-600"
                            >
                              Profile
                      </button>
                          </>
                        )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <Users className="mx-auto mb-4 h-12 w-12 text-slate-800 opacity-20" />
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                      No students found matching your search
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      <QuickScheduleMeetingModal
        open={scheduleOpen}
        student={scheduleStudent}
        students={students}
        mentorId={mentor.id}
        isSubmitting={quickScheduleBusy}
        onClose={() => {
          if (!quickScheduleBusy) closeScheduleMeeting();
        }}
        onSubmit={async (payload) => {
          if (!onQuickCreateMeeting) return;
          setQuickScheduleBusy(true);
          try {
            await onQuickCreateMeeting(payload);
            closeScheduleMeeting();
          } finally {
            setQuickScheduleBusy(false);
          }
        }}
      />

      <SuggestMeetingTimesModal
        open={!!suggestStudent}
        student={suggestStudent}
        mentorName={mentor.name || "Mentor"}
        isSubmitting={suggestMessageBusy}
        onClose={() => {
          if (!suggestMessageBusy) setSuggestStudent(null);
        }}
        onSend={async (message) => {
          if (!suggestStudent || !onSendScheduleSuggestMessage) return;
          setSuggestMessageBusy(true);
          try {
            await onSendScheduleSuggestMessage(suggestStudent.id, message);
            setSuggestStudent(null);
          } finally {
            setSuggestMessageBusy(false);
          }
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
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "rounded-xl border p-2",
          tone === "amber"
            ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
            : "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
        )}
      >
        <Icon
          className={cn("h-4 w-4", tone === "amber" && "animate-pulse")}
                />
              </div>
      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">{title}</h3>
      <div
        className={cn(
          "h-px flex-1 bg-gradient-to-r to-transparent",
          tone === "amber" ? "from-amber-500/20" : "from-indigo-500/20",
        )}
      />
    </div>
  );
}

export default MentorDashboard;
