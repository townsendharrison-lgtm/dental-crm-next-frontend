"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Target,
  Plus,
  Trash2,
  Sparkles,
  Brain,
  AlertCircle,
  School,
  Loader2,
  Save,
  Clock,
  Wand2,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  FormField,
  Input,
  Textarea,
  SelectMenu,
  EmptyState,
  Modal,
  Badge,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import {
  useOptimizationPlan,
  useUpsertOptimizationPlan,
} from "@/lib/hooks/useOptimizationPlans";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { useStudentSchools } from "@/lib/hooks/useStudentSchools";
import { useSchoolCategories } from "@/lib/hooks/useSchoolCategories";
import SchoolSelectionTab from "@/components/student/hub/SchoolSelectionTab";
import { DEFAULT_CATEGORIES } from "@/components/student/hub/hubShared";
import type { OptimizationPlan, School as HubSchool, SchoolCategory } from "@/lib/types";

type Tab = "manual" | "ai";
type KpiLevel = "Strong" | "Moderate" | "Developing" | "Weak";
type Impact = "High" | "Moderate" | "Lower";
type Severity = "High" | "Medium" | "Low";

type RiskEntry = { factor: string; severity: Severity; description: string; mitigation: string };
type LeverageEntry = { title: string; description: string; impact: Impact };

type PlanDraft = {
  snapshot: string;
  overallScore: number;
  improvementLeverageScore: number;
  kpis: {
    academics: KpiLevel;
    experienceDepth: KpiLevel;
    leadership: KpiLevel;
    shadowing: KpiLevel;
  };
  strengths: string[];
  gaps: string[];
  roadmap: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
    phase4: string[];
  };
  leverageActions: LeverageEntry[];
  riskFactors: RiskEntry[];
};

const KPI_OPTIONS = [
  { value: "Strong", label: "Strong" },
  { value: "Moderate", label: "Moderate" },
  { value: "Developing", label: "Developing" },
  { value: "Weak", label: "Weak" },
];

const IMPACT_OPTIONS = [
  { value: "High", label: "High" },
  { value: "Moderate", label: "Moderate" },
  { value: "Lower", label: "Lower" },
];

