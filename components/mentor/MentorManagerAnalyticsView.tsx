"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  UserX,
  Clock,
  ArrowRight,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import AdminAnalyticsView from "@/components/admin/AdminAnalyticsView";
import type { PlatformAnalytics } from "@/lib/api/admin";
import type { MentorComplianceRow } from "@/lib/utils/mentorCompliance";
import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/ui/EmptyState";

interface MentorManagerAnalyticsViewProps {
  platform: PlatformAnalytics;
  summary: {
    critical: MentorComplianceRow[];
    atRisk: MentorComplianceRow[];
    compliant: MentorComplianceRow[];
    slaBreaches: MentorComplianceRow[];
    avgCompliance: number;
    totalMentors: number;
  };
  complianceRows: MentorComplianceRow[];
  unassignedCount: number;
  studentCount: number;
  complianceHref?: string;
  slaHref?: string;
  nudgesHref?: string;
}

function OpsKpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  tone: "rose" | "amber" | "indigo" | "emerald" | "slate";
}) {
  const wrap = {
    rose: "border-rose-500/20 bg-rose-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    indigo: "border-indigo-500/20 bg-indigo-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    slate: "border-slate-800 bg-slate-900/40",
  }[tone];
  const iconTone = {
    rose: "text-rose-400",
    amber: "text-amber-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    slate: "text-slate-300",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-4", wrap)}>
      <div className="mb-3 flex items-center justify-between">
        <div className={cn("rounded-lg border border-slate-800 bg-slate-950/50 p-2", iconTone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

const BAND_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  at_risk: "#f59e0b",
  compliant: "#10b981",
};

export default function MentorManagerAnalyticsView({
  platform,
  summary,
  complianceRows,
  unassignedCount,
  studentCount,
  complianceHref = "/mentor-manager/compliance-hub",
  slaHref = "/mentor-manager/reporting",
  nudgesHref = "/mentor-manager/alerts",
}: MentorManagerAnalyticsViewProps) {
  const caseloadData = useMemo(
    () =>
      [...complianceRows]
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 10)
        .map((r) => ({
          name: r.name.split(" ")[0] || r.name,
          fullName: r.name,
          students: r.studentCount,
          compliance: r.complianceScore,
          band: r.band,
        })),
    [complianceRows],
  );

  const latencyData = useMemo(
    () =>
      [...complianceRows]
        .filter((r) => r.latencyHours > 0)
        .sort((a, b) => b.latencyHours - a.latencyHours)
        .slice(0, 10)
        .map((r) => ({
          name: r.name.split(" ")[0] || r.name,
          fullName: r.name,
          hours: Math.round(r.latencyHours * 10) / 10,
          slaRisk: r.latencyHours > 12,
        })),
    [complianceRows],
  );

  const avgLatency = useMemo(() => {
    if (complianceRows.length === 0) return 0;
    const sum = complianceRows.reduce((acc, r) => acc + (r.latencyHours || 0), 0);
    return Math.round((sum / complianceRows.length) * 10) / 10;
  }, [complianceRows]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Mentorship ops snapshot — live compliance data */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Mentorship operations</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Live compliance, SLA, and caseload signals across your mentor roster
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={complianceHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
            >
              Compliance Hub
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href={slaHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
            >
              SLA Report
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href={nudgesHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
            >
              Active Nudges
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <OpsKpi
            label="Avg compliance"
            value={`${summary.avgCompliance}%`}
            hint={`${summary.totalMentors} mentors`}
            icon={ShieldAlert}
            tone={summary.avgCompliance >= 90 ? "emerald" : summary.avgCompliance >= 80 ? "amber" : "rose"}
          />
          <OpsKpi
            label="SLA breaches"
            value={summary.slaBreaches.length}
            hint="Mentors outside SLA"
            icon={AlertTriangle}
            tone={summary.slaBreaches.length > 0 ? "rose" : "emerald"}
          />
          <OpsKpi
            label="Critical"
            value={summary.critical.length}
            hint="Compliance under 80%"
            icon={Activity}
            tone={summary.critical.length > 0 ? "rose" : "slate"}
          />
          <OpsKpi
            label="At risk"
            value={summary.atRisk.length}
            hint="80–89% band"
            icon={Clock}
            tone={summary.atRisk.length > 0 ? "amber" : "slate"}
          />
          <OpsKpi
            label="Unassigned"
            value={unassignedCount}
            hint="Students without mentor"
            icon={UserX}
            tone={unassignedCount > 0 ? "amber" : "emerald"}
          />
          <OpsKpi
            label="Students"
            value={studentCount}
            hint={`Avg latency ${avgLatency}h`}
            icon={Users}
            tone="indigo"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Mentor caseload</h3>
                <p className="text-xs text-slate-500">Top 10 by assigned students</p>
              </div>
            </div>
            {caseloadData.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No mentor caseloads"
                description="Caseload appears once mentors have assigned students."
              />
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={caseloadData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
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
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#1e293b", opacity: 0.4 }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(value, _name, item) => [
                        value,
                        `${(item?.payload as { fullName?: string })?.fullName || "Students"} · students`,
                      ]}
                    />
                    <Bar dataKey="students" name="Students" radius={[4, 4, 0, 0]} barSize={22}>
                      {caseloadData.map((entry) => (
                        <Cell key={entry.fullName} fill={BAND_COLOR[entry.band] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Response latency</h3>
                <p className="text-xs text-slate-500">Hours — bars over 12h exceed SLA</p>
              </div>
            </div>
            {latencyData.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                title="No latency data"
                description="Mentor response times will show once profiles have averages set."
              />
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
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
                      unit="h"
                    />
                    <Tooltip
                      cursor={{ fill: "#1e293b", opacity: 0.4 }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(value, _name, item) => [
                        `${value}h`,
                        (item?.payload as { fullName?: string })?.fullName || "Latency",
                      ]}
                    />
                    <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]} barSize={22}>
                      {latencyData.map((entry) => (
                        <Cell
                          key={entry.fullName}
                          fill={entry.slaRisk ? "#f43f5e" : "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cohort / outcomes — real platform analytics */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Cohort outcomes</h2>
            <p className="text-xs text-slate-500">
              Application, interview, and acceptance analytics from live student data
            </p>
          </div>
        </div>
        <AdminAnalyticsView data={platform} hideMarketingTools />
      </section>
    </div>
  );
}
