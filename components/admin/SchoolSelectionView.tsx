"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
  Download,
  FileText,
  Search,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Button,
  FormField,
  Input,
  Textarea,
  SelectMenu,
  EmptyState,
  Modal,
  Avatar,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import {
  useDeleteOptimizationPlan,
  useOptimizationPlan,
  useOptimizationPlansList,
  useUpsertOptimizationPlan,
} from "@/lib/hooks/useOptimizationPlans";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { useStudentSchools } from "@/lib/hooks/useStudentSchools";
import { useSchoolCategories } from "@/lib/hooks/useSchoolCategories";
import { studentsApi } from "@/lib/api/students";
import { studentSchoolsApi } from "@/lib/api/studentSchools";
import { schoolCategoriesApi } from "@/lib/api/schoolCategories";
import { schoolsApi } from "@/lib/api/schools";
import {
  mapStudentSchoolToHubSchool,
  schoolEnsurePayloadFromHub,
} from "@/lib/utils/schoolApplications";
import { queryKeys } from "@/lib/api/queryKeys";
import SchoolSelectionTab from "@/components/student/hub/SchoolSelectionTab";
import { DEFAULT_CATEGORIES } from "@/components/student/hub/hubShared";
import type { OptimizationPlanListItem } from "@/lib/api/optimizationPlans";
import type {
  OptimizationPlan,
  School as HubSchool,
  SchoolCategory,
  Student,
  StudentSchool,
} from "@/lib/types";

type MainTab = "reports" | "create";
type CreateMode = "manual" | "ai";
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

const MAIN_TABS: { id: MainTab; label: string; icon: typeof FileText }[] = [
  { id: "reports", label: "Created Reports", icon: FileText },
  { id: "create", label: "Create New Report", icon: Plus },
];

const CREATE_MODES: { id: CreateMode; label: string; icon: typeof Target }[] = [
  { id: "manual", label: "Manual", icon: Target },
  { id: "ai", label: "AI", icon: Wand2 },
];

function isExternalStudentEmail(email?: string | null) {
  return !!email && email.toLowerCase().endsWith("@school-selection.local");
}

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
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (c * clamped) / 100;
  const tone = clamped >= 80 ? "#34d399" : clamped >= 60 ? "#818cf8" : "#f59e0b";

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="transparent" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="56"
          cy="56"
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
        <span className="text-2xl font-bold tabular-nums leading-none text-white">{clamped}</span>
        <span className="mt-0.5 text-[10px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function schoolCategoryKey(school: HubSchool): string {
  return school.type || "Target";
}

