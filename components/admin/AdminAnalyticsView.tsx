"use client";

import React, { useMemo, useState } from "react";
import {
  Users,
  Activity,
  School as SchoolIcon,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  Trophy,
  Target,
  Info,
  Copy,
  Check,
  Zap,
  Download,
} from "lucide-react";
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
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Badge, Button, EmptyState, Input, SelectMenu } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import type { PlatformAnalytics, AnalyticsStudentRow } from "@/lib/api/admin";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const CHART_TOOLTIP = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "12px",
};

function SectionCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  action,
  children,
  className,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-600">{sub}</p>}
    </div>
  );
}

function AlertList({
  title,
  count,
  tone,
  items,
  empty,
}: {
  title: string;
  count: number;
  tone: "rose" | "amber";
  items: { id: string; name: string; mentorName: string; meta?: string }[];
  empty: string;
}) {
  const wrap =
    tone === "rose"
      ? "border-rose-500/20 bg-rose-500/5"
      : "border-amber-500/20 bg-amber-500/5";
  const countCls = tone === "rose" ? "text-rose-400" : "text-amber-400";

  return (
    <div className={cn("rounded-xl border p-4", wrap)}>
      <p className={cn("text-2xl font-semibold tabular-nums", countCls)}>{count}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs italic text-slate-600">{empty}</p>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{s.name}</p>
                <p className="truncate text-[10px] text-slate-500">Mentor: {s.mentorName}</p>
              </div>
              {s.meta && <span className="shrink-0 text-[10px] text-slate-500">{s.meta}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface AdminAnalyticsViewProps {
  data: PlatformAnalytics;
  hideMarketingTools?: boolean;
}

export default function AdminAnalyticsView({
  data,
  hideMarketingTools = false,
}: AdminAnalyticsViewProps) {
  const { summary, students, cycles } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [minGpa, setMinGpa] = useState(0);
  const [minDat, setMinDat] = useState(0);
  const [copied, setCopied] = useState(false);

  const [insightFilters, setInsightFilters] = useState({
    minGpa: 3.0,
    minDatAA: 18,
    minShadowing: 50,
    minMentorshipMonths: 3,
    cycle: "All",
  });

  const [benchmarkThresholds, setBenchmarkThresholds] = useState({
    gpa: 3.4,
    dat: 20,
    shadowing: 100,
    mentorship: 6,
  });

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      summary: data.summary,
      schoolPerformance: data.schoolPerformance,
      funnelByMentorship: data.funnelByMentorship,
      topTrends: data.topTrends,
      alerts: {
        noNextMeeting: data.alerts.noNextMeeting.length,
        noContactOneMonth: data.alerts.noContactOneMonth.length,
        noMeetingOneAndHalfMonth: data.alerts.noMeetingOneAndHalfMonth.length,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics report exported");
  };

  usePageHeaderAction({
    label: "Export Report",
    icon: <Download className="h-4 w-4" />,
    onClick: handleExport,
  });

  const insightData = useMemo(() => {
    const filtered = students.filter((s) => {
      const gpa = s.gpa ?? 0;
      const dat = s.datAA ?? 0;
      if (gpa < insightFilters.minGpa) return false;
      if (dat < insightFilters.minDatAA) return false;
      if (s.shadowingHours < insightFilters.minShadowing) return false;
      if (s.mentorshipMonths < insightFilters.minMentorshipMonths) return false;
      if (insightFilters.cycle !== "All" && s.applicationCycle !== insightFilters.cycle) {
        return false;
      }
      return true;
    });
    const total = filtered.length;
    const accepted = filtered.filter((s) => s.hasAccepted).length;
    const rate = total > 0 ? (accepted / total) * 100 : 0;

    const conditions: string[] = [];
    if (insightFilters.minGpa > 0) conditions.push(`a GPA of ${insightFilters.minGpa}+`);
    if (insightFilters.minDatAA > 0) conditions.push(`a ${insightFilters.minDatAA}+ DAT`);
    if (insightFilters.minShadowing > 0) {
      conditions.push(`${insightFilters.minShadowing}+ shadowing hours`);
    }
    if (insightFilters.minMentorshipMonths > 0) {
      conditions.push(`at least ${insightFilters.minMentorshipMonths} months of mentorship`);
    }
    if (insightFilters.cycle !== "All") conditions.push(`in the ${insightFilters.cycle} cycle`);

    let statement = `"${rate.toFixed(0)}% of students`;
    if (conditions.length > 0) statement += ` with ${conditions.join(", ")}`;
    statement += ` were accepted."`;

    return { total, accepted, rate, statement };
  }, [students, insightFilters]);

  const benchmarkResult = useMemo(() => {
    const matched = students.filter(
      (s) =>
        (s.gpa ?? 0) >= benchmarkThresholds.gpa &&
        (s.datAA ?? 0) >= benchmarkThresholds.dat &&
        s.shadowingHours >= benchmarkThresholds.shadowing &&
        s.mentorshipMonths >= benchmarkThresholds.mentorship,
    );
    const total = matched.length;
    const accepted = matched.filter((s) => s.hasAccepted).length;
    return { total, accepted, denied: total - accepted };
  }, [students, benchmarkThresholds]);

  const explorerRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students
      .filter((s) => {
        if (q && !s.name.toLowerCase().includes(q)) return false;
        if ((s.gpa ?? 0) < minGpa) return false;
        if ((s.datAA ?? 0) < minDat) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm, minGpa, minDat]);

  const cycleOptions = useMemo(
    () => [
      { value: "All", label: "All cycles" },
      ...cycles.map((c) => ({ value: c, label: c })),
    ],
    [cycles],
  );

  const interviewRate =
    summary.appliedCount > 0
      ? ((summary.interviewedCount / summary.appliedCount) * 100).toFixed(1)
      : "0";
  const acceptanceRate =
    summary.appliedCount > 0
      ? ((summary.acceptedCount / summary.appliedCount) * 100).toFixed(1)
      : "0";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(insightData.statement);
      setCopied(true);
      toast.success("Statement copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const pieHasData = (rows: { value: number }[]) => rows.some((r) => r.value > 0);

  return (
    <div className="space-y-5 pb-10">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Students"
          value={summary.totalStudents}
          icon={Users}
          tone="bg-indigo-600/15 text-indigo-400"
        />
        <KpiCard
          label="Active Students"
          value={summary.activeStudents}
          sub="Meeting in last 6 months"
          icon={Activity}
          tone="bg-emerald-600/15 text-emerald-400"
        />
        <KpiCard
          label="Applied"
          value={summary.appliedCount}
          sub="With applications on file"
          icon={SchoolIcon}
          tone="bg-amber-600/15 text-amber-400"
        />
        <KpiCard
          label="Avg Mentor Response"
          value={`${summary.avgResponseHours.toFixed(1)}h`}
          icon={Clock}
          tone="bg-rose-600/15 text-rose-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          icon={PieChartIcon}
          iconClass="bg-indigo-600/15 text-indigo-400"
          title="Interview conversion"
          subtitle={`${interviewRate}% of applied students interviewed`}
          action={
            <div className="text-right">
              <p className="text-lg font-semibold text-indigo-400">{interviewRate}%</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rate</p>
            </div>
          }
        >
          <div className="h-[260px]">
            {pieHasData(data.interviewPie) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.interviewPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.interviewPie.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} itemStyle={{ color: "#fff" }} />
                  <Legend verticalAlign="bottom" height={32} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<PieChartIcon className="h-8 w-8" />}
                title="No application data yet"
                description="Interview conversion appears once students log applications."
              />
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
            <span className="text-xs text-slate-400">Avg interviews per applied student</span>
            <span className="text-sm font-semibold text-white">
              {summary.avgInterviewsPerApplied.toFixed(1)}
            </span>
          </div>
        </SectionCard>

        <SectionCard
          icon={CheckCircle2}
          iconClass="bg-emerald-600/15 text-emerald-400"
          title="Acceptance rate"
          subtitle={`${acceptanceRate}% of applied students accepted`}
          action={
            <div className="text-right">
              <p className="text-lg font-semibold text-emerald-400">{acceptanceRate}%</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rate</p>
            </div>
          }
        >
          <div className="h-[260px]">
            {pieHasData(data.acceptancePie) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.acceptancePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.acceptancePie.map((_, index) => (
                      <Cell key={index} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} itemStyle={{ color: "#fff" }} />
                  <Legend verticalAlign="bottom" height={32} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8" />}
                title="No acceptance outcomes yet"
                description="Acceptance rate updates as application statuses change."
              />
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
            <span className="text-xs text-slate-400">Total acceptances</span>
            <span className="text-sm font-semibold text-white">{summary.acceptedCount}</span>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        icon={TrendingUp}
        iconClass="bg-indigo-600/15 text-indigo-400"
        title="Application submission timing"
        subtitle="Applications by month (applied date)"
      >
        <div className="h-[280px]">
          {data.applicationTiming.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.applicationTiming}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} itemStyle={{ color: "#fff" }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Applications" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8" />}
              title="No timed applications"
              description="Charts populate when applications include an applied date."
            />
          )}
        </div>
      </SectionCard>

      <div className={cn("grid gap-4", hideMarketingTools ? "" : "lg:grid-cols-2")}>
        {!hideMarketingTools && (
          <SectionCard
            icon={Sparkles}
            iconClass="bg-violet-600/15 text-violet-400"
            title="Insight builder"
            subtitle="Generate marketing copy from live cohort filters"
            action={
              <Badge variant="primary">
                n = {insightData.total}
              </Badge>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Min GPA</span>
                  <span className="text-white">{insightFilters.minGpa.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={4}
                  step={0.1}
                  value={insightFilters.minGpa}
                  onChange={(e) =>
                    setInsightFilters({ ...insightFilters, minGpa: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Min DAT AA</span>
                  <span className="text-white">{insightFilters.minDatAA}</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={30}
                  step={1}
                  value={insightFilters.minDatAA}
                  onChange={(e) =>
                    setInsightFilters({ ...insightFilters, minDatAA: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Shadowing hours</span>
                  <span className="text-white">{insightFilters.minShadowing}+</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={10}
                  value={insightFilters.minShadowing}
                  onChange={(e) =>
                    setInsightFilters({
                      ...insightFilters,
                      minShadowing: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Mentorship months
                </label>
                <SelectMenu
                  value={String(insightFilters.minMentorshipMonths)}
                  onChange={(v) =>
                    setInsightFilters({
                      ...insightFilters,
                      minMentorshipMonths: parseInt(v, 10),
                    })
                  }
                  options={[
                    { value: "0", label: "Any duration" },
                    { value: "3", label: "3+ months" },
                    { value: "6", label: "6+ months" },
                    { value: "9", label: "9+ months" },
                    { value: "12", label: "12+ months" },
                  ]}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Application cycle
                </label>
                <SelectMenu
                  value={insightFilters.cycle}
                  onChange={(v) => setInsightFilters({ ...insightFilters, cycle: v })}
                  options={cycleOptions}
                />
              </div>
            </div>

            <div className="rounded-xl bg-indigo-600 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {insightData.total < 5 && (
                  <Badge variant="warning">Low sample</Badge>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100/70">
                  {insightData.accepted} accepted of {insightData.total}
                </span>
              </div>
              <p className="text-lg font-semibold italic leading-snug text-white">
                {insightData.statement}
              </p>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  className="bg-white text-indigo-700 hover:bg-indigo-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy statement"}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard
          icon={Target}
          iconClass="bg-emerald-600/15 text-emerald-400"
          title="Ideal applicant signals"
          subtitle="Derived from accepted vs other students"
        >
          <div className="space-y-3">
            {data.signals.map((signal) => (
              <div
                key={signal.title}
                className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">{signal.title}</h4>
                    <Badge
                      variant={
                        signal.strength === "Strong"
                          ? "success"
                          : signal.strength === "Moderate"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {signal.strength}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{signal.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3">
            <div className="mb-1.5 flex items-center gap-2 text-emerald-400">
              <Info className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Recommendation</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{data.recommendation}</p>
          </div>
        </SectionCard>
      </div>

      {!hideMarketingTools && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            icon={Trophy}
            iconClass="bg-amber-600/15 text-amber-400"
            title="Top acceptance trends"
            subtitle="Live cohort combinations"
            className="lg:col-span-2"
          >
            {data.topTrends.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-8 w-8" />}
                title="Not enough matching cohorts"
                description="Trends appear when students meet GPA, DAT, hours, and mentorship thresholds."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.topTrends.map((trend) => (
                  <div
                    key={trend.label}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {trend.tags.map((tag) => (
                        <Badge key={tag} variant="primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="mb-4 text-sm font-medium leading-relaxed text-slate-200">
                      {trend.label}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-semibold text-white">{trend.rate}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Acceptance
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">n = {trend.sample}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={BarChart3}
            iconClass="bg-rose-600/15 text-rose-400"
            title="Benchmark explorer"
            subtitle="Tune thresholds against live data"
          >
            <div className="space-y-4">
              {(
                [
                  { key: "gpa" as const, label: "GPA", min: 3, max: 4, step: 0.1 },
                  { key: "dat" as const, label: "DAT", min: 17, max: 25, step: 1 },
                  { key: "shadowing" as const, label: "Shadowing (h)", min: 0, max: 200, step: 10 },
                  { key: "mentorship" as const, label: "Mentorship (mo)", min: 1, max: 12, step: 1 },
                ] as const
              ).map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>{field.label}</span>
                    <span className="text-white">{benchmarkThresholds[field.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={benchmarkThresholds[field.key]}
                    onChange={(e) =>
                      setBenchmarkThresholds({
                        ...benchmarkThresholds,
                        [field.key]:
                          field.step < 1
                            ? parseFloat(e.target.value)
                            : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-rose-500"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-white">{benchmarkResult.total}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Matched
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-emerald-400">
                    {benchmarkResult.total > 0
                      ? ((benchmarkResult.accepted / benchmarkResult.total) * 100).toFixed(0)
                      : 0}
                    %
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Accepted
                  </p>
                </div>
              </div>
              <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${
                      benchmarkResult.total > 0
                        ? (benchmarkResult.accepted / benchmarkResult.total) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-rose-500/60"
                  style={{
                    width: `${
                      benchmarkResult.total > 0
                        ? (benchmarkResult.denied / benchmarkResult.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-emerald-400">{benchmarkResult.accepted} accepted</span>
                <span className="text-rose-400">{benchmarkResult.denied} other</span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard
        icon={Clock}
        iconClass="bg-indigo-600/15 text-indigo-400"
        title="Funnel & timing"
        subtitle="Acceptance rate by mentorship duration"
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.funnelByMentorship}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip contentStyle={CHART_TOOLTIP} itemStyle={{ color: "#fff" }} />
              <Line
                type="monotone"
                dataKey="rate"
                name="Acceptance %"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ fill: "#4f46e5", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.funnelByMentorship.map((d) => (
            <div key={d.name} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{d.name}</p>
              <p className="mt-1 text-lg font-semibold text-white">{d.rate.toFixed(0)}%</p>
              <p className="text-[10px] font-semibold text-indigo-400">n = {d.count}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          icon={SchoolIcon}
          iconClass="bg-sky-600/15 text-sky-400"
          title="Top schools by interviews"
          subtitle="Across all student applications"
        >
          {data.schoolPerformance.length === 0 ? (
            <EmptyState
              icon={<SchoolIcon className="h-8 w-8" />}
              title="No school applications"
              description="Rankings appear when students track school applications."
            />
          ) : (
            <div className="space-y-2">
              {data.schoolPerformance.map((school, i) => (
                <div
                  key={`${school.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-semibold text-indigo-400">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{school.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {school.applications} apps · {school.acceptances} accepted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-indigo-400">{school.interviews}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Interviews
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={Clock}
          iconClass="bg-rose-600/15 text-rose-400"
          title="Mentor response times"
          subtitle="Average reply latency by mentor"
        >
          {data.mentors.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No mentors yet"
              description="Response times appear when mentors are on the platform."
            />
          ) : (
            <div className="space-y-2">
              {data.mentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                      {mentor.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mentor.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        mentor.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{mentor.name}</p>
                      <p className="text-[10px] text-slate-500">{mentor.studentCount} students</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-base font-semibold",
                        mentor.avgResponseHours > 12 ? "text-rose-400" : "text-emerald-400",
                      )}
                    >
                      {mentor.avgResponse}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        icon={AlertTriangle}
        iconClass="bg-rose-600/15 text-rose-400"
        title="Compliance & contact alerts"
        subtitle="Students needing outreach attention"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <AlertList
            title="No next meeting scheduled"
            count={data.alerts.noNextMeeting.length}
            tone="rose"
            empty="All assigned students have a next meeting"
            items={data.alerts.noNextMeeting.map((s) => ({
              id: s.id,
              name: s.name,
              mentorName: s.mentorName,
            }))}
          />
          <AlertList
            title="No contact in >1 month"
            count={data.alerts.noContactOneMonth.length}
            tone="amber"
            empty="No stale contact alerts"
            items={data.alerts.noContactOneMonth.map((s) => ({
              id: s.id,
              name: s.name,
              mentorName: s.mentorName,
              meta: s.lastContact ? `Last: ${s.lastContact}` : undefined,
            }))}
          />
          <AlertList
            title="No meeting in >1.5 months"
            count={data.alerts.noMeetingOneAndHalfMonth.length}
            tone="rose"
            empty="No meeting-gap alerts"
            items={data.alerts.noMeetingOneAndHalfMonth.map((s) => ({
              id: s.id,
              name: s.name,
              mentorName: s.mentorName,
              meta: s.lastMeeting ? `Last: ${s.lastMeeting}` : undefined,
            }))}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={Users}
        iconClass="bg-indigo-600/15 text-indigo-400"
        title="Student data explorer"
        subtitle="Search and filter the live student cohort"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name…"
          />
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Min GPA ({minGpa.toFixed(1)})
            </label>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={minGpa}
              onChange={(e) => setMinGpa(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Min DAT ({minDat})
            </label>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={minDat}
              onChange={(e) => setMinDat(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Student</th>
                <th className="px-3 py-2.5">GPA</th>
                <th className="px-3 py-2.5">DAT</th>
                <th className="px-3 py-2.5">Shadowing</th>
                <th className="px-3 py-2.5">Mentor</th>
                <th className="px-3 py-2.5">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {explorerRows.slice(0, 50).map((s: AnalyticsStudentRow) => (
                <tr key={s.id} className="border-b border-slate-800/80 hover:bg-slate-900/40">
                  <td className="px-3 py-2.5 font-medium text-white">{s.name}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                    {s.gpa != null ? s.gpa.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">{s.datAA ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                    {s.shadowingHours.toFixed(0)}h
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{s.mentorName}</td>
                  <td className="px-3 py-2.5">
                    {s.hasAccepted ? (
                      <Badge variant="success">Accepted</Badge>
                    ) : s.hasInterviewed ? (
                      <Badge variant="primary">Interviewed</Badge>
                    ) : s.hasApplied ? (
                      <Badge variant="warning">Applied</Badge>
                    ) : (
                      <Badge variant="default">Prep</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {explorerRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                    No students match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {explorerRows.length > 50 && (
          <p className="text-xs text-slate-500">Showing first 50 of {explorerRows.length} matches.</p>
        )}
      </SectionCard>
    </div>
  );
}