const SEVERITY_OPTIONS = [
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const TABS: { id: Tab; label: string; icon: typeof Target }[] = [
  { id: "manual", label: "Manual Plan", icon: Target },
  { id: "ai", label: "AI Plan", icon: Wand2 },
];

const EMPTY_DRAFT = (): PlanDraft => ({
  snapshot: "",
  overallScore: 50,
  improvementLeverageScore: 50,
  kpis: {
    academics: "Moderate",
    experienceDepth: "Moderate",
    leadership: "Moderate",
    shadowing: "Moderate",
  },
  strengths: [""],
  gaps: [""],
  roadmap: {
    phase1: [""],
    phase2: [""],
    phase3: [""],
    phase4: [""],
  },
  leverageActions: [{ title: "", description: "", impact: "High" }],
  riskFactors: [{ factor: "", severity: "Medium", description: "", mitigation: "" }],
});

function planToDraft(plan: OptimizationPlan | null | undefined): PlanDraft {
  const base = EMPTY_DRAFT();
  if (!plan) return base;
  const kpis = (plan.kpis || {}) as PlanDraft["kpis"];
  const roadmap = plan.roadmap || { phase1: [], phase2: [], phase3: [], phase4: [] };
  return {
    snapshot: plan.snapshot || "",
    overallScore: Number(plan.overallScore ?? plan.overall_score ?? 50),
    improvementLeverageScore: Number(
      plan.improvementLeverageScore ?? plan.improvement_leverage_score ?? 50,
    ),
    kpis: {
      academics: (kpis.academics as KpiLevel) || "Moderate",
      experienceDepth: (kpis.experienceDepth as KpiLevel) || "Moderate",
      leadership: (kpis.leadership as KpiLevel) || "Moderate",
      shadowing: (kpis.shadowing as KpiLevel) || "Moderate",
    },
    strengths: plan.strengths?.length ? [...plan.strengths] : [""],
    gaps: plan.gaps?.length ? [...plan.gaps] : [""],
    roadmap: {
      phase1: roadmap.phase1?.length ? [...roadmap.phase1] : [""],
      phase2: roadmap.phase2?.length ? [...roadmap.phase2] : [""],
      phase3: roadmap.phase3?.length ? [...roadmap.phase3] : [""],
      phase4: roadmap.phase4?.length ? [...roadmap.phase4] : [""],
    },
    leverageActions: (plan.leverageActions || plan.leverage_actions || []).length
      ? (plan.leverageActions || plan.leverage_actions || []).map((a: any) => ({
          title: a.title || "",
          description: a.description || "",
          impact: (a.impact as Impact) || "Moderate",
        }))
      : [{ title: "", description: "", impact: "High" as Impact }],
    riskFactors: (plan.riskFactors || plan.risk_factors || []).length
      ? (plan.riskFactors || plan.risk_factors || []).map((r: any) => ({
          factor: r.factor || "",
          severity: (r.severity as Severity) || "Medium",
          description: r.description || "",
          mitigation: r.mitigation || "",
        }))
      : [{ factor: "", severity: "Medium" as Severity, description: "", mitigation: "" }],
  };
}

function SectionCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  actions,
  children,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <FormField label={label}>
      <div className="space-y-2">
        {values.map((value, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => {
                const next = [...values];
                next[idx] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder || "Enter item…"}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              disabled={values.length <= 1}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => onChange([...values, ""])}
        >
          Add
        </Button>
      </div>
    </FormField>
  );
}

function StrengthDonut({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (c * clamped) / 100;
  const tone = clamped >= 80 ? "#34d399" : clamped >= 60 ? "#818cf8" : "#f59e0b";

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-800"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="transparent"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-white">{clamped}</span>
        <span className="text-[10px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function schoolCategoryKey(school: HubSchool): string {
  return school.type || "Target";
}

function PlanPreviewBody({
  studentName,
  draft,
  schools,
  categories,
}: {
  studentName: string;
  draft: PlanDraft;
  schools: HubSchool[];
  categories: SchoolCategory[];
}) {
  const cats = useMemo(() => {
    const base = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    const known = new Set(base.map((c) => c.id));
    const extras = Array.from(
      new Set(schools.map(schoolCategoryKey).filter((id) => id && !known.has(id))),
    ).map((id) => ({
      id,
      name: id,
      color: "#94a3b8",
      icon: "SchoolIcon",
    }));
    return [...base, ...extras];
  }, [categories, schools]);

  const kpiEntries = Object.entries(draft.kpis) as [string, KpiLevel][];
  const strengths = draft.strengths.filter(Boolean);
  const gaps = draft.gaps.filter(Boolean);
  const leverage = draft.leverageActions.filter((a) => a.title.trim());
  const risks = draft.riskFactors.filter((r) => r.factor.trim());
  const roadmapPhases = (["phase1", "phase2", "phase3", "phase4"] as const)
    .map((phase, idx) => ({
      phase,
      idx,
      tasks: draft.roadmap[phase].filter(Boolean),
    }))
    .filter((p) => p.tasks.length > 0);

  return (
    <div className="space-y-4 pb-2">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Strategic Selection Plan
            </p>
            <h3 className="mt-1 truncate text-xl font-semibold text-white">{studentName}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              {draft.snapshot.trim() || "No strategic snapshot has been written yet."}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Improvement leverage{" "}
              <span className="font-semibold text-indigo-300">
                {draft.improvementLeverageScore}%
              </span>
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <StrengthDonut score={draft.overallScore} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Overall strength
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiEntries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-200">{value}</span>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  value === "Strong" && "bg-emerald-400",
                  value === "Moderate" && "bg-indigo-400",
                  value === "Developing" && "bg-amber-400",
                  value === "Weak" && "bg-rose-400",
                )}
              />
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full",
                  value === "Strong" && "w-full bg-emerald-500",
                  value === "Moderate" && "w-3/4 bg-indigo-500",
                  value === "Developing" && "w-1/2 bg-amber-500",
                  value === "Weak" && "w-1/4 bg-rose-500",
                )}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white">Strengths to leverage</h4>
          </div>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{s}</span>
              </li>
            ))}
            {strengths.length === 0 && (
              <li className="text-sm italic text-slate-600">None listed</li>
            )}
          </ul>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <h4 className="text-sm font-semibold text-white">Critical gaps</h4>
          </div>
          <ul className="space-y-2">
            {gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="mt-0.5 text-rose-400">•</span>
                <span>{g}</span>
              </li>
            ))}
            {gaps.length === 0 && (
              <li className="text-sm italic text-slate-600">None listed</li>
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <School className="h-4 w-4 text-sky-400" />
          <div>
            <h4 className="text-sm font-semibold text-white">School selection</h4>
            <p className="text-xs text-slate-500">{schools.length} schools across categories</p>
          </div>
        </div>
        {schools.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-800 py-8 text-center text-sm italic text-slate-500">
            No schools on this student’s list yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cats.map((cat) => {
              const inCat = schools.filter((s) => schoolCategoryKey(s) === cat.id);
              return (
                <div key={cat.id} className="rounded-lg border border-slate-800 bg-slate-950/40">
                  <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: cat.color || "#818cf8" }}
                    >
                      {cat.name}
                    </p>
                    <span className="text-[10px] font-bold tabular-nums text-slate-500">
                      {inCat.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 p-2.5">
                    {inCat.map((s) => (
                      <div
                        key={s.selectionId || s.id}
                        className="rounded-md bg-slate-900/80 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        {s.notes && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.notes}</p>
                        )}
                      </div>
                    ))}
                    {inCat.length === 0 && (
                      <p className="py-4 text-center text-[11px] italic text-slate-600">
                        No schools
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {roadmapPhases.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-white">Strategic flow roadmap</h4>
          </div>
          <div className="space-y-3">
            {roadmapPhases.map(({ phase, idx, tasks }) => (
              <div key={phase} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Phase {idx + 1}
                </p>
                <ul className="space-y-1.5">
                  {tasks.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {leverage.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h4 className="text-sm font-semibold text-white">Improvement leverage actions</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leverage.map((action, idx) => (
              <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <Badge
                  variant={
                    action.impact === "High"
                      ? "success"
                      : action.impact === "Moderate"
                        ? "primary"
                        : "default"
                  }
                >
                  {action.impact} impact
                </Badge>
                <h5 className="mt-2 text-sm font-semibold text-white">{action.title}</h5>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{action.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {risks.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <h4 className="text-sm font-semibold text-white">Risk factors</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {risks.map((risk, idx) => (
              <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h5 className="text-sm font-semibold text-white">{risk.factor}</h5>
                  <Badge variant={risk.severity === "High" ? "danger" : "warning"}>
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">{risk.description}</p>
                {risk.mitigation && (
                  <p className="mt-2 border-t border-slate-800 pt-2 text-xs text-slate-400">
                    <span className="font-semibold text-emerald-400">Mitigation: </span>
                    {risk.mitigation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


export default function SchoolSelectionView() {
  const [tab, setTab] = useState<Tab>("manual");
  const [studentId, setStudentId] = useState("");
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [previewOpen, setPreviewOpen] = useState(false);

  const platformConfig = usePlatformConfig();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: existingPlan, isLoading: planLoading } = useOptimizationPlan(studentId || undefined);
  const upsertPlan = useUpsertOptimizationPlan();
  const { data: previewSchools = [] } = useStudentSchools(studentId || undefined);
  const { data: previewCategories = [] } = useSchoolCategories(studentId || undefined);

  const studentOptions = useMemo(
    () =>
      [...students]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({
          value: s.id,
          label: s.email ? `${s.name} · ${s.email}` : s.name,
        })),
    [students],
  );

  const selectedStudent = students.find((s) => s.id === studentId);

  useEffect(() => {
    if (!studentId) {
      setDraft(EMPTY_DRAFT());
      return;
    }
    if (planLoading) return;
    setDraft(planToDraft(existingPlan));
  }, [studentId, existingPlan, planLoading]);

  const patch = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!studentId) {
      toast.error("Select a student first");
      return;
    }
    if (!draft.snapshot.trim()) {
      toast.error("Strategic snapshot is required");
      return;
    }

    const cleanList = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

    try {
      await upsertPlan.mutateAsync({
        studentId,
        snapshot: draft.snapshot.trim(),
        overallScore: draft.overallScore,
        improvementLeverageScore: draft.improvementLeverageScore,
        kpis: draft.kpis,
        roadmap: {
          phase1: cleanList(draft.roadmap.phase1),
          phase2: cleanList(draft.roadmap.phase2),
          phase3: cleanList(draft.roadmap.phase3),
          phase4: cleanList(draft.roadmap.phase4),
        },
        strengths: cleanList(draft.strengths),
        gaps: cleanList(draft.gaps),
        leverageActions: draft.leverageActions.filter((a) => a.title.trim()),
        riskFactors: draft.riskFactors.filter((r) => r.factor.trim()),
      });
      toast.success(
        existingPlan ? "Strategic selection plan updated" : "Strategic selection plan created",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save plan");
    }
  };

  usePageHeaderAction(
    tab === "manual"
      ? {
          label: existingPlan ? "Save plan" : "Create plan",
          icon: upsertPlan.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          ),
          onClick: () => void handleSave(),
          disabled: !studentId || upsertPlan.isPending,
        }
      : null,
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:min-w-0">
          {TABS.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.id === "ai" && (
                  <span className="rounded-md border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "ai" && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="AI Generated Plan"
          description="Not wired yet. In a later phase, admins will generate strategic selection plans from student profiles, documents, and notes."
        />
      )}

      {tab === "manual" && (
        <div className="space-y-4">
          <SectionCard
            icon={Target}
            iconClass="bg-indigo-500/10 text-indigo-400"
            title="Student"
            subtitle="Required — the plan and school list are saved to this student’s profile"
            actions={
              studentId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Eye className="h-4 w-4" />}
                  onClick={() => setPreviewOpen(true)}
                >
                  Preview
                </Button>
              ) : null
            }
          >
            <SelectMenu
              value={studentId}
              onChange={setStudentId}
              options={studentOptions}
              placeholder={studentsLoading ? "Loading students…" : "Select a student…"}
              className="w-full max-w-xl"
              disabled={studentsLoading}
            />
            {selectedStudent && (
              <p className="text-xs text-slate-500">
                {existingPlan
                  ? "Existing plan loaded — edits will overwrite on save."
                  : "No plan yet — fill in the sections below and create one."}
              </p>
            )}
          </SectionCard>

          {!studentId ? (
            <EmptyState
              icon={<School className="h-6 w-6" />}
              title="Select a student"
              description="Choose a student above to create or edit their strategic selection plan and school list."
            />
          ) : planLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 py-16 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              Loading plan…
            </div>
          ) : (
            <div className="space-y-4">
              <SectionCard
                icon={Target}
                iconClass="bg-indigo-500/10 text-indigo-400"
                title="Strategic snapshot"
                subtitle="Standing summary, strength score, and KPIs"
              >
                <FormField label="Snapshot" required hint="2–3 sentences on current standing">
                  <Textarea
                    value={draft.snapshot}
                    onChange={(e) => patch("snapshot", e.target.value)}
                    className="min-h-[100px]"
                    placeholder="e.g. Highly competitive applicant with strong DAT and GPA…"
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Overall strength (0–100)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.overallScore}
                      onChange={(e) => patch("overallScore", Number(e.target.value) || 0)}
                    />
                  </FormField>
                  <FormField label="Improvement leverage (0–100)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.improvementLeverageScore}
                      onChange={(e) =>
                        patch("improvementLeverageScore", Number(e.target.value) || 0)
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["academics", "Academics"],
                      ["experienceDepth", "Experience depth"],
                      ["leadership", "Leadership"],
                      ["shadowing", "Shadowing"],
                    ] as const
                  ).map(([key, label]) => (
                    <FormField key={key} label={label}>
                      <SelectMenu
                        value={draft.kpis[key]}
                        onChange={(v) =>
                          patch("kpis", { ...draft.kpis, [key]: v as KpiLevel })
                        }
                        options={KPI_OPTIONS}
                        className="w-full"
                      />
                    </FormField>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                icon={Brain}
                iconClass="bg-emerald-500/10 text-emerald-400"
                title="Strengths & gaps"
              >
                <StringListEditor
                  label="Strengths to leverage"
                  values={draft.strengths}
                  onChange={(v) => patch("strengths", v)}
                  placeholder="Key strength…"
                />
                <StringListEditor
                  label="Critical gaps"
                  values={draft.gaps}
                  onChange={(v) => patch("gaps", v)}
                  placeholder="Gap or risk…"
                />
              </SectionCard>

              <SectionCard
                icon={School}
                iconClass="bg-sky-500/10 text-sky-400"
                title="School list"
                subtitle="Same board as the student’s Plan → Schools tab (categories, drag & drop, add schools)"
              >
                {selectedStudent && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:p-4">
                    <SchoolSelectionTab
                      student={selectedStudent}
                      isMentorView
                      platformConfig={platformConfig}
                    />
                  </div>
                )}
              </SectionCard>

              <SectionCard
                icon={Clock}
                iconClass="bg-slate-800 text-slate-300"
                title="Strategic flow roadmap"
              >
                {(["phase1", "phase2", "phase3", "phase4"] as const).map((phase, i) => (
                  <StringListEditor
                    key={phase}
                    label={`Phase ${i + 1}`}
                    values={draft.roadmap[phase]}
                    onChange={(v) => patch("roadmap", { ...draft.roadmap, [phase]: v })}
                    placeholder="Task…"
                  />
                ))}
              </SectionCard>

              <SectionCard
                icon={Sparkles}
                iconClass="bg-indigo-500/10 text-indigo-400"
                title="Leverage actions"
                actions={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() =>
                      patch("leverageActions", [
                        ...draft.leverageActions,
                        { title: "", description: "", impact: "Moderate" },
                      ])
                    }
                  >
                    Add
                  </Button>
                }
              >
                {draft.leverageActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex gap-2">
                      <Input
                        value={action.title}
                        onChange={(e) => {
                          const next = [...draft.leverageActions];
                          next[idx] = { ...action, title: e.target.value };
                          patch("leverageActions", next);
                        }}
                        placeholder="Action title"
                        className="flex-1"
                      />
                      <SelectMenu
                        value={action.impact}
                        onChange={(v) => {
                          const next = [...draft.leverageActions];
                          next[idx] = { ...action, impact: v as Impact };
                          patch("leverageActions", next);
                        }}
                        options={IMPACT_OPTIONS}
                        className="w-36"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          patch(
                            "leverageActions",
                            draft.leverageActions.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={action.description}
                      onChange={(e) => {
                        const next = [...draft.leverageActions];
                        next[idx] = { ...action, description: e.target.value };
                        patch("leverageActions", next);
                      }}
                      placeholder="Description…"
                      className="min-h-[64px]"
                    />
                  </div>
                ))}
              </SectionCard>

              <SectionCard
                icon={AlertCircle}
                iconClass="bg-rose-500/10 text-rose-400"
                title="Risk factors"
                actions={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() =>
                      patch("riskFactors", [
                        ...draft.riskFactors,
                        { factor: "", severity: "Medium", description: "", mitigation: "" },
                      ])
                    }
                  >
                    Add
                  </Button>
                }
              >
                {draft.riskFactors.map((risk, idx) => (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex gap-2">
                      <Input
                        value={risk.factor}
                        onChange={(e) => {
                          const next = [...draft.riskFactors];
                          next[idx] = { ...risk, factor: e.target.value };
                          patch("riskFactors", next);
                        }}
                        placeholder="Risk factor"
                        className="flex-1"
                      />
                      <SelectMenu
                        value={risk.severity}
                        onChange={(v) => {
                          const next = [...draft.riskFactors];
                          next[idx] = { ...risk, severity: v as Severity };
                          patch("riskFactors", next);
                        }}
                        options={SEVERITY_OPTIONS}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          patch(
                            "riskFactors",
                            draft.riskFactors.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={risk.description}
                      onChange={(e) => {
                        const next = [...draft.riskFactors];
                        next[idx] = { ...risk, description: e.target.value };
                        patch("riskFactors", next);
                      }}
                      placeholder="Description…"
                      className="min-h-[56px]"
                    />
                    <Textarea
                      value={risk.mitigation}
                      onChange={(e) => {
                        const next = [...draft.riskFactors];
                        next[idx] = { ...risk, mitigation: e.target.value };
                        patch("riskFactors", next);
                      }}
                      placeholder="Mitigation…"
                      className="min-h-[56px]"
                    />
                  </div>
                ))}
              </SectionCard>
            </div>
          )}
        </div>
      )}

      <Modal
        open={previewOpen && !!selectedStudent}
        onClose={() => setPreviewOpen(false)}
        title="Plan preview"
        description={
          selectedStudent
            ? `Strategic selection plan for ${selectedStudent.name}`
            : undefined
        }
        size="2xl"
        fullHeight
      >
        {selectedStudent && (
          <PlanPreviewBody
            studentName={selectedStudent.name}
            draft={draft}
            schools={previewSchools}
            categories={previewCategories}
          />
        )}
      </Modal>
    </div>
  );
}
