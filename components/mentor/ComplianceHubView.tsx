"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";
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
  unassignedCount: number;
  onOpenChat: (mentorId: string) => void;
  onSendNudge: (mentorId: string, mentorName: string, reason?: string) => void;
  onAuditMentor: (mentorId: string) => void;
  mentorsHref?: string;
  nudgesHref?: string;
  slaHref?: string;
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone: "rose" | "amber" | "indigo" | "emerald";
}) {
  const tones = {
    rose: "border-rose-500/20 bg-rose-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    indigo: "border-indigo-500/20 bg-indigo-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-xl border p-4", tones[tone])}>
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">{icon}</div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
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
  unassignedCount,
  onOpenChat,
  onSendNudge,
  onAuditMentor,
  mentorsHref = "/mentor-manager/mentors",
  nudgesHref = "/mentor-manager/alerts",
  slaHref = "/mentor-manager/reporting",
}: ComplianceHubViewProps) {
  const topRisk = [...rows]
    .filter((r) => r.band !== "compliant")
    .sort((a, b) => a.complianceScore - b.complianceScore)
    .slice(0, 6);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Compliance Hub</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Live mentorship SLA health from meetings, tasks, and response latency.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={nudgesHref}>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              Active Nudges
            </Button>
          </Link>
          <Link href={slaHref}>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              SLA Report
            </Button>
          </Link>
          <Link href={mentorsHref}>
            <Button size="sm">Mentor List</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="SLA Breaches"
          value={summary.slaBreaches.length}
          hint="Latency, overdue tasks, or meeting gaps"
          icon={<ShieldAlert className="h-4 w-4 text-rose-400" />}
          tone="rose"
        />
        <KpiCard
          label="At Risk"
          value={summary.atRisk.length}
          hint="Compliance 80–89%"
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          tone="amber"
        />
        <KpiCard
          label="Unassigned Students"
          value={unassignedCount}
          hint="Need mentor assignment"
          icon={<Users className="h-4 w-4 text-indigo-400" />}
          tone="indigo"
        />
        <KpiCard
          label="Avg Compliance"
          value={`${summary.avgCompliance}%`}
          hint={`${summary.compliant.length} mentors at 90%+`}
          icon={<UserCheck className="h-4 w-4 text-emerald-400" />}
          tone="emerald"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Priority Intelligence</h3>
        </div>
        {insights.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <EmptyState
              icon={<UserCheck className="h-8 w-8" />}
              title="All clear"
              description="No burnout, latency, or engagement signals right now."
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    tagTone[insight.tagTone],
                  )}
                >
                  {insight.tag}
                </span>
                <h4 className="mt-3 text-base font-semibold text-white">{insight.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{insight.detail}</p>
                {insight.mentorId && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSendNudge(insight.mentorId!, insight.title, insight.detail)}
                    >
                      Nudge
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
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
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Active Operational Alerts</h3>
          <Link
            href={nudgesHref}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            View all nudges
          </Link>
        </div>
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-5 text-sm text-emerald-300">
            No operational SLA alerts — mentors are within thresholds.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3.5",
                  alert.severity === "urgent"
                    ? "border-rose-500/25 bg-rose-500/5"
                    : "border-amber-500/25 bg-amber-500/5",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{alert.message}</p>
                </div>
                {alert.mentorId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
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
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Mentors needing attention</h3>
            <p className="text-xs text-slate-500">Critical and at-risk roster snapshot</p>
          </div>
          <Link href={mentorsHref}>
            <Button size="sm" variant="outline">
              Full roster
            </Button>
          </Link>
        </div>

        {topRisk.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <EmptyState
              icon={<ShieldAlert className="h-8 w-8" />}
              title="Everyone compliant"
              description="No mentors are currently in critical or at-risk bands."
            />
          </div>
        ) : (
          <div className="grid gap-3">
            {topRisk.map((row) => (
              <div
                key={row.mentor.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={row.name} src={row.mentor.avatar} size="md" className="rounded-xl" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-semibold text-white">{row.name}</h4>
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
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.studentCount} students · Latency {row.latencyLabel} · Compliance{" "}
                      {row.complianceScore}%
                    </p>
                    {row.issues[0] && (
                      <p className="mt-1 text-xs text-slate-400">{row.issues[0]}</p>
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