function kpiLabel(key: string) {
  const labels: Record<string, string> = {
    academics: "Academics",
    experienceDepth: "Experience",
    leadership: "Leadership",
    shadowing: "Shadowing",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}

function kpiTone(value: KpiLevel) {
  switch (value) {
    case "Strong":
      return { bar: "bg-emerald-500", text: "text-emerald-400", width: "w-full" };
    case "Moderate":
      return { bar: "bg-indigo-500", text: "text-indigo-300", width: "w-3/4" };
    case "Developing":
      return { bar: "bg-amber-500", text: "text-amber-300", width: "w-1/2" };
    default:
      return { bar: "bg-rose-500", text: "text-rose-400", width: "w-1/4" };
  }
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

  const schoolGroups = cats
    .map((cat) => ({
      cat,
      schools: schools.filter((s) => schoolCategoryKey(s) === cat.id),
    }))
    .filter((g) => g.schools.length > 0);

  const initial = (studentName.trim()[0] || "S").toUpperCase();

  return (
    <div id="school-selection-pdf" className="rounded-xl border border-slate-800 bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/80 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-400">
                Strategic Selection Plan
              </p>
              <h3 className="mt-1 truncate text-2xl font-bold tracking-tight text-white">
                {studentName}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Prepared by Dental School Guide ·{" "}
                {new Date().toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <StrengthDonut score={draft.overallScore} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Overall strength
              </p>
              <p className="mt-1 text-sm font-medium text-slate-400">
                Leverage{" "}
                <span className="font-bold text-indigo-300">
                  {draft.improvementLeverageScore}%
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-5 py-6 sm:px-6 sm:py-7">
        <section>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Strategic snapshot
          </h4>
          <p className="text-[15px] leading-relaxed text-slate-300">
            {draft.snapshot.trim() || "No strategic snapshot has been written yet."}
          </p>
        </section>

        <section>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Profile KPIs
          </h4>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpiEntries.map(([key, value]) => {
              const tone = kpiTone(value);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {kpiLabel(key)}
                  </p>
                  <p className={cn("mt-1.5 text-sm font-bold", tone.text)}>{value}</p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className={cn("h-full rounded-full", tone.bar, tone.width)} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              <Brain className="h-3.5 w-3.5" />
              Strengths to leverage
            </h4>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{s}</span>
                </li>
              ))}
              {strengths.length === 0 && (
                <li className="text-sm italic text-slate-600">None listed</li>
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Critical gaps
            </h4>
            <ul className="space-y-2">
              {gaps.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-rose-400">
                    !
                  </span>
                  <span>{g}</span>
                </li>
              ))}
              {gaps.length === 0 && (
                <li className="text-sm italic text-slate-600">None listed</li>
              )}
            </ul>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              School selection
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {schools.length > 0
                ? `${schools.length} school${schools.length === 1 ? "" : "s"} across ${schoolGroups.length} categor${schoolGroups.length === 1 ? "y" : "ies"}`
                : "No schools linked yet"}
            </p>
          </div>
          {schoolGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-600">
              No schools on this list yet.
            </p>
          ) : (
            <div
              className={cn(
                "grid gap-3",
                schoolGroups.length === 1 && "grid-cols-1",
                schoolGroups.length === 2 && "md:grid-cols-2",
                schoolGroups.length >= 3 && "md:grid-cols-2 xl:grid-cols-3",
              )}
            >
              {schoolGroups.map(({ cat, schools: inCat }) => (
                <div
                  key={cat.id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3.5 py-2.5">
                    <p
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: cat.color || "#818cf8" }}
                    >
                      {cat.name}
                    </p>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-400">
                      {inCat.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-800/80">
                    {inCat.map((s) => (
                      <li key={s.selectionId || s.id} className="px-3.5 py-3">
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        {s.notes && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.notes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {roadmapPhases.length > 0 && (
          <section>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Strategic roadmap
            </h4>
            <div className="space-y-3">
              {roadmapPhases.map(({ phase, idx, tasks }) => (
                <div
                  key={phase}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Phase {idx + 1}
                  </p>
                  <ol className="space-y-2">
                    {tasks.map((t, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-bold text-indigo-300">
                          {i + 1}
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        {leverage.length > 0 && (
          <section>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Leverage actions
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {leverage.map((action, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      action.impact === "High" && "bg-emerald-500/10 text-emerald-400",
                      action.impact === "Moderate" && "bg-indigo-500/10 text-indigo-300",
                      action.impact === "Lower" && "bg-slate-800 text-slate-400",
                    )}
                  >
                    {action.impact} impact
                  </span>
                  <h5 className="mt-2 text-sm font-bold text-white">{action.title}</h5>
                  {action.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                      {action.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {risks.length > 0 && (
          <section>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Risk factors
            </h4>
            <div className="space-y-3">
              {risks.map((risk, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <h5 className="text-sm font-bold text-white">{risk.factor}</h5>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        risk.severity === "High" && "bg-rose-500/10 text-rose-400",
                        risk.severity === "Medium" && "bg-amber-500/10 text-amber-300",
                        risk.severity === "Low" && "bg-slate-800 text-slate-400",
                      )}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  {risk.description && (
                    <p className="text-sm leading-relaxed text-slate-400">{risk.description}</p>
                  )}
                  {risk.mitigation && (
                    <p className="mt-2 border-t border-slate-800 pt-2 text-sm text-slate-400">
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
    </div>
  );
}

/** Hex-only PDF markup — mirrors preview layout without Tailwind lab()/oklch colors. */
function PlanPdfDocument({
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
  const cats = (() => {
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
  })();

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
  const schoolGroups = cats
    .map((cat) => ({
      cat,
      schools: schools.filter((s) => schoolCategoryKey(s) === cat.id),
    }))
    .filter((g) => g.schools.length > 0);

  const initial = (studentName.trim()[0] || "S").toUpperCase();
  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const score = Math.max(0, Math.min(100, draft.overallScore));
  const donutTone = score >= 80 ? "#34d399" : score >= 60 ? "#818cf8" : "#f59e0b";
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;

  const kpiMeta = (value: KpiLevel) => {
    switch (value) {
      case "Strong":
        return { text: "#34d399", bar: "#10b981", width: "100%" };
      case "Moderate":
        return { text: "#a5b4fc", bar: "#6366f1", width: "75%" };
      case "Developing":
        return { text: "#fcd34d", bar: "#f59e0b", width: "50%" };
      default:
        return { text: "#fb7185", bar: "#f43f5e", width: "25%" };
    }
  };

  const sectionLabel: React.CSSProperties = {
    margin: "0 0 12px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  return (
    <div
      id="school-selection-pdf-export"
      style={{
        width: 800,
        boxSizing: "border-box",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        background: "#020617",
        color: "#e2e8f0",
        border: "1px solid #1e293b",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          background: "#0f172a",
          padding: "24px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", gap: 16, minWidth: 0 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#4f46e5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#818cf8",
                }}
              >
                Strategic Selection Plan
              </p>
              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                {studentName}
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                Prepared by Dental School Guide · {dateLabel}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: "1px solid #1e293b",
              background: "#020617",
              borderRadius: 12,
              padding: "10px 14px",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "relative", width: 88, height: 88 }}>
              <svg
                viewBox="0 0 112 112"
                width="88"
                height="88"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle cx="56" cy="56" r={r} fill="transparent" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="56"
                  cy="56"
                  r={r}
                  fill="transparent"
                  stroke={donutTone}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {score}
                </span>
                <span style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>/ 100</span>
              </div>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Overall strength
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8" }}>
                Leverage{" "}
                <span style={{ fontWeight: 700, color: "#a5b4fc" }}>
                  {draft.improvementLeverageScore}%
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: 28 }}>
        <section>
          <h4 style={sectionLabel}>Strategic snapshot</h4>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#cbd5e1" }}>
            {draft.snapshot.trim() || "No strategic snapshot has been written yet."}
          </p>
        </section>

        <section>
          <h4 style={sectionLabel}>Profile KPIs</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {kpiEntries.map(([key, value]) => {
              const meta = kpiMeta(value);
              return (
                <div
                  key={key}
                  style={{
                    border: "1px solid #1e293b",
                    background: "#0f172a",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    {kpiLabel(key)}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: meta.text }}>
                    {value}
                  </p>
                  <div
                    style={{
                      marginTop: 10,
                      height: 6,
                      borderRadius: 999,
                      background: "#1e293b",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: meta.width,
                        borderRadius: 999,
                        background: meta.bar,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div
            style={{
              border: "1px solid #065f46",
              background: "#022c22",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h4
              style={{
                ...sectionLabel,
                color: "#34d399",
                marginBottom: 12,
              }}
            >
              Strengths to leverage
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {strengths.length === 0 ? (
                <li style={{ fontSize: 13, fontStyle: "italic", color: "#475569" }}>None listed</li>
              ) : (
                strengths.map((s, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "#cbd5e1",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                    <span>{s}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div
            style={{
              border: "1px solid #9f1239",
              background: "#4c0519",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h4 style={{ ...sectionLabel, color: "#fb7185", marginBottom: 12 }}>Critical gaps</h4>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {gaps.length === 0 ? (
                <li style={{ fontSize: 13, fontStyle: "italic", color: "#475569" }}>None listed</li>
              ) : (
                gaps.map((g, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "#cbd5e1",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: "#fb7185", fontWeight: 700 }}>!</span>
                    <span>{g}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section>
          <h4 style={sectionLabel}>School selection</h4>
          <p style={{ margin: "-4px 0 14px", fontSize: 13, color: "#64748b" }}>
            {schools.length > 0
              ? `${schools.length} school${schools.length === 1 ? "" : "s"} across ${schoolGroups.length} categor${schoolGroups.length === 1 ? "y" : "ies"}`
              : "No schools linked yet"}
          </p>
          {schoolGroups.length === 0 ? (
            <p
              style={{
                margin: 0,
                border: "1px dashed #1e293b",
                borderRadius: 12,
                padding: "36px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "#475569",
              }}
            >
              No schools on this list yet.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: schoolGroups.length === 1 ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              {schoolGroups.map(({ cat, schools: inCat }) => (
                <div
                  key={cat.id}
                  style={{
                    border: "1px solid #1e293b",
                    background: "#0f172a",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #1e293b",
                      background: "#111827",
                      padding: "10px 14px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: cat.color || "#818cf8",
                      }}
                    >
                      {cat.name}
                    </p>
                    <span
                      style={{
                        background: "#1e293b",
                        color: "#94a3b8",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {inCat.length}
                    </span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {inCat.map((s) => (
                      <li
                        key={s.selectionId || s.id}
                        style={{
                          padding: "12px 14px",
                          borderTop: "1px solid #1e293b",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff" }}>
                          {s.name}
                        </p>
                        {s.notes ? (
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: 12,
                              lineHeight: 1.5,
                              color: "#64748b",
                            }}
                          >
                            {s.notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {roadmapPhases.length > 0 && (
          <section>
            <h4 style={sectionLabel}>Strategic roadmap</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {roadmapPhases.map(({ phase, idx, tasks }) => (
                <div
                  key={phase}
                  style={{
                    border: "1px solid #1e293b",
                    background: "#0f172a",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#818cf8",
                    }}
                  >
                    Phase {idx + 1}
                  </p>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {tasks.map((t, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 12,
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: "#cbd5e1",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            background: "#312e81",
                            color: "#a5b4fc",
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        {leverage.length > 0 && (
          <section>
            <h4 style={sectionLabel}>Leverage actions</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {leverage.map((action, idx) => {
                const badge =
                  action.impact === "High"
                    ? { bg: "#064e3b", color: "#34d399" }
                    : action.impact === "Moderate"
                      ? { bg: "#312e81", color: "#a5b4fc" }
                      : { bg: "#1e293b", color: "#94a3b8" };
                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #1e293b",
                      background: "#0f172a",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {action.impact} impact
                    </span>
                    <h5
                      style={{
                        margin: "8px 0 0",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {action.title}
                    </h5>
                    {action.description ? (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: "#94a3b8",
                        }}
                      >
                        {action.description}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {risks.length > 0 && (
          <section>
            <h4 style={sectionLabel}>Risk factors</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {risks.map((risk, idx) => {
                const badge =
                  risk.severity === "High"
                    ? { bg: "#4c0519", color: "#fb7185" }
                    : risk.severity === "Medium"
                      ? { bg: "#78350f", color: "#fcd34d" }
                      : { bg: "#1e293b", color: "#94a3b8" };
                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #1e293b",
                      background: "#0f172a",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>
                        {risk.factor}
                      </h5>
                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    {risk.description ? (
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#94a3b8" }}>
                        {risk.description}
                      </p>
                    ) : null}
                    {risk.mitigation ? (
                      <p
                        style={{
                          margin: "10px 0 0",
                          paddingTop: 10,
                          borderTop: "1px solid #1e293b",
                          fontSize: 13,
                          color: "#94a3b8",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#34d399" }}>Mitigation: </span>
                        {risk.mitigation}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

async function exportPlanPdf(opts: {
  studentName: string;
  draft: PlanDraft;
  schools: HubSchool[];
  categories: SchoolCategory[];
}) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:800px;background:#020617;pointer-events:none;z-index:-1;";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(
      <PlanPdfDocument
        studentName={opts.studentName}
        draft={opts.draft}
        schools={opts.schools}
        categories={opts.categories}
      />,
    );
    await new Promise((r) => setTimeout(r, 120));

    const target = host.querySelector("#school-selection-pdf-export") as HTMLElement | null;
    if (!target) throw new Error("PDF export root missing");

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#020617",
      width: 800,
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const safeName = (opts.studentName || "School_Selection").replace(/[^\w\-]+/g, "_");
    pdf.save(`${safeName}_School_Selection.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}

export default function SchoolSelectionView() {
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<MainTab>("reports");
  const [createMode, setCreateMode] = useState<CreateMode>("manual");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [manualSchools, setManualSchools] = useState<HubSchool[]>([]);
  const [manualCategories, setManualCategories] =
    useState<SchoolCategory[]>(DEFAULT_CATEGORIES);

  const platformConfig = usePlatformConfig();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const {
    data: planReports = [],
    isLoading: reportsLoading,
  } = useOptimizationPlansList(mainTab === "reports" || mainTab === "create");
  const { data: existingPlan, isLoading: planLoading } = useOptimizationPlan(studentId || undefined);
  const upsertPlan = useUpsertOptimizationPlan();
  const deletePlan = useDeleteOptimizationPlan();
  const { data: accountSchools = [] } = useStudentSchools(studentId || undefined);
  const { data: accountCategories = [] } = useSchoolCategories(studentId || undefined);

  const studentOptions = useMemo(
    () => [
      { value: "", label: "None — create external plan on save" },
      ...[...students]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({
          value: s.id,
          label: isExternalStudentEmail(s.email)
            ? `${s.name} · External`
            : s.email
              ? `${s.name} · ${s.email}`
              : s.name,
        })),
    ],
    [students],
  );

  const selectedStudent = students.find((s) => s.id === studentId);
  const displayName = studentName.trim() || selectedStudent?.name || "";
  const canEditPlan = displayName.length > 0;
  const previewSchools = selectedStudent ? accountSchools : manualSchools;
  const previewCategories = selectedStudent ? accountCategories : manualCategories;

  const boardStudent = useMemo<Student>(() => {
    if (selectedStudent) return selectedStudent;
    return {
      id: "__manual__",
      name: displayName || "Customer",
      email: "",
      schoolCategories: manualCategories,
    };
  }, [selectedStudent, displayName, manualCategories]);

  useEffect(() => {
    if (!studentId) return;
    if (planLoading) return;
    // Only hydrate from server when a plan exists — avoid wiping an in-progress
    // draft while an external student is being created/saved.
    if (existingPlan) setDraft(planToDraft(existingPlan));
  }, [studentId, existingPlan, planLoading]);

  const handleStudentSelect = (id: string) => {
    setStudentId(id);
    if (!id) {
      setDraft(EMPTY_DRAFT);
      return;
    }
    const match = students.find((s) => s.id === id);
    if (match?.name) setStudentName(match.name);
    // Clear until the linked plan loads (effect will refill if one exists)
    setDraft(EMPTY_DRAFT);
  };

  const patch = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const name = studentName.trim() || selectedStudent?.name?.trim() || "";
    if (!name) {
      toast.error("Enter a student name before saving.");
      return;
    }
    if (!draft.snapshot.trim()) {
      toast.error("Strategic snapshot is required");
      return;
    }

    const cleanList = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
    setSavingPlan(true);

    try {
      let targetStudentId = studentId;
      let createdExternal = false;

      // External (name-only): create a shell student so the plan can be stored
      if (!targetStudentId) {
        const created = await studentsApi.createExternal({ name });
        targetStudentId = created.id;
        createdExternal = true;
        setStudentName(created.name || name);

        // Persist any local school board drafted before linking
        if (manualCategories.length > 0) {
          await schoolCategoriesApi.replace(targetStudentId, manualCategories);
        }
        for (const school of manualSchools) {
          // Sheet catalog ids are not DB UUIDs — ensure a directory row first
          const ensured = await schoolsApi.ensure(schoolEnsurePayloadFromHub(school));
          await studentSchoolsApi.create({
            studentId: targetStudentId,
            schoolId: ensured.id,
            category: school.type || manualCategories[0]?.id || "Target",
            notes: typeof school.notes === "string" ? school.notes : undefined,
          });
        }
      }

      const hadPlan = !!existingPlan && !createdExternal;

      await upsertPlan.mutateAsync({
        studentId: targetStudentId,
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

      // Link after upsert so the plan query doesn't wipe the draft mid-save
      if (createdExternal) {
        setStudentId(targetStudentId);
        setManualSchools([]);
        await queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.studentSchools.all(targetStudentId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.schoolCategories.all(targetStudentId),
        });
      }

      toast.success(
        createdExternal
          ? "External student plan created"
          : hadPlan
            ? "Strategic selection plan updated"
            : "Strategic selection plan created",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleExportPdf = async () => {
    if (!displayName.trim()) {
      toast.error("Enter a student name before downloading.");
      return;
    }
    setExportingPdf(true);
    toast.info("Generating PDF…");
    try {
      await exportPlanPdf({
        studentName: displayName,
        draft,
        schools: previewSchools,
        categories: previewCategories,
      });
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadReport = async (report: OptimizationPlanListItem) => {
    const reportStudentId =
      report.student_id || report.studentId || report.student?.id || "";
    const name = report.student?.name || "Unnamed student";
    if (!reportStudentId) {
      toast.error("This report has no linked student.");
      return;
    }

    setExportingReportId(report.id);
    toast.info("Generating PDF…");
    try {
      const [schoolRows, categories] = await Promise.all([
        studentSchoolsApi.list(reportStudentId),
        schoolCategoriesApi.list(reportStudentId).catch(() => DEFAULT_CATEGORIES),
      ]);
      const schools = (schoolRows || []).map((row) =>
        mapStudentSchoolToHubSchool(row as StudentSchool),
      );
      await exportPlanPdf({
        studentName: name,
        draft: planToDraft(report),
        schools,
        categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
      });
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setExportingReportId(null);
    }
  };

  const resetCreateForm = () => {
    setStudentId("");
    setStudentName("");
    setDraft(EMPTY_DRAFT());
    setManualSchools([]);
    setManualCategories(DEFAULT_CATEGORIES);
    setCreateMode("manual");
  };

  const openReport = (reportStudentId: string, reportStudentName: string) => {
    setStudentId(reportStudentId);
    setStudentName(reportStudentName);
    setManualSchools([]);
    setManualCategories(DEFAULT_CATEGORIES);
    setCreateMode("manual");
    setMainTab("create");
  };

  const startNewReport = () => {
    resetCreateForm();
    setMainTab("create");
  };

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    if (!q) return planReports;
    return planReports.filter((r) => {
      const name = r.student?.name || "";
      const email = r.student?.email || "";
      const snap = r.snapshot || "";
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        snap.toLowerCase().includes(q)
      );
    });
  }, [planReports, reportSearch]);

  const saveDisabled = !canEditPlan || savingPlan || upsertPlan.isPending;

  usePageHeaderAction(
    mainTab === "create" && createMode === "manual"
      ? {
          label: existingPlan || studentId ? "Save plan" : "Create plan",
          icon:
            savingPlan || upsertPlan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            ),
          onClick: () => void handleSave(),
          disabled: saveDisabled,
        }
      : mainTab === "reports"
        ? {
            label: "Create New Report",
            icon: <Plus className="h-4 w-4" />,
            onClick: startNewReport,
          }
        : null,
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:min-w-0">
          {MAIN_TABS.map((item) => {
            const Icon = item.icon;
            const selected = mainTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "create" && mainTab === "reports" && !studentId) {
                    resetCreateForm();
                  }
                  setMainTab(item.id);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {mainTab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search by student name…"
                className="h-9 rounded-lg border-slate-800 bg-slate-900/50 pl-9 text-sm"
              />
            </div>
            <p className="shrink-0 text-xs text-slate-500">
              <span className="font-semibold text-slate-300">
                {reportsLoading ? "…" : planReports.length}
              </span>{" "}
              {planReports.length === 1 ? "report" : "reports"}
            </p>
          </div>

          {reportsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
          ) : filteredReports.length === 0 ? (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="No reports yet"
              description="Create your first school selection report for an internal or external student."
              action={
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={startNewReport}>
                  Create New Report
                </Button>
              }
            />
          ) : (
            <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredReports.map((report) => {
                const reportStudentId =
                  report.student_id || report.studentId || report.student?.id || "";
                const name = report.student?.name || "Unnamed student";
                const email = report.student?.email || "";
                const external = Boolean(report.student?.isExternal);
                const updated = report.updated_at || report.created_at || "";
                const score = Math.min(
                  100,
                  Math.max(0, Number(report.overallScore ?? report.overall_score ?? 0)),
                );
                const snapshot = report.snapshot?.trim() || "No strategic snapshot.";
                const downloading = exportingReportId === report.id;
                return (
                  <div
                    key={report.id}
                    className="group relative flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-indigo-500/30"
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-2 h-8 w-8 text-rose-400 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                      title="Delete report"
                      disabled={!reportStudentId}
                      onClick={() => {
                        if (!window.confirm(`Delete report for ${name}?`)) return;
                        deletePlan.mutate(
                          { id: report.id, studentId: reportStudentId },
                          {
                            onSuccess: () => toast.success("Report deleted"),
                            onError: (err: any) =>
                              toast.error(err?.message || "Failed to delete"),
                          },
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-start gap-3 pr-8">
                      <Avatar
                        name={name}
                        src={report.student?.avatar || undefined}
                        size="md"
                        className="shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="truncate text-base font-bold text-white">{name}</h3>
                          {external ? (
                            <span className="rounded border border-slate-700 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              External
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {external ? "External" : email || "Internal student"}
                          {updated
                            ? ` · Updated ${new Date(updated).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Overall strength
                        </span>
                        <span className="text-sm font-bold tabular-nums text-indigo-300">
                          {score}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-[2.5rem] flex-1 text-sm text-slate-400">
                      {snapshot}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-9 text-xs"
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                        disabled={!reportStudentId}
                        onClick={() => openReport(reportStudentId, name)}
                      >
                        View report
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs"
                        leftIcon={
                          downloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )
                        }
                        disabled={!reportStudentId || downloading || exportingPdf}
                        onClick={() => void handleDownloadReport(report)}
                      >
                        Download PDF
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mainTab === "create" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setMainTab("reports")}
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to reports
            </button>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
              {CREATE_MODES.map((item) => {
                const Icon = item.icon;
                const selected = createMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCreateMode(item.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                      selected
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.id === "ai" && (
                      <span className="rounded border border-amber-500/20 bg-amber-500/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-amber-300">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {createMode === "ai" && (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Generated Plan"
              description="Not wired yet. In a later phase, admins will generate strategic selection plans from student profiles, documents, and notes."
            />
          )}

          {createMode === "manual" && (
        <div className="space-y-4">
          <SectionCard
            icon={Target}
            iconClass="bg-indigo-500/10 text-indigo-400"
            title="Student"
            subtitle="Name required. Optionally link an internal student, or leave blank for an external plan."
            actions={
              canEditPlan ? (
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <FormField label="Student name" required className="w-full max-w-xs">
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="h-9"
                />
              </FormField>
              <FormField label="Link student" className="w-full max-w-xs">
                <SelectMenu
                  value={studentId}
                  onChange={handleStudentSelect}
                  options={studentOptions}
                  placeholder={studentsLoading ? "Loading…" : "Optional…"}
                  className="w-full"
                  disabled={studentsLoading}
                />
              </FormField>
            </div>
            {selectedStudent ? (
              <p className="text-xs text-slate-500">
                {isExternalStudentEmail(selectedStudent.email)
                  ? "External plan · "
                  : "Internal student · "}
                {existingPlan
                  ? "Existing plan loaded — edits will overwrite on save."
                  : "No saved plan yet — fill in the sections below and create one."}
              </p>
            ) : canEditPlan ? (
              <p className="text-xs text-slate-500">
                No dashboard student linked — Save will create an external student record for this plan.
              </p>
            ) : null}
          </SectionCard>

          {!canEditPlan ? (
            <EmptyState
              icon={<School className="h-6 w-6" />}
              title="Enter a student name"
              description="Type the customer’s name above to build their strategic selection plan. Link a dashboard student only if they already have an account."
            />
          ) : studentId && planLoading ? (
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
                subtitle={
                  selectedStudent
                    ? "Same board as the student’s Plan → Schools tab (saved to their account)"
                    : "Same school board — included in preview / PDF for this customer"
                }
              >
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:p-4">
                  <SchoolSelectionTab
                    key={selectedStudent?.id || `manual:${displayName}`}
                    student={boardStudent}
                    isMentorView
                    localOnly={!selectedStudent}
                    initialSchools={selectedStudent ? undefined : manualSchools}
                    platformConfig={platformConfig}
                    onUpdateSchools={(schools) => {
                      if (!selectedStudent) setManualSchools(schools);
                    }}
                    onUpdateStudent={(updates) => {
                      if (!selectedStudent && updates.schoolCategories) {
                        setManualCategories(updates.schoolCategories);
                      }
                    }}
                  />
                </div>
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
        </div>
      )}

      <Modal
        open={previewOpen && canEditPlan}
        onClose={() => setPreviewOpen(false)}
        title="Plan preview"
        description={`Strategic selection plan for ${displayName}`}
        size="2xl"
        fullHeight
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              leftIcon={
                exportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )
              }
              disabled={exportingPdf}
              onClick={() => void handleExportPdf()}
            >
              Download PDF
            </Button>
          </div>
        }
      >
        {canEditPlan && (
          <PlanPreviewBody
            studentName={displayName}
            draft={draft}
            schools={previewSchools}
            categories={previewCategories}
          />
        )}
      </Modal>
    </div>
  );
}
