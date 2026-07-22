"use client";

import React, { useMemo, useState } from "react";
import { Download, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";
import type { MentorComplianceRow } from "@/lib/utils/mentorCompliance";

interface SlaReportViewProps {
  rows: MentorComplianceRow[];
  summary: {
    critical: MentorComplianceRow[];
    atRisk: MentorComplianceRow[];
    compliant: MentorComplianceRow[];
    slaBreaches: MentorComplianceRow[];
    avgCompliance: number;
    totalMentors: number;
  };
  onAuditMentor: (mentorId: string) => void;
  onSendNudge: (mentorId: string, mentorName: string, reason?: string) => void;
}

export default function SlaReportView({
  rows,
  summary,
  onAuditMentor,
  onSendNudge,
}: SlaReportViewProps) {
  const [search, setSearch] = useState("");
  const [band, setBand] = useState<"all" | "critical" | "at_risk" | "compliant">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rows]
      .filter((r) => (band === "all" ? true : r.band === band))
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.mentor.email?.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (a.slaBreach !== b.slaBreach) return a.slaBreach ? -1 : 1;
        return a.complianceScore - b.complianceScore;
      });
  }, [rows, search, band]);

  const exportCsv = () => {
    const header = [
      "Mentor",
      "Email",
      "Students",
      "LatencyHours",
      "Compliance",
      "Band",
      "NoMeeting",
      "OverdueTasks",
      "SLABreach",
    ];
    const lines = filtered.map((r) =>
      [
        r.name,
        r.mentor.email || "",
        r.studentCount,
        r.latencyHours,
        r.complianceScore,
        r.band,
        r.studentsWithoutMeeting,
        r.overdueTasks,
        r.slaBreach ? "yes" : "no",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sla-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">SLA Report</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Mentor latency, compliance bands, and meeting/task SLA gaps.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Mentors
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.totalMentors}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            SLA breaches
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.slaBreaches.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">At risk</p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.atRisk.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Avg compliance
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.avgCompliance}%</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mentors…"
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/50 p-1">
          {(
            [
              ["all", "All"],
              ["critical", "Critical"],
              ["at_risk", "At risk"],
              ["compliant", "Compliant"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBand(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                band === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-8 w-8" />}
          title="No mentors match"
          description="Try a different band or search."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Mentor</th>
                <th className="px-4 py-3 font-bold">Students</th>
                <th className="px-4 py-3 font-bold">Latency</th>
                <th className="px-4 py-3 font-bold">No meeting</th>
                <th className="px-4 py-3 font-bold">Overdue</th>
                <th className="px-4 py-3 font-bold">Compliance</th>
                <th className="px-4 py-3 font-bold">Band</th>
                <th className="px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((row) => (
                <tr key={row.mentor.id} className="bg-slate-950/30 hover:bg-slate-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={row.name}
                        src={row.mentor.avatar}
                        size="sm"
                        className="rounded-lg"
                      />
                      <div>
                        <p className="font-semibold text-white">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.mentor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">{row.studentCount}</td>
                  <td
                    className={cn(
                      "px-4 py-3 font-semibold tabular-nums",
                      row.latencyHours > 12 ? "text-rose-400" : "text-slate-300",
                    )}
                  >
                    {row.latencyLabel}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">
                    {row.studentsWithoutMeeting}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">{row.overdueTasks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          row.complianceScore < 80 ? "text-rose-400" : "text-white",
                        )}
                      >
                        {row.complianceScore}%
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            row.complianceScore < 80
                              ? "bg-rose-500"
                              : row.complianceScore < 90
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                          style={{ width: `${row.complianceScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        row.band === "critical"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : row.band === "at_risk"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                      )}
                    >
                      {row.band === "at_risk" ? "At risk" : row.band}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => onAuditMentor(row.mentor.id)}>
                        Audit
                      </Button>
                      {(row.slaBreach || row.band !== "compliant") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            onSendNudge(row.mentor.id, row.name, row.issues.join(" · "))
                          }
                        >
                          Nudge
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
