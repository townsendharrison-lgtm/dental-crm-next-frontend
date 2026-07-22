"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Rocket,
  BarChart3,
  GraduationCap,
  FileCheck,
  Shield,
  Settings,
  Activity,
  Clock,
  Hourglass,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Info,
  Calendar,
  MessageSquare,
  ArrowUpRight,
  User,
  UserCheck,
  CalendarX,
  X,
  Plus,
  Globe,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { useLeads, useUpdateLead } from "@/lib/hooks/useLeads";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useNotifications, useMarkNotificationAsRead } from "@/lib/hooks/useNotifications";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useMentors } from "@/lib/hooks/useMentors";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useTasks } from "@/lib/hooks/useTasks";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { useCourseSubmissions } from "@/lib/hooks/useCourses";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { Lead } from "@/lib/types";

const MENTOR_CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const US_REGION_BY_STATE: Record<string, string> = {
  CT: "Northeast",
  ME: "Northeast",
  MA: "Northeast",
  NH: "Northeast",
  RI: "Northeast",
  VT: "Northeast",
  NJ: "Northeast",
  NY: "Northeast",
  PA: "Northeast",
  AL: "Southeast",
  AR: "Southeast",
  FL: "Southeast",
  GA: "Southeast",
  KY: "Southeast",
  LA: "Southeast",
  MS: "Southeast",
  NC: "Southeast",
  SC: "Southeast",
  TN: "Southeast",
  VA: "Southeast",
  WV: "Southeast",
  DC: "Southeast",
  DE: "Southeast",
  MD: "Southeast",
  CA: "West Coast",
  OR: "West Coast",
  WA: "West Coast",
  AK: "West Coast",
  HI: "West Coast",
  IL: "Midwest",
  IN: "Midwest",
  IA: "Midwest",
  KS: "Midwest",
  MI: "Midwest",
  MN: "Midwest",
  MO: "Midwest",
  NE: "Midwest",
  ND: "Midwest",
  OH: "Midwest",
  SD: "Midwest",
  WI: "Midwest",
  AZ: "Southwest",
  NM: "Southwest",
  OK: "Southwest",
  TX: "Southwest",
  CO: "West",
  ID: "West",
  MT: "West",
  NV: "West",
  UT: "West",
  WY: "West",
};

function regionForState(raw?: string | null): string {
  if (!raw) return "Unspecified";
  const cleaned = raw.trim().toUpperCase();
  if (US_REGION_BY_STATE[cleaned]) return US_REGION_BY_STATE[cleaned];
  const nameMap: Record<string, string> = {
    CALIFORNIA: "CA",
    "NEW YORK": "NY",
    TEXAS: "TX",
    FLORIDA: "FL",
  };
  const abbr = nameMap[cleaned] || cleaned.slice(0, 2);
  return US_REGION_BY_STATE[abbr] || "Other";
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
}

