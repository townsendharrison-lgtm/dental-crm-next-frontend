"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";
import type { MentorComplianceRow, OperationalAlert } from "@/lib/utils/mentorCompliance";

interface ActiveNudgesViewProps {
  alerts: OperationalAlert[];
  rows: MentorComplianceRow[];
  onSendNudge: (mentorId: string, mentorName: string, reason?: string) => void;
  onOpenChat: (mentorId: string) => void;
  onAuditMentor: (mentorId: string) => void;
}

export default function ActiveNudgesView({
  alerts,
  rows,
  onSendNudge,
  onOpenChat,
  onAuditMentor,
}: ActiveNudgesViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "urgent" | "warning">("all");
  const [nudgingId, setNudgingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (filter !== "all" && a.severity !== filter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        (a.mentorName || "").toLowerCase().includes(q)
      );
    });
  }, [alerts, filter, search]);

  const handleNudge = async (alert: OperationalAlert) => {
    if (!alert.mentorId) return;
    setNudgingId(alert.id);
    try {
      await Promise.resolve(
        onSendNudge(alert.mentorId, alert.mentorName || "Mentor", alert.message),
      );
    } finally {
      setNudgingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      <div>
        <h2 className="text-lg font-semibold text-white">Active Nudges</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Operational alerts derived from SLA breaches, meeting gaps, and caseload pressure.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Urgent</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {alerts.filter((a) => a.severity === "urgent").length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Warnings</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {alerts.filter((a) => a.severity === "warning").length}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Mentors flagged
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {new Set(alerts.map((a) => a.mentorId).filter(Boolean)).size}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts…"
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/50 p-1">
          {(["all", "urgent", "warning"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                filter === key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-8 w-8" />}
          title="No active nudges"
          description={
            search || filter !== "all"
              ? "Try adjusting filters."
              : "All mentors are within operational thresholds."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const row = rows.find((r) => r.mentor.id === alert.mentorId);
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-xl border p-4",
                  alert.severity === "urgent"
                    ? "border-rose-500/25 bg-rose-500/5"
                    : "border-amber-500/25 bg-amber-500/5",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                        alert.severity === "urgent"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-400",
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{alert.title}</h3>
                        <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {alert.reason.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                      {row && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Avatar
                            name={row.name}
                            src={row.mentor.avatar}
                            size="sm"
                            className="rounded-lg"
                          />
                          <span>
                            Compliance {row.complianceScore}% · Latency {row.latencyLabel} ·{" "}
                            {row.studentCount} students
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alert.mentorId && (
                      <>
                        <Button
                          size="sm"
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          isLoading={nudgingId === alert.id}
                          onClick={() => void handleNudge(alert)}
                        >
                          Send Nudge
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                          onClick={() => onOpenChat(alert.mentorId!)}
                        >
                          Chat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAuditMentor(alert.mentorId!)}
                        >
                          Audit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
