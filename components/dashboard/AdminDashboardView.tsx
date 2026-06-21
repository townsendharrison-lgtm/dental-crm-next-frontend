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
import { toast } from "sonner";
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { useLeads, useUpdateLead } from "@/lib/hooks/useLeads";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useNotifications, useMarkNotificationAsRead } from "@/lib/hooks/useNotifications";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Lead } from "@/lib/types";

export function AdminDashboardView() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"overview" | "assignments" | "analytics">("overview");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [mentorSearch, setMentorSearch] = useState("");

  // 1. Fetch real data using hooks
  const { data: users = [], isLoading: usersLoading } = useAdminUsers();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: lorRequests = [], isLoading: lorLoading } = useLorRequests();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(true);

  const markNotificationRead = useMarkNotificationAsRead();
  const updateLead = useUpdateLead();

  // 2. Filter students and mentors
  const students = useMemo(() => users.filter((u) => u.role === "STUDENT"), [users]);
  const mentors = useMemo(() => users.filter((u) => u.role === "MENTOR"), [users]);

  // 3. Aggregate urgent alerts
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

    // Filtered real notifications that are UNREAD from the database notification system
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

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;

    // Lead conversion rate
    const totalLeads = leads.length;
    const paidLeads = leads.filter((l) => l.isPaid).length;
    const conversionRate = totalLeads > 0 ? (paidLeads / totalLeads) * 100 : 0;

    return {
      totalStudents,
      conversionRate: Math.round(conversionRate),
    };
  }, [students, leads]);

  // Filtered mentors list
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) =>
      m.name.toLowerCase().includes(mentorSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(mentorSearch.toLowerCase())
    );
  }, [mentors, mentorSearch]);

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId);
  }, [leads, selectedLeadId]);

  if (activeView === "assignments") {
    return (
      <div className="space-y-6 pb-12">
        <header className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setActiveView("overview")}
              className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white mb-2 block transition-colors"
            >
              ← Back to Overview
            </button>
            <h2 className="text-3xl font-bold text-white mb-1">Student Assignments</h2>
            <p className="text-sm text-slate-400 lg:hidden">Assign new students to mentors and manage workloads.</p>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 p-8 text-center">
          <Users className="w-16 h-16 text-indigo-500/40 mb-4 animate-pulse" />
          <span className="px-3 py-1 text-xs font-bold tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase mb-3">
            Coming Soon
          </span>
          <h3 className="text-xl font-bold text-white mb-2">Student Assignments Module Integration Pending</h3>
          <p className="text-sm text-slate-500 max-w-lg mb-6">
            Student-mentor relationship mappings, accept/decline flows, active workload distribution charts, 
            and welcome templates require database schema migrations that are currently in progress.
          </p>
          <button
            onClick={() => setActiveView("overview")}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl border border-slate-800 transition-all"
          >
            Return to Dashboard Overview
          </button>
        </div>
      </div>
    );
  }

  if (activeView === "analytics") {
    return (
      <div className="space-y-6 pb-12">
        <header className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setActiveView("overview")}
              className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white mb-2 block transition-colors"
            >
              ← Back to Overview
            </button>
            <h2 className="text-3xl font-bold text-white mb-1">Platform Analytics</h2>
            <p className="text-sm text-slate-400 lg:hidden">Comprehensive dental school guide operational control & reports.</p>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 p-8 text-center">
          <BarChart3 className="w-16 h-16 text-rose-500/40 mb-4 animate-pulse" />
          <span className="px-3 py-1 text-xs font-bold tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full uppercase mb-3">
            Coming Soon
          </span>
          <h3 className="text-xl font-bold text-white mb-2">Operational Analytics Development Pending</h3>
          <p className="text-sm text-slate-500 max-w-lg mb-6">
            Advanced system-wide performance statistics, regional partner density analytics, and compliance log analytics 
            are scheduled for the next development iteration. No mock metrics are displayed.
          </p>
          <button
            onClick={() => setActiveView("overview")}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl border border-slate-800 transition-all"
          >
            Return to Dashboard Overview
          </button>
        </div>
      </div>
    );
  }

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
            onClick={() => setActiveView("assignments")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all"
          >
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />{" "}
            <span className="truncate">Student Assignments</span>
          </button>
          <button
            onClick={() => setActiveView("analytics")}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all"
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
            onClick={() => router.push("/admin/settings")}
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
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">Coming Soon</span>
          </div>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Avg Readiness</p>
          <p className="text-2xl lg:text-3xl font-black text-slate-450 mt-1">Coming Soon</p>
          <p className="text-[9px] text-slate-550 mt-1">Database schema integration pending</p>
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
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">Coming Soon</span>
          </div>
          <p className="text-slate-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Retention Rate</p>
          <p className="text-2xl lg:text-3xl font-black text-slate-450 mt-1">Coming Soon</p>
          <p className="text-[9px] text-slate-550 mt-1">Customer cohort logs pending</p>
        </div>
      </div>

      {/* Student Inactivity Callout (Coming soon state styled verbatim from original layout) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 lg:gap-6">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="p-3 lg:p-4 bg-amber-500/10 rounded-xl lg:rounded-2xl border border-amber-500/20 shrink-0">
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">Student Inactivity Monitor</h3>
              <p className="text-sm lg:text-base text-slate-400">
                <span className="text-amber-400 font-bold">Coming Soon</span> — Meeting scheduler integration will automatically flag students inactive past 30 days.
              </p>
            </div>
          </div>
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
              <button className="px-3 lg:px-6 py-2 lg:py-2.5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-lg lg:rounded-xl bg-indigo-650 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all">
                Compliance
              </button>
              <button className="px-3 lg:px-6 py-2 lg:py-2.5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-lg lg:rounded-xl text-slate-500 hover:text-slate-350 transition-all">
                Strength Gain
              </button>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 relative z-10 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-3xl bg-slate-950/20 p-6 text-center">
            <Activity className="w-14 h-14 text-slate-700 mb-4 animate-pulse" />
            <span className="px-3 py-1 text-[10px] font-black tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase mb-2">
              Coming Soon
            </span>
            <h4 className="text-sm font-bold text-white mb-1">Historical Performance Graph Pending</h4>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              12-month comparative compliance trends and strength logs are not yet implemented in the database. Real trends will plot once history tables are active.
            </p>
          </div>

          <div className="mt-4 lg:mt-8 p-4 lg:p-6 bg-gradient-to-r from-slate-950/80 to-slate-900/50 rounded-2xl lg:rounded-[2rem] border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 lg:gap-6 relative z-10 backdrop-blur-sm">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-xl bg-indigo-500/20 text-indigo-400">
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-500 block tracking-[0.2em] uppercase mb-1">
                  Global Metrics Summary
                </span>
                <span className="text-xs lg:text-sm font-bold text-slate-200">
                  Average Compliance Rate
                </span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Coming Soon</p>
                <p className="text-[10px] font-bold text-slate-550">System Confidence: —</p>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-400 tracking-tighter">
                Coming Soon
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
            <div className="flex flex-col items-center justify-center h-36 lg:h-48 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20 p-4 text-center">
              <GraduationCap className="w-10 h-10 text-slate-700 mb-2 animate-pulse" />
              <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full uppercase mb-1">
                Coming Soon
              </span>
              <p className="text-xs font-bold text-white mb-1">Readiness distribution map pending</p>
              <p className="text-[10px] text-slate-500">Student evaluation matrices not yet integrated.</p>
            </div>
          </div>

          {/* Course Submissions Inbox */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8">
            <h3 className="text-xl font-bold text-white mb-6">Course Submissions Inbox</h3>
            <div className="flex flex-col items-center justify-center h-36 lg:h-48 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20 p-4 text-center">
              <FileCheck className="w-10 h-10 text-slate-700 mb-2 animate-pulse" />
              <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase mb-1">
                Coming Soon
              </span>
              <p className="text-xs font-bold text-white mb-1">Course submissions feed pending</p>
              <p className="text-[10px] text-slate-500">shadowing worksheet & certificate modules pending deployment.</p>
            </div>
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
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl cursor-help hover:bg-slate-800 transition-colors">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs font-bold text-slate-400">—</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliance Status (Coming Soon)</span>
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

        {usersLoading ? (
          <div className="text-center py-12 text-slate-500">Loading mentors list...</div>
        ) : filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredMentors.map((mentor, idx) => (
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
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Mentor Profile</p>
                  </div>
                </div>

                {/* Styled columns mirroring old dashboard verbatim, with Coming Soon values */}
                <div className="grid grid-cols-3 lg:flex lg:flex-1 gap-1.5 lg:gap-6 lg:justify-around">
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-indigo-400" /> Latency
                    </p>
                    <p className="text-[10px] font-bold text-slate-550 mt-1 tracking-wide">Coming Soon</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <CalendarX className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-amber-400" /> No Mtg
                    </p>
                    <p className="text-[10px] font-bold text-slate-550 mt-1 tracking-wide">Coming Soon</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-rose-500" /> Overdue
                    </p>
                    <p className="text-[10px] font-bold text-slate-550 mt-1 tracking-wide">Coming Soon</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <Target className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-indigo-400" /> No Tasks
                    </p>
                    <p className="text-[10px] font-bold text-slate-550 mt-1 tracking-wide">Coming Soon</p>
                  </div>
                  <div className="text-center p-2 bg-slate-950/50 lg:bg-transparent rounded-xl col-span-2 lg:col-span-1">
                    <p className="text-[9px] lg:text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <UserCheck className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-emerald-450" /> Compliance
                    </p>
                    <p className="text-[10px] font-bold text-slate-550 mt-1 tracking-wide">Coming Soon</p>
                  </div>
                </div>

                <div className="flex gap-2 lg:gap-3 flex-wrap">
                  <button
                    onClick={() => toast.info("Direct messaging module coming soon")}
                    className="p-2.5 lg:p-3 bg-slate-950 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-800 shadow-lg"
                    title="Message Mentor"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toast.info("Students roster assignments coming soon")}
                    className="px-3 lg:px-6 py-2.5 lg:py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-800 shadow-lg flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Students
                  </button>
                  <button
                    onClick={() => toast.info("Mentor profile details coming soon")}
                    className="px-3 lg:px-6 py-2.5 lg:py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-800 shadow-lg flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Profile
                  </button>
                  <button
                    onClick={() => toast.info("Audit dashboard coming soon")}
                    className="px-3 lg:px-6 py-2.5 lg:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 p-12 rounded-3xl text-center">
            <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">No mentors matching "{mentorSearch}" found.</p>
          </div>
        )}
      </section>

      {/* Regional Density verbatim styling */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8">
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-8">
          <MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-rose-450 shrink-0" />
          <h3 className="text-base lg:text-xl font-bold text-white">Shadowing Network Density</h3>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-6">
          {[
            { region: "Northeast" },
            { region: "Southeast" },
            { region: "West Coast" },
          ].map((r, i) => (
            <div key={i} className="p-6 bg-slate-950/50 border border-slate-800 rounded-2xl">
              <p className="text-sm font-bold text-white mb-4">{r.region}</p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Active Students</span>
                  <span className="text-slate-400 font-bold">—</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Dentist Partners</span>
                  <span className="text-slate-400 font-bold">—</span>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Shadowing Load</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