export function AdminDashboardView() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [mentorSearch, setMentorSearch] = useState("");
  const [performanceTab, setPerformanceTab] = useState<"COMPLIANCE" | "STRENGTH">("COMPLIANCE");

  const { data: users = [], isLoading: usersLoading } = useAdminUsers();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: lorRequests = [], isLoading: lorLoading } = useLorRequests();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(true);
  const { data: studentProfiles = [], isLoading: studentsLoading } = useStudents();
  const { data: mentorProfiles = [], isLoading: mentorsLoading } = useMentors();
  const { data: meetings = [] } = useMeetings();
  const { data: staffTasks = [] } = useTasks();
  const { data: actionItems = [] } = useActionItems();
  const { data: courseSubmissions = [], isLoading: submissionsLoading } = useCourseSubmissions("PENDING");
  const { data: experiences = [], isLoading: experiencesLoading } = useExperiences();

  const markNotificationRead = useMarkNotificationAsRead();
  const updateLead = useUpdateLead();

  const students = useMemo(() => normalizeStudents(studentProfiles), [studentProfiles]);
  const mentors = useMemo(
    () => mentorProfiles.filter((m) => m.role !== "ADMIN"),
    [mentorProfiles],
  );
  const userStudents = useMemo(() => users.filter((u) => u.role === "STUDENT"), [users]);

  const urgentAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      createdAt: string;
      relatedId?: string;
      actionType: "LEAD" | "LOR" | "NOTIFICATION";
    }> = [];

    notifications
      .filter((n) => !n.is_read)
      .forEach((n) => {
        let actionType: "LEAD" | "LOR" | "NOTIFICATION" = "NOTIFICATION";
        if (n.category === "NEW_LEAD") {
          actionType = "LEAD";
        } else if (
          n.category === "LOR" ||
          n.title.toLowerCase().includes("letter") ||
          n.message.toLowerCase().includes("letter")
        ) {
          actionType = "LOR";
        }

        alerts.push({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || "URGENT",
          createdAt: n.created_at,
          relatedId: n.related_id || undefined,
          actionType,
        });
      });

    return alerts;
  }, [notifications]);

  const stats = useMemo(() => {
    const totalStudents = students.length || userStudents.length;
    const totalLeads = leads.length;
    const paidLeads = leads.filter((l) => l.isPaid).length;
    const conversionRate = totalLeads > 0 ? (paidLeads / totalLeads) * 100 : 0;

    const readinessScores = { GREEN: 100, YELLOW: 50, RED: 0 } as const;
    const withReadiness = students.filter((s) => s.readiness);
    const avgReadiness =
      withReadiness.length > 0
        ? Math.round(
            withReadiness.reduce(
              (sum, s) => sum + (readinessScores[s.readiness as keyof typeof readinessScores] ?? 50),
              0,
            ) / withReadiness.length,
          )
        : null;

    const readinessDist = {
      green: students.filter((s) => s.readiness === "GREEN").length,
      yellow: students.filter((s) => s.readiness === "YELLOW").length,
      red: students.filter((s) => s.readiness === "RED").length,
    };

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const inactiveStudents = students.filter((s) => {
      const last =
        s.lastMeetingDate || s.lastContactDate || s.profile?.last_meeting_date || s.profile?.last_contact_date;
      if (!last) return true;
      return new Date(last).getTime() < thirtyDaysAgo;
    });

    const avgCompliance =
      mentors.length > 0
        ? Math.round(
            mentors.reduce(
              (sum, m) =>
                sum + (m.complianceScore ?? m.profile?.compliance_score ?? 0),
              0,
            ) / mentors.length,
          )
        : null;

    // Retention = students with contact/meeting activity in the last 90 days
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const retained = students.filter((s) => {
      const last =
        s.lastMeetingDate ||
        s.lastContactDate ||
        s.profile?.last_meeting_date ||
        s.profile?.last_contact_date;
      if (last && new Date(last).getTime() >= ninetyDaysAgo) return true;
      return meetings.some((m) => {
        const sid = m.student_id || m.studentId;
        if (sid !== s.id) return false;
        try {
          return parseLocalDate(m.date).getTime() >= ninetyDaysAgo;
        } catch {
          return false;
        }
      });
    }).length;
    const retentionRate =
      students.length > 0 ? Math.round((retained / students.length) * 100) : null;

    return {
      totalStudents,
      conversionRate: Math.round(conversionRate),
      avgReadiness,
      readinessDist,
      inactiveCount: inactiveStudents.length,
      avgCompliance,
      retentionRate,
      retainedCount: retained,
    };
  }, [students, userStudents, leads, mentors, meetings]);

  const mentorMetrics = useMemo(() => {
    const now = Date.now();
    const map = new Map<
      string,
      { latency: string; noMtg: number; overdue: number; noTasks: number; compliance: number }
    >();

    for (const mentor of mentors) {
      const studentIds = mentor.studentIds || students.filter((s) => s.mentorId === mentor.id).map((s) => s.id);
      const mentorMeetings = meetings.filter((m) => (m.mentor_id || m.mentorId) === mentor.id);
      const studentsWithoutMeeting = studentIds.filter((sid) => {
        const hasUpcoming = mentorMeetings.some(
          (m) => (m.student_id || m.studentId) === sid && !m.completed && new Date(m.date).getTime() >= now,
        );
        return !hasUpcoming;
      }).length;

      const overdue = [
        ...actionItems.filter(
          (a) =>
            studentIds.includes(a.student_id || a.studentId || "") &&
            a.status !== "COMPLETED" &&
            new Date(a.due_date || a.dueDate || 0).getTime() < now,
        ),
        ...staffTasks.filter(
          (t) =>
            (t.assigned_to || t.assignedTo) === mentor.id &&
            t.status !== "COMPLETED" &&
            new Date(t.due_date || t.dueDate || 0).getTime() < now,
        ),
      ].length;

      const pendingStaff = staffTasks.filter(
        (t) => (t.assigned_to || t.assignedTo) === mentor.id && t.status !== "COMPLETED",
      ).length;

      map.set(mentor.id, {
        latency: String(mentor.avgResponseTime ?? mentor.profile?.avg_response_time ?? "—"),
        noMtg: studentsWithoutMeeting,
        overdue,
        noTasks: pendingStaff === 0 ? studentIds.length : 0,
        compliance: mentor.complianceScore ?? mentor.profile?.compliance_score ?? 0,
      });
    }
    return map;
  }, [mentors, students, meetings, actionItems, staffTasks]);

  const filteredMentors = useMemo(() => {
    return mentors.filter(
      (m) =>
        m.name.toLowerCase().includes(mentorSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(mentorSearch.toLowerCase()),
    );
  }, [mentors, mentorSearch]);

  const chartMentors = useMemo(() => filteredMentors.slice(0, 6), [filteredMentors]);

  const mentorPerformanceData = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }

    const complianceTrend = keys.map((key) => {
      const point: Record<string, string | number> = { month: monthLabel(key) };
      chartMentors.forEach((mentor) => {
        const shortName = mentor.name?.split(" ")[0] || mentor.email || "Mentor";
        const studentIds = new Set(
          (mentor.studentIds || students.filter((s) => s.mentorId === mentor.id).map((s) => s.id)),
        );
        const monthMeetings = meetings.filter((m) => {
          if ((m.mentor_id || m.mentorId) !== mentor.id) return false;
          try {
            return monthKey(parseLocalDate(m.date)) === key;
          } catch {
            return false;
          }
        });
        const completed = monthMeetings.filter((m) => m.completed).length;
        const base = mentor.complianceScore ?? mentor.profile?.compliance_score ?? 80;
        const activityBoost =
          studentIds.size > 0
            ? Math.min(20, (completed / Math.max(1, studentIds.size)) * 25)
            : Math.min(15, completed * 4);
        point[shortName] = Math.min(100, Math.max(0, Math.round(base * 0.75 + activityBoost + 5)));
      });
      return point;
    });

    const strengthTrend = keys.map((key) => {
      const point: Record<string, string | number> = { month: monthLabel(key) };
      chartMentors.forEach((mentor) => {
        const shortName = mentor.name?.split(" ")[0] || mentor.email || "Mentor";
        const studentIds = new Set(
          (mentor.studentIds || students.filter((s) => s.mentorId === mentor.id).map((s) => s.id)),
        );
        const completedActions = actionItems.filter((a) => {
          const sid = a.student_id || a.studentId || "";
          if (!studentIds.has(sid) || a.status !== "COMPLETED") return false;
          const due = a.due_date || a.dueDate || a.updated_at || a.created_at;
          if (!due) return false;
          try {
            return monthKey(parseLocalDate(String(due))) === key;
          } catch {
            return false;
          }
        }).length;
        const completedMeetings = meetings.filter((m) => {
          if ((m.mentor_id || m.mentorId) !== mentor.id || !m.completed) return false;
          try {
            return monthKey(parseLocalDate(m.date)) === key;
          } catch {
            return false;
          }
        }).length;
        const avgStrength =
          studentIds.size > 0
            ? [...studentIds].reduce((sum, id) => {
                const s = students.find((st) => st.id === id);
                return sum + (s?.strengthScore || s?.progress || 0);
              }, 0) / studentIds.size
            : 0;
        point[shortName] = Math.round(
          Math.min(20, completedActions * 1.5 + completedMeetings * 0.8 + avgStrength / 25) * 10,
        ) / 10;
      });
      return point;
    });

    return { complianceTrend, strengthTrend };
  }, [chartMentors, students, meetings, actionItems]);

  const avgStrengthGrowth = useMemo(() => {
    const last = mentorPerformanceData.strengthTrend[mentorPerformanceData.strengthTrend.length - 1];
    if (!last) return 0;
    const vals = Object.entries(last)
      .filter(([k]) => k !== "month")
      .map(([, v]) => Number(v) || 0);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }, [mentorPerformanceData]);

  const regionalDensity = useMemo(() => {
    const shadowing = experiences.filter((e) => e.category === "Shadowing");
    const byRegion = new Map<
      string,
      { students: Set<string>; orgs: Set<string>; hours: number }
    >();

    const ensure = (region: string) => {
      if (!byRegion.has(region)) {
        byRegion.set(region, { students: new Set(), orgs: new Set(), hours: 0 });
      }
      return byRegion.get(region)!;
    };

    // Seed primary display regions so cards always render
    ["Northeast", "Southeast", "West Coast"].forEach((r) => ensure(r));

    students.forEach((s) => {
      const region = regionForState(s.state || s.profile?.state);
      const bucket = ensure(region);
      const hasShadowing = shadowing.some(
        (e) => (e.student_id || e.studentId) === s.id,
      );
      if (hasShadowing || s.state || s.profile?.state) {
        bucket.students.add(s.id);
      }
    });

    shadowing.forEach((exp) => {
      const sid = exp.student_id || exp.studentId || "";
      const student = students.find((s) => s.id === sid);
      const region = regionForState(student?.state || student?.profile?.state);
      const bucket = ensure(region);
      if (sid) bucket.students.add(sid);
      if (exp.organization) bucket.orgs.add(exp.organization.trim().toLowerCase());
      const hours = (exp.sessions || []).reduce((sum, sess) => sum + (sess.duration || 0), 0);
      bucket.hours += hours;
    });

    const preferred = ["Northeast", "Southeast", "West Coast", "Midwest", "Southwest", "West", "Other"];
    return preferred
      .filter((r) => byRegion.has(r))
      .map((region) => {
        const bucket = byRegion.get(region)!;
        const studentsCount = bucket.students.size;
        const dentists = bucket.orgs.size;
        const load = studentsCount === 0 ? 0 : dentists === 0 ? studentsCount : studentsCount / Math.max(1, dentists);
        let density: "Low" | "Medium" | "High" | "Critical" = "Low";
        if (load >= 3 || bucket.hours > 400) density = "Critical";
        else if (load >= 1.5 || bucket.hours > 200) density = "High";
        else if (studentsCount > 0 || dentists > 0) density = "Medium";
        return {
          region,
          students: studentsCount,
          dentists,
          hours: Math.round(bucket.hours),
          density,
        };
      })
      .filter((r) => ["Northeast", "Southeast", "West Coast"].includes(r.region) || r.students > 0 || r.dentists > 0)
      .slice(0, 3);
  }, [students, experiences]);

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId);
  }, [leads, selectedLeadId]);

  return (
    <div className="space-y-6 lg:space-y-8 pb-12">
      {/* Background glow effects verbatim from old UI */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="flex flex-col gap-4">
        <div className="lg:hidden">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">Platform Overview</h2>
          <p className="text-sm lg:text-base text-slate-400">Dental School Guide Operational Control & Analytics.</p>
        </div>

        {/* Buttons matching exactly */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2">
          <button
            onClick={() => router.push("/admin/mentors")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />{" "}
            <span className="truncate">Student Assignments</span>
          </button>
          <button
            onClick={() => router.push("/admin/analytics")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-rose-450 shrink-0" /> <span className="truncate">Platform Analytics</span>
          </button>
          <button
            onClick={() => router.push("/admin/lor-config")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all"
          >
            <Shield className="w-4 h-4 text-rose-450 shrink-0" /> <span className="truncate">Letter Vault Config</span>
          </button>
          <button
            onClick={() => router.push("/admin/letter-portal")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all"
          >
            <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" /> <span className="truncate">Letter Review</span>
          </button>
          <button
            onClick={() => router.push("/admin/rules-engine")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs lg:text-sm font-bold rounded-2xl transition-all col-span-2 sm:col-span-1"
          >
            <Settings className="w-4 h-4 shrink-0" /> <span className="truncate">Global Settings</span>
          </button>
        </div>
      </header>

      {/* Top Stats Grid layout matching exactly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {/* Active Students */}
        <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-2xl lg:rounded-3xl group hover:border-slate-600 transition-all">
          <div className="flex justify-between items-start mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-slate-950 rounded-xl lg:rounded-2xl border border-slate-800 text-indigo-400">
              <Users className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Real-Time</span>
          </div>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Active Students</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">
            {usersLoading ? "..." : stats.totalStudents.toLocaleString()}
          </p>
        </div>

        {/* Avg Readiness */}
        <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-2xl lg:rounded-3xl group hover:border-slate-600 transition-all">
          <div className="flex justify-between items-start mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-slate-950 rounded-xl lg:rounded-2xl border border-slate-800 text-emerald-400">
              <GraduationCap className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Real-Time</span>
          </div>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Avg Readiness</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">
            {studentsLoading ? "..." : stats.avgReadiness !== null ? `${stats.avgReadiness}%` : "—"}
          </p>
          <p className="text-[9px] text-slate-550 mt-1">Based on GREEN / YELLOW / RED profiles</p>
        </div>

        {/* Lead Conversion */}
        <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-2xl lg:rounded-3xl group hover:border-slate-600 transition-all">
          <div className="flex justify-between items-start mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-slate-950 rounded-xl lg:rounded-2xl border border-slate-800 text-amber-450">
              <Rocket className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Real-Time</span>
          </div>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Lead Conversion</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">
            {leadsLoading ? "..." : `${stats.conversionRate}%`}
          </p>
        </div>

        {/* Retention Rate */}
        <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-2xl lg:rounded-3xl group hover:border-slate-600 transition-all">
          <div className="flex justify-between items-start mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-slate-950 rounded-xl lg:rounded-2xl border border-slate-800 text-rose-400">
              <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Real-Time</span>
          </div>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Retention Rate</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">
            {studentsLoading ? "..." : stats.retentionRate !== null ? `${stats.retentionRate}%` : "—"}
          </p>
          <p className="text-[9px] text-slate-500 mt-1">
            {stats.retainedCount} active in last 90 days
          </p>
        </div>
      </div>

      {/* Student Inactivity Callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 lg:gap-6">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="p-3 lg:p-4 bg-amber-500/10 rounded-xl lg:rounded-2xl border border-amber-500/20 shrink-0">
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">Student Inactivity Monitor</h3>
              <p className="text-sm lg:text-base text-slate-400">
                <span className="text-amber-400 font-bold">{stats.inactiveCount} student{stats.inactiveCount === 1 ? "" : "s"}</span>{" "}
                with no meeting/contact in the last 30 days
                {stats.inactiveCount > 0 ? " — review Mentor Ops to re-engage." : "."}
              </p>
            </div>
          </div>
          {stats.inactiveCount > 0 && (
            <button
              onClick={() => router.push("/admin/mentors")}
              className="px-5 py-2.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl hover:bg-amber-600/30 transition-all cursor-pointer"
            >
              Open Mentor Ops
            </button>
          )}
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden lg:block">
          <Hourglass size={160} className="text-amber-500" />
        </div>
      </div>

      {/* Urgent Alerts layout matching exactly */}
      {urgentAlerts.length > 0 && (
        <div className="grid gap-4">
          {urgentAlerts.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 lg:p-6 rounded-2xl lg:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all shadow-xl ${
                notification.type === "URGENT"
                  ? "bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 shadow-rose-500/5"
                  : notification.type === "WARNING"
                  ? "bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 shadow-amber-500/5"
                  : "bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 shadow-indigo-500/5"
              }`}
            >
              <div className="flex items-start sm:items-center gap-3 lg:gap-4 min-w-0">
                <div className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl border shrink-0 ${
                  notification.type === "URGENT"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    : notification.type === "WARNING"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}>
                  <ShieldAlert className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-black text-white tracking-tight text-sm lg:text-base">{notification.title}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border animate-pulse capitalize ${
                      notification.type === "URGENT"
                        ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                        : notification.type === "WARNING"
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    }`}>
                      {notification.type.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-slate-400 font-medium line-clamp-2">{notification.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <button
                  onClick={() => {
                    if (notification.actionType === "LOR") {
                      router.push("/admin/letter-portal");
                    } else if (notification.actionType === "LEAD" && notification.relatedId) {
                      setSelectedLeadId(notification.relatedId);
                    }
                    // Always mark it read in the database when action is taken
                    markNotificationRead.mutate(notification.id);
                  }}
                  className="flex-1 sm:flex-none px-4 lg:px-6 py-2.5 lg:py-3 bg-rose-600 hover:bg-rose-500 text-white text-[10px] lg:text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-600/20"
                >
                  {notification.actionType === "LEAD" ? "Contact Lead" : notification.actionType === "LOR" ? "Review Letter" : "Acknowledge"}
                </button>
                <button
                  onClick={() => {
                    // Instantly mark read/dismiss from database
                    markNotificationRead.mutate(notification.id);
                  }}
                  className="p-2.5 lg:p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-rose-450 transition-all"
                  title="Dismiss Notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts & Distribution Section */}
      <div className="space-y-6">
        {/* Mentor Performance Analytics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-4 lg:p-8 flex flex-col h-[400px] lg:h-[650px] w-full relative overflow-hidden group/chart">
          {/* Subtle background glow effect */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none hidden lg:block" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none hidden lg:block" />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between lg:gap-4 mb-4 lg:mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-2 lg:gap-3 mb-1">
                <div className="p-1.5 lg:p-2 bg-indigo-500/20 rounded-lg lg:rounded-xl border border-indigo-500/30">
                  <Activity className="text-indigo-400 w-4 h-4 lg:w-5 lg:h-5 animate-pulse" />
                </div>
                <h3 className="text-base lg:text-2xl font-black text-white tracking-tight">
                  Mentor Performance
                </h3>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 ml-8 lg:ml-12">12-Month Comparative Growth & Compliance</p>
            </div>
            <div className="flex bg-slate-950 p-1 lg:p-1.5 rounded-xl lg:rounded-2xl border border-slate-800 shadow-2xl">
              <button
                type="button"
                onClick={() => setPerformanceTab("COMPLIANCE")}
                className={`px-3 lg:px-6 py-2 lg:py-2.5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-lg lg:rounded-xl transition-all ${
                  performanceTab === "COMPLIANCE"
                    ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Compliance
              </button>
              <button
                type="button"
                onClick={() => setPerformanceTab("STRENGTH")}
                className={`px-3 lg:px-6 py-2 lg:py-2.5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-lg lg:rounded-xl transition-all ${
                  performanceTab === "STRENGTH"
                    ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Strength Gain
              </button>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 relative z-10">
            {chartMentors.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/20 p-6 text-center">
                <Activity className="mb-3 h-10 w-10 text-slate-700" />
                <p className="text-sm font-semibold text-white">No mentors to chart</p>
                <p className="mt-1 text-xs text-slate-500">Add mentors to see compliance and strength trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={
                    performanceTab === "COMPLIANCE"
                      ? mentorPerformanceData.complianceTrend
                      : mentorPerformanceData.strengthTrend
                  }
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    {chartMentors.map((mentor, idx) => {
                      const color = MENTOR_CHART_COLORS[idx % MENTOR_CHART_COLORS.length];
                      return (
                        <linearGradient
                          key={`grad-${mentor.id}`}
                          id={`color-${mentor.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="10 10" stroke="#1e293b" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="month"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={performanceTab === "COMPLIANCE" ? [0, 100] : [0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #1e293b",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, paddingBottom: 20 }}
                  />
                  {performanceTab === "COMPLIANCE" && (
                    <ReferenceLine
                      y={90}
                      stroke="#10b981"
                      strokeDasharray="3 3"
                      label={{ value: "TARGET", position: "right", fill: "#10b981", fontSize: 10 }}
                    />
                  )}
                  {chartMentors.map((mentor, idx) => {
                    const shortName = mentor.name?.split(" ")[0] || mentor.email || "Mentor";
                    const color = MENTOR_CHART_COLORS[idx % MENTOR_CHART_COLORS.length];
                    return (
                      <Area
                        key={mentor.id}
                        type="monotone"
                        dataKey={shortName}
                        stroke={color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#color-${mentor.id})`}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 lg:mt-8 p-4 lg:p-6 bg-gradient-to-r from-slate-950/80 to-slate-900/50 rounded-2xl lg:rounded-[2rem] border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 lg:gap-6 relative z-10 backdrop-blur-sm">
            <div className="flex items-center gap-3 lg:gap-4">
              <div
                className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-xl ${
                  performanceTab === "COMPLIANCE"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-500 block tracking-[0.2em] uppercase mb-1">
                  Global Metrics Summary
                </span>
                <span className="text-xs lg:text-sm font-bold text-slate-200">
                  {performanceTab === "COMPLIANCE"
                    ? "Average Compliance Rate"
                    : "Aggregate Monthly Strength Growth"}
                </span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</p>
                <p className="text-[10px] font-bold text-slate-500">From meetings & mentor profiles</p>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-white tracking-tighter">
                {performanceTab === "COMPLIANCE"
                  ? stats.avgCompliance !== null
                    ? `${stats.avgCompliance}%`
                    : "—"
                  : `+${avgStrengthGrowth}`}
                {performanceTab === "STRENGTH" && (
                  <span className="ml-1 text-sm font-bold text-slate-500">pts</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Readiness Distribution Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base lg:text-xl font-bold text-white">Readiness Distribution</h3>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-rose-500" />
              </div>
            </div>
            {studentsLoading ? (
              <div className="flex items-center justify-center h-36 lg:h-48 text-slate-500 text-sm">Loading…</div>
            ) : (
              <div className="space-y-4 h-36 lg:h-48 flex flex-col justify-center">
                {[
                  { label: "Green", count: stats.readinessDist.green, color: "bg-emerald-500", text: "text-emerald-400" },
                  { label: "Yellow", count: stats.readinessDist.yellow, color: "bg-amber-500", text: "text-amber-400" },
                  { label: "Red", count: stats.readinessDist.red, color: "bg-rose-500", text: "text-rose-400" },
                ].map((row) => {
                  const total = Math.max(stats.totalStudents, 1);
                  const pct = Math.round((row.count / total) * 100);
                  return (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className={`font-bold ${row.text}`}>{row.label}</span>
                        <span className="text-slate-400 font-bold">
                          {row.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Course Submissions Inbox */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-white">Course Submissions Inbox</h3>
              <button
                type="button"
                onClick={() => router.push("/admin/courses")}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                View All
              </button>
            </div>
            {submissionsLoading ? (
              <div className="flex h-36 items-center justify-center text-sm text-slate-500">Loading…</div>
            ) : courseSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 lg:h-48 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20 p-4 text-center">
                <FileCheck className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs font-bold text-white mb-1">No pending submissions</p>
                <p className="text-[10px] text-slate-500">Worksheet & certificate reviews will show here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseSubmissions.slice(0, 5).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => router.push("/admin/courses")}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-left transition-colors hover:border-indigo-500/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {sub.student?.name || sub.student?.email || "Student"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {sub.course?.title || "Course"} · {sub.type}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Review
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mentor Roster */}
      <section className="space-y-4 lg:space-y-6 relative z-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-2 lg:p-3 bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-800 shadow-lg shrink-0">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg lg:text-2xl font-bold text-white tracking-tight">Mentor Roster</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Total: <span className="text-white">{usersLoading ? "..." : mentors.length}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                <div
                  className={`w-2 h-2 rounded-full ${
                    (stats.avgCompliance ?? 0) >= 80
                      ? "bg-emerald-500"
                      : (stats.avgCompliance ?? 0) >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                />
                <span className="text-xs font-bold text-slate-200">
                  {stats.avgCompliance !== null ? `${stats.avgCompliance}%` : "—"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Avg Compliance
                </span>
              </div>
            </div>

            <div className="relative w-full md:w-[280px]">
              <input
                type="text"
                placeholder="Search mentors..."
                value={mentorSearch}
                onChange={(e) => setMentorSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-all shadow-xl"
              />
            </div>
          </div>
        </div>

        {usersLoading || mentorsLoading ? (
          <div className="text-center py-12 text-slate-500">Loading mentors list...</div>
        ) : filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredMentors.map((mentor) => {
              const metrics = mentorMetrics.get(mentor.id);
              return (
              <div
                key={mentor.id}
                className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-2xl lg:rounded-3xl group hover:border-indigo-500/30 transition-all shadow-xl space-y-3 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-8"
              >
                <div className="flex items-center gap-3 lg:gap-4 lg:min-w-[200px]">
                  <div className="relative shrink-0">
                    {mentor.avatar ? (
                      <img src={mentor.avatar} className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl object-cover border border-slate-800 group-hover:border-indigo-500/50 transition-all shadow-lg" alt="" />
                    ) : (
                      <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-slate-950 flex items-center justify-center font-bold text-indigo-400 border border-slate-800 shadow-md">
                        {mentor.name ? mentor.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "M"}
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 w-5 h-5 lg:w-6 lg:h-6 bg-indigo-600 rounded-lg flex items-center justify-center border-2 border-slate-950 shadow-lg">
                      <Zap className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base lg:text-lg font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors truncate">{mentor.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      {(mentor.studentIds || []).length} students
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 lg:flex lg:flex-1 gap-1.5 lg:gap-6 lg:justify-around">
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-indigo-400" /> Latency
                    </p>
                    <p className="text-[10px] font-bold text-white mt-1 tracking-wide">{metrics?.latency ?? "—"}</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <CalendarX className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-amber-400" /> No Mtg
                    </p>
                    <p className="text-[10px] font-bold text-white mt-1 tracking-wide">{metrics?.noMtg ?? 0}</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-rose-500" /> Overdue
                    </p>
                    <p className="text-[10px] font-bold text-white mt-1 tracking-wide">{metrics?.overdue ?? 0}</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <Target className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-indigo-400" /> No Tasks
                    </p>
                    <p className="text-[10px] font-bold text-white mt-1 tracking-wide">{metrics?.noTasks ?? 0}</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl col-span-2 lg:col-span-1">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <UserCheck className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-emerald-450" /> Compliance
                    </p>
                    <p className="text-[10px] font-bold text-white mt-1 tracking-wide">{metrics?.compliance ?? 0}%</p>
                  </div>
                </div>

                <div className="flex gap-2 lg:gap-3 flex-wrap">
                  <button
                    onClick={() => router.push("/admin/messages")}
                    className="p-2.5 lg:p-3 bg-slate-950 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-800 shadow-lg cursor-pointer"
                    title="Message Mentor"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push("/admin/mentors")}
                    className="px-3 lg:px-6 py-2.5 lg:py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-800 shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Students
                  </button>
                  <button
                    onClick={() => router.push("/admin/mentors")}
                    className="px-3 lg:px-6 py-2.5 lg:py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-800 shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Profile
                  </button>
                  <button
                    onClick={() => router.push("/admin/analytics")}
                    className="px-3 lg:px-6 py-2.5 lg:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Audit
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 p-12 rounded-3xl text-center">
            <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">No mentors matching "{mentorSearch}" found.</p>
          </div>
        )}
      </section>

      {/* Regional Density */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8">
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-8">
          <MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-rose-400 shrink-0" />
          <div>
            <h3 className="text-base lg:text-xl font-bold text-white">Shadowing Network Density</h3>
            <p className="text-xs text-slate-500">From student states and shadowing experiences</p>
          </div>
        </div>
        {experiencesLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading shadowing network…</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-6">
            {regionalDensity.map((r) => (
              <div key={r.region} className="p-6 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <p className="text-sm font-bold text-white mb-4">{r.region}</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Active Students</span>
                    <span className="text-white font-bold">{r.students}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Dentist Partners</span>
                    <span className="text-white font-bold">{r.dentists}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Shadowing Hours</span>
                    <span className="text-white font-bold">{r.hours}h</span>
                  </div>
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Shadowing Load</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          r.density === "Critical"
                            ? "bg-rose-500/10 text-rose-400"
                            : r.density === "High"
                              ? "bg-amber-500/10 text-amber-400"
                              : r.density === "Medium"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {r.density}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lead Details Modal verbatim styling */}
      {selectedLeadId && selectedLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <div>
                <h3 className="text-2xl font-bold text-white">Lead Details</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Information from Setter</p>
              </div>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-indigo-655 flex items-center justify-center text-indigo-400 text-2xl font-bold border border-slate-800">
                  {selectedLead.name ? selectedLead.name[0].toUpperCase() : "L"}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">{selectedLead.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    Source: {selectedLead.source}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
                  <Mail className="w-5 h-5 text-slate-550" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Email Address</p>
                    {selectedLead.email ? (
                      <a href={`mailto:${selectedLead.email}`} className="text-white font-medium hover:text-indigo-400 transition-colors block">
                        {selectedLead.email}
                      </a>
                    ) : (
                      <p className="text-white font-medium text-slate-550 italic">Not provided</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
                  <Phone className="w-5 h-5 text-slate-550" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Phone Number</p>
                    {selectedLead.phone ? (
                      <a href={`tel:${selectedLead.phone}`} className="text-white font-medium hover:text-indigo-400 transition-colors block">
                        {selectedLead.phone}
                      </a>
                    ) : (
                      <p className="text-white font-medium text-slate-550 italic">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-550 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3 h-3" /> Setter Notes
                  </p>
                  <div className="p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50 text-sm text-slate-350 leading-relaxed italic">
                    "{selectedLead.notes}"
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => {
                      updateLead.mutate({
                        id: selectedLead.id,
                        updates: { showedUp: selectedLead.showedUp === true ? null : true },
                      });
                    }}
                    className={`py-3 px-4 flex items-center justify-center gap-2 rounded-2xl font-bold transition-all border ${
                      selectedLead.showedUp === true
                        ? "bg-emerald-600 text-white border-emerald-550 shadow-lg shadow-emerald-600/20"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-emerald-450 hover:border-emerald-500/30"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" /> Qualified
                  </button>
                  <button
                    onClick={() => {
                      updateLead.mutate({
                        id: selectedLead.id,
                        updates: { showedUp: selectedLead.showedUp === false ? null : false },
                      });
                    }}
                    className={`py-3 px-4 flex items-center justify-center gap-2 rounded-2xl font-bold transition-all border ${
                      selectedLead.showedUp === false
                        ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-rose-450 hover:border-rose-500/30"
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Disqualified
                  </button>
                </div>
                {!selectedLead.contacted && (
                  <button
                    onClick={() => {
                      updateLead.mutate({ id: selectedLead.id, updates: { contacted: true } });
                      toast.success("Lead marked as contacted");
                    }}
                    className="w-full py-4 bg-emerald-600/10 border border-emerald-550/20 text-emerald-450 font-bold rounded-2xl transition-all hover:bg-emerald-600 hover:text-white flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" /> Mark as Contacted
                  </button>
                )}
                <button
                  onClick={() => setSelectedLeadId(null)}
                  className="w-full py-4 border border-slate-800 text-slate-500 font-bold rounded-2xl transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
