"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileUp,
  FlaskConical,
  Globe,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  School,
  ShieldCheck,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  FormField,
  Input,
  SelectMenu,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { schoolsApi } from "@/lib/api/schools";
import {
  schoolAiApi,
  type SchoolAiDocumentSource,
  type SchoolAiFactorBreakdown,
  type SchoolAiFactsCache,
  type SchoolAiRawFact,
  type SchoolAiRubricFactor,
  type SchoolAiScoreRow,
  type SchoolAiWebSource,
} from "@/lib/api/schoolAi";
import type { School as CrmSchool, Student } from "@/lib/types";

type CrmSchoolRow = CrmSchool & { ai_school_id?: string | null };
type PrimaryTab = "schools" | "sources" | "rubric" | "compare";

const HEALTH_POLL_MS = 30_000;
const JOB_POLL_MS = 3_000;

function normalizeFactorBreakdown(
  raw: SchoolAiScoreRow["per_factor_breakdown"],
): SchoolAiFactorBreakdown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (Array.isArray(raw.factors)) return raw.factors;
    // Some older rows stored a map keyed by factor_key.
    const values = Object.values(raw as Record<string, unknown>);
    if (
      values.length > 0 &&
      values.every(
        (v) =>
          v != null &&
          typeof v === "object" &&
          "factor_key" in (v as Record<string, unknown>),
      )
    ) {
      return values as SchoolAiFactorBreakdown[];
    }
  }
  return [];
}

function studentCompareAttrs(student: Student): Record<string, number | string | null> {
  const p = student.profile;
  const num = (v: unknown) =>
    v == null || v === "" ? null : typeof v === "number" ? v : Number(v);
  return {
    avg_gpa: num(student.gpa ?? student.cgpa ?? p?.gpa),
    avg_science_gpa: num(student.sgpa ?? p?.sgpa),
    avg_dat_aa: num(student.datAA ?? p?.dat_aa),
    avg_dat_total_science: num(p?.dat_ts),
    avg_dat_pat: num(student.datPAT ?? p?.dat_pat),
    avg_dat_biology: num(p?.dat_bio),
    avg_dat_general_chemistry: num(p?.dat_gc),
    avg_dat_organic_chemistry: num(p?.dat_oc),
    avg_dat_reading_comprehension: num(p?.dat_rc),
    avg_dat_quantitative_reasoning: num(p?.dat_qr),
    shadowing_hours: num(student.shadowingHours),
  };
}

function previewBreakdown(
  factors: SchoolAiRubricFactor[],
  attrs: Record<string, number | string | null>,
): SchoolAiFactorBreakdown[] {
  return factors.map((f) => {
    const studentValue = attrs[f.factor_key] ?? null;
    const schoolExpectation =
      f.value == null || f.value === ""
        ? null
        : typeof f.value === "number" || typeof f.value === "string"
          ? f.value
          : String(f.value);
    return {
      factor_key: f.factor_key,
      weight: f.weight,
      student_value: studentValue,
      school_expectation: schoolExpectation,
      factor_score: studentValue == null ? 0 : undefined,
      method: studentValue == null ? "not_met_missing_student_value" : "preview_unscored",
    };
  });
}

function FactorCompareTable({ factors }: { factors: SchoolAiFactorBreakdown[] }) {
  if (factors.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No factors to compare yet. Generate &amp; approve a rubric first.
      </p>
    );
  }
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="sticky top-0 bg-slate-950/95 text-slate-500">
          <tr>
            <th className="px-2.5 py-2 font-medium">Fact</th>
            <th className="px-2.5 py-2 font-medium">School expects</th>
            <th className="px-2.5 py-2 font-medium">Student</th>
            <th className="px-2.5 py-2 font-medium">Score</th>
            <th className="px-2.5 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {factors.map((f, i) => {
            const status = factorStatus(f);
            return (
              <tr key={`${f.factor_key}-${i}`} className="text-slate-300">
                <td className="px-2.5 py-1.5">
                  <div className="font-medium text-slate-200">{f.factor_key}</div>
                  {f.category ? (
                    <div className="text-[10px] text-slate-500">{f.category}</div>
                  ) : null}
                </td>
                <td className="px-2.5 py-1.5 text-slate-400">
                  {formatCompareValue(f.school_expectation)}
                </td>
                <td className="px-2.5 py-1.5">
                  {f.student_value == null || f.student_value === "" ? (
                    <span className="text-red-400/80">not provided</span>
                  ) : (
                    formatCompareValue(f.student_value)
                  )}
                </td>
                <td className="px-2.5 py-1.5 text-slate-400">
                  {f.factor_score != null
                    ? `${Math.round(Number(f.factor_score) * 100)}%`
                    : f.method === "preview_unscored"
                      ? "—"
                      : "—"}
                </td>
                <td className={`px-2.5 py-1.5 font-medium ${status.className}`}>
                  {f.method === "preview_unscored" ? "Ready to score" : status.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCompareValue(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  return String(value);
}

function factorStatus(row: SchoolAiFactorBreakdown): { label: string; className: string } {
  const method = row.method || "";
  const score = row.factor_score ?? 0;
  if (method.startsWith("not_met_")) {
    return { label: "Not met", className: "text-red-400" };
  }
  if (score >= 0.95) return { label: "Met", className: "text-emerald-400" };
  if (score > 0) return { label: "Partial", className: "text-amber-300" };
  return { label: "Not met", className: "text-red-400" };
}

function HealthBadge({ status }: { status: string }) {
  const tone =
    status === "ok"
      ? "success"
      : status === "degraded"
        ? "warning"
        : status === "checking"
          ? "default"
          : "danger";
  const label =
    status === "ok"
      ? "Service online"
      : status === "degraded"
        ? "Service degraded"
        : status === "checking"
          ? "Checking…"
          : "Service offline";
  return (
    <Badge variant={tone as never} className="gap-1.5">
      {status === "checking" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full bg-current" />
      )}
      {label}
    </Badge>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs text-slate-600">—</span>;
  const tone =
    status === "succeeded" || status === "complete" || status === "approved"
      ? "text-emerald-400"
      : status === "failed"
        ? "text-red-400"
        : status === "running" || status === "processing" || status === "pending"
          ? "text-amber-300"
          : "text-slate-400";
  return <span className={`text-xs font-medium ${tone}`}>{status}</span>;
}

function factValue(fact: SchoolAiRawFact): string {
  if (fact.value == null || fact.value === "") return "—";
  return fact.unit ? `${fact.value} ${fact.unit}` : String(fact.value);
}

function rubricValueDisplay(factor: SchoolAiRubricFactor): string {
  if (factor.value == null || factor.value === "") return "—";
  return String(factor.value);
}

function parseEditValue(raw: string): string | number {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const asNum = Number(trimmed);
  if (!Number.isNaN(asNum) && /^-?\d+(\.\d+)?$/.test(trimmed)) return asNum;
  return trimmed;
}

function formatBytes(n?: number | null) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdmissionResearchView() {
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const [tab, setTab] = useState<PrimaryTab>("schools");
  const [schools, setSchools] = useState<CrmSchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [crmSchoolId, setCrmSchoolId] = useState("");
  const [aiSchoolId, setAiSchoolId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [health, setHealth] = useState("checking");

  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolUrl, setNewSchoolUrl] = useState("");
  const [newSchoolLocation, setNewSchoolLocation] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const [crawlUrl, setCrawlUrl] = useState("");
  const [lastJobId, setLastJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [documents, setDocuments] = useState<SchoolAiDocumentSource[]>([]);
  const [webSources, setWebSources] = useState<SchoolAiWebSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const [factsCache, setFactsCache] = useState<SchoolAiFactsCache | null>(null);
  const [factsLoading, setFactsLoading] = useState(false);
  const [coverage, setCoverage] = useState<{
    filled: number;
    total: number;
    coverage_pct: number;
    by_category?: Record<string, { total: number; filled: number }>;
  } | null>(null);

  const [scores, setScores] = useState<SchoolAiScoreRow[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [editingFactKey, setEditingFactKey] = useState<string | null>(null);
  const [editFactValue, setEditFactValue] = useState("");
  const [editingRubricKey, setEditingRubricKey] = useState<string | null>(null);
  const [editRubricValue, setEditRubricValue] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedSchool = schools.find((s) => s.id === crmSchoolId);

  const schoolOptions = useMemo(
    () =>
      [...schools]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({
          value: s.id,
          label: s.location ? `${s.name} · ${s.location}` : s.name,
        })),
    [schools],
  );

  const filteredSchools = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    const list = [...schools].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.location || "").toLowerCase().includes(q),
    );
  }, [schools, schoolSearch]);

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

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      const list = await schoolsApi.list();
      setSchools(list as CrmSchoolRow[]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load schools");
    } finally {
      setSchoolsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const report = await schoolAiApi.health();
        if (active) setHealth(report.status || "ok");
      } catch {
        if (active) setHealth("offline");
      }
    };
    void check();
    const id = setInterval(check, HEALTH_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const ensureAiSchool = useCallback(async (): Promise<string> => {
    if (aiSchoolId) return aiSchoolId;
    if (!crmSchoolId) throw new Error("Select a school first");
    const result = await schoolAiApi.ensureSchool({ crmSchoolId });
    setAiSchoolId(result.aiSchoolId);
    await loadSchools();
    return result.aiSchoolId;
  }, [aiSchoolId, crmSchoolId, loadSchools]);

  const loadFactsCache = useCallback(async (schoolId: string) => {
    setFactsLoading(true);
    try {
      const { cache } = await schoolAiApi.getFactsCache(schoolId);
      setFactsCache(cache);
      if (cache?.ai_school_id) setAiSchoolId(cache.ai_school_id);
    } catch {
      setFactsCache(null);
    } finally {
      setFactsLoading(false);
    }
  }, []);

  const loadSources = useCallback(async (aiId: string) => {
    setSourcesLoading(true);
    try {
      const res = await schoolAiApi.listSources(aiId);
      setDocuments(res.documents || []);
      setWebSources(res.web_sources || []);
      try {
        const cov = await schoolAiApi.getCoverage(aiId);
        setCoverage({
          filled: cov.filled,
          total: cov.total,
          coverage_pct: cov.coverage_pct,
          by_category: cov.by_category,
        });
      } catch {
        setCoverage(null);
      }
    } catch {
      setDocuments([]);
      setWebSources([]);
      setCoverage(null);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  const loadScores = useCallback(async (student: string) => {
    setScoresLoading(true);
    try {
      const { scores: rows } = await schoolAiApi.getStudentScores(student);
      setScores(rows);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load comparisons");
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    setFactsCache(null);
    setDocuments([]);
    setWebSources([]);
    setCoverage(null);
    setAiSchoolId(selectedSchool?.ai_school_id || "");
    if (!crmSchoolId) return;
    void loadFactsCache(crmSchoolId);
    if (selectedSchool?.ai_school_id) void loadSources(selectedSchool.ai_school_id);
  }, [crmSchoolId, selectedSchool, loadFactsCache, loadSources]);

  useEffect(() => {
    setScores([]);
    if (studentId) void loadScores(studentId);
  }, [studentId, loadScores]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      setLastJobId(jobId);
      setJobStatus("pending");
      pollRef.current = setInterval(async () => {
        try {
          const job = await schoolAiApi.getJob(jobId);
          setJobStatus(job.status);
          if (["succeeded", "failed", "cancelled"].includes(job.status)) {
            stopPolling();
            if (job.status === "succeeded") {
              toast.success("Job completed");
              if (crmSchoolId) {
                const { cache } = await schoolAiApi.refreshFactsCache(crmSchoolId);
                setFactsCache(cache);
              }
              if (aiSchoolId) await loadSources(aiSchoolId);
            } else if (job.status === "failed") {
              const detail =
                typeof job.error === "object" && job.error && "type" in job.error
                  ? String((job.error as { type?: string }).type)
                  : "unknown";
              toast.error(`Job failed (${detail})`);
            }
          }
        } catch {
          /* keep polling */
        }
      }, JOB_POLL_MS);
    },
    [stopPolling, crmSchoolId, aiSchoolId, loadSources],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  const rawFacts = factsCache?.raw_facts ?? [];
  const rubricFactors: SchoolAiRubricFactor[] = factsCache?.rubric?.factors ?? [];
  const selectedStudent = students.find((s) => s.id === studentId);
  const previewFactors = useMemo(() => {
    if (!selectedStudent || rubricFactors.length === 0) return [];
    return previewBreakdown(rubricFactors, studentCompareAttrs(selectedStudent));
  }, [selectedStudent, rubricFactors]);
  const scoredForSelectedSchool = useMemo(
    () => scores.find((s) => s.school_id === crmSchoolId) || null,
    [scores, crmSchoolId],
  );

  const selectSchool = (id: string) => {
    setCrmSchoolId(id);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-10">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-white">Admission Research</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage schools, feed data sources, review extracted rubrics, and compare students.
            </p>
            <div className="mt-3 max-w-md">
              <FormField label="Working school">
                <SelectMenu
                  value={crmSchoolId}
                  onChange={(id) => selectSchool(id)}
                  options={schoolOptions}
                  placeholder={
                    schoolsLoading
                      ? "Loading schools…"
                      : schoolOptions.length === 0
                        ? "No schools yet — add one in Schools"
                        : "Select a school…"
                  }
                  className="w-full"
                />
              </FormField>
              {selectedSchool ? (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {aiSchoolId ? (
                    <>
                      Linked{" "}
                      <code className="rounded bg-slate-950 px-1 py-0.5 text-[10px] text-slate-400">
                        {aiSchoolId.slice(0, 8)}…
                      </code>
                    </>
                  ) : (
                    <span className="text-amber-400/80">Not linked yet — use Link in the Schools list</span>
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <HealthBadge status={health} />
      </div>

      <Tabs
        defaultValue="schools"
        value={tab}
        onValueChange={(v) => setTab(v as PrimaryTab)}
        className="w-full min-w-0 space-y-4"
      >
        <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar">
          <TabsList className="min-w-max">
            <TabsTrigger value="schools">
              <School className="h-4 w-4" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="sources">
              <FileUp className="h-4 w-4" />
              Data Sources
            </TabsTrigger>
            <TabsTrigger value="rubric">
              <ShieldCheck className="h-4 w-4" />
              Rubric
            </TabsTrigger>
            <TabsTrigger value="compare">
              <Target className="h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Schools ─────────────────────────────────────────────── */}
        <TabsContent value="schools" className="mt-4 space-y-4">
          <Panel
            title="Add school"
            subtitle="Creates the CRM school and links it to the research service"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Name" required>
                <Input
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="Harvard School of Dental Medicine"
                  className="h-9"
                />
              </FormField>
              <FormField label="Location">
                <Input
                  value={newSchoolLocation}
                  onChange={(e) => setNewSchoolLocation(e.target.value)}
                  placeholder="Boston, MA"
                  className="h-9"
                />
              </FormField>
              <FormField label="Official admissions URL">
                <Input
                  value={newSchoolUrl}
                  onChange={(e) => setNewSchoolUrl(e.target.value)}
                  placeholder="https://school.edu/admissions"
                  className="h-9"
                />
              </FormField>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                leftIcon={
                  busy === "add" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )
                }
                disabled={!newSchoolName.trim() || !!busy}
                onClick={() =>
                  void run("add", async () => {
                    const result = await schoolAiApi.ensureSchool({
                      name: newSchoolName.trim(),
                      officialUrl: newSchoolUrl.trim() || undefined,
                    });
                    if (newSchoolLocation.trim()) {
                      try {
                        await schoolsApi.update(result.crmSchoolId, {
                          location: newSchoolLocation.trim(),
                        });
                      } catch {
                        /* location update is best-effort */
                      }
                    }
                    toast.success(`School added${result.created ? " & linked" : ""}`);
                    setNewSchoolName("");
                    setNewSchoolUrl("");
                    setNewSchoolLocation("");
                    await loadSchools();
                    setCrmSchoolId(result.crmSchoolId);
                    setTab("sources");
                  })
                }
              >
                Add school
              </Button>
            </div>
          </Panel>

          <Panel
            title="School list"
            subtitle="Link or delete schools here. Pick the working school with the dropdown at the top."
            action={
              <Input
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Search schools…"
                className="h-8 w-48"
              />
            }
          >
            {schoolsLoading ? (
              <p className="text-xs text-slate-500">Loading schools…</p>
            ) : filteredSchools.length === 0 ? (
              <p className="text-xs text-slate-500">No schools found. Add one above.</p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950/90 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">School</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">AI link</th>
                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSchools.map((s) => {
                      const selected = s.id === crmSchoolId;
                      return (
                        <tr
                          key={s.id}
                          className={`cursor-pointer transition ${
                            selected ? "bg-teal-500/10" : "hover:bg-slate-900/60"
                          }`}
                          onClick={() => selectSchool(s.id)}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-200">{s.name}</td>
                          <td className="px-3 py-2.5 text-slate-500">{s.location || "—"}</td>
                          <td className="px-3 py-2.5">
                            {s.ai_school_id ? (
                              <Badge variant="success">linked</Badge>
                            ) : (
                              <Badge variant="default">not linked</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {!s.ai_school_id ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  leftIcon={
                                    busy === `link-${s.id}` ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Link2 className="h-3.5 w-3.5" />
                                    )
                                  }
                                  disabled={!!busy}
                                  onClick={() =>
                                    void run(`link-${s.id}`, async () => {
                                      setCrmSchoolId(s.id);
                                      const result = await schoolAiApi.ensureSchool({
                                        crmSchoolId: s.id,
                                      });
                                      setAiSchoolId(result.aiSchoolId);
                                      await loadSchools();
                                      toast.success("Linked to school-ai");
                                    })
                                  }
                                >
                                  Link
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                leftIcon={
                                  busy === `del-${s.id}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )
                                }
                                disabled={!!busy}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      `Delete "${s.name}" from the CRM? This cannot be undone.`,
                                    )
                                  ) {
                                    return;
                                  }
                                  void run(`del-${s.id}`, async () => {
                                    await schoolsApi.remove(s.id);
                                    if (crmSchoolId === s.id) {
                                      setCrmSchoolId("");
                                      setAiSchoolId("");
                                    }
                                    await loadSchools();
                                    toast.success("School deleted");
                                  });
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ── Data Sources ────────────────────────────────────────── */}
        <TabsContent value="sources" className="mt-4 space-y-4">
          {!crmSchoolId ? (
            <Panel title="Select a school first">
              <p className="text-xs text-slate-500">
                Choose a school from the Working school dropdown at the top of this page.
              </p>
            </Panel>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="Upload document" subtitle="PDF or DOCX admissions packet">
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    disabled={!!busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void run("upload", async () => {
                        const ai = await ensureAiSchool();
                        const result = await schoolAiApi.uploadDocument(ai, file);
                        toast.success("Document queued");
                        startPolling(result.job_id);
                        await loadSources(ai);
                      });
                      e.target.value = "";
                    }}
                    className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  />
                </Panel>

                <Panel
                  title="Discover trusted sources"
                  subtitle="Search official domain (+ ADEA) → deep-crawl seeds → fill taxonomy"
                >
                  <Button
                    type="button"
                    size="sm"
                    leftIcon={
                      busy === "discover" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )
                    }
                    disabled={!!busy}
                    onClick={() =>
                      void run("discover", async () => {
                        const ai = await ensureAiSchool();
                        const result = await schoolAiApi.discoverTrusted(ai);
                        toast.success("Trusted discovery queued (may take several minutes)");
                        startPolling(result.job_id);
                        await loadSources(ai);
                      })
                    }
                  >
                    Discover & extract
                  </Button>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Finds admissions / class-profile / requirements pages on the school&apos;s
                    site only — not blogs or ranking sites. Aims at all ~138 factors; fill the
                    rest manually when unpublished.
                  </p>
                  {coverage ? (
                    <p className="mt-2 text-xs text-teal-300">
                      Coverage: {coverage.filled}/{coverage.total} ({coverage.coverage_pct}%)
                    </p>
                  ) : null}
                </Panel>

                <Panel title="Crawl a URL" subtitle="Follows same-host subpages (admissions paths preferred)">
                  <FormField label="URL">
                    <Input
                      value={crawlUrl}
                      onChange={(e) => setCrawlUrl(e.target.value)}
                      placeholder="https://school.edu/admissions"
                      className="h-9"
                    />
                  </FormField>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={
                        busy === "crawl" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )
                      }
                      disabled={!crawlUrl.trim() || !!busy}
                      onClick={() =>
                        void run("crawl", async () => {
                          const ai = await ensureAiSchool();
                          const result = await schoolAiApi.crawlUrl(ai, crawlUrl.trim());
                          toast.success("Deep crawl queued");
                          setCrawlUrl("");
                          startPolling(result.job_id);
                          await loadSources(ai);
                        })
                      }
                    >
                      Crawl URL
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={
                        busy === "official" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )
                      }
                      disabled={!!busy}
                      onClick={() =>
                        void run("official", async () => {
                          const ai = await ensureAiSchool();
                          const result = await schoolAiApi.enqueueResearch(ai);
                          toast.success("Official site deep crawl queued");
                          startPolling(result.job_id);
                          await loadSources(ai);
                        })
                      }
                    >
                      Crawl official site
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Only this URL&apos;s site is crawled — no open-web extraction.
                  </p>
                </Panel>
              </div>

              {(lastJobId || jobStatus) && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">
                  {["pending", "running"].includes(jobStatus) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                  ) : null}
                  Last job{" "}
                  <code className="text-slate-300">{lastJobId.slice(0, 8) || "—"}…</code>
                  · <StatusPill status={jobStatus} />
                </div>
              )}

              <Panel
                title="Uploaded documents"
                subtitle={`${documents.length} document${documents.length === 1 ? "" : "s"}`}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={
                      sourcesLoading || busy === "sources" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )
                    }
                    disabled={!!busy || sourcesLoading}
                    onClick={() =>
                      void run("sources", async () => {
                        const ai = await ensureAiSchool();
                        await loadSources(ai);
                      })
                    }
                  >
                    Refresh
                  </Button>
                }
              >
                {sourcesLoading ? (
                  <p className="text-xs text-slate-500">Loading sources…</p>
                ) : documents.length === 0 ? (
                  <p className="text-xs text-slate-500">No documents uploaded yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">File</th>
                          <th className="px-3 py-2 font-medium">Size</th>
                          <th className="px-3 py-2 font-medium">Parse</th>
                          <th className="px-3 py-2 font-medium">Job</th>
                          <th className="px-3 py-2 font-medium">Added</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {documents.map((d) => (
                          <tr key={d.document_id} className="text-slate-300">
                            <td className="px-3 py-2 font-medium text-slate-200">{d.filename}</td>
                            <td className="px-3 py-2 text-slate-500">{formatBytes(d.byte_size)}</td>
                            <td className="px-3 py-2">
                              <StatusPill status={d.parsed_status} />
                            </td>
                            <td className="px-3 py-2">
                              <StatusPill status={d.job_status} />
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel
                title="Crawled / researched web links"
                subtitle={`${webSources.length} unique source URL${webSources.length === 1 ? "" : "s"} that produced facts`}
              >
                {webSources.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No crawled pages yet. Upload a PDF or crawl the official site / a specific URL.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                    {webSources.map((w) => (
                      <li
                        key={w.url}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 text-xs"
                      >
                        <a
                          href={w.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-teal-400 hover:underline"
                        >
                          {w.url}
                        </a>
                        <span className="shrink-0 text-slate-500">{w.fact_count} facts</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </TabsContent>

        {/* ── Rubric ──────────────────────────────────────────────── */}
        <TabsContent value="rubric" className="mt-4 space-y-4">
          {!crmSchoolId ? (
            <Panel title="Select a school first">
              <p className="text-xs text-slate-500">
                Choose a school from the Working school dropdown at the top, then feed data sources and review the rubric here.
              </p>
            </Panel>
          ) : (
            <>
              <Panel
                title="Rubric actions"
                subtitle="Generate from facts, approve for scoring, or refresh the CRM cache"
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={
                        busy === "facts" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={!!busy}
                      onClick={() =>
                        void run("facts", async () => {
                          await ensureAiSchool();
                          const { cache } = await schoolAiApi.refreshFactsCache(crmSchoolId);
                          setFactsCache(cache);
                          toast.success("Facts refreshed");
                        })
                      }
                    >
                      Refresh from AI
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={
                        busy === "generate" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={!!busy}
                      onClick={() =>
                        void run("generate", async () => {
                          const ai = await ensureAiSchool();
                          await schoolAiApi.generateRubric(ai);
                          const { cache } = await schoolAiApi.refreshFactsCache(crmSchoolId);
                          setFactsCache(cache);
                          toast.success("Rubric generated (draft)");
                        })
                      }
                    >
                      Generate rubric
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={
                        busy === "approve" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={!!busy}
                      onClick={() =>
                        void run("approve", async () => {
                          const ai = await ensureAiSchool();
                          await schoolAiApi.approveRubric(ai);
                          const { cache } = await schoolAiApi.refreshFactsCache(crmSchoolId);
                          setFactsCache(cache);
                          toast.success("Rubric approved");
                        })
                      }
                    >
                      Approve
                    </Button>
                  </div>
                }
              >
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge variant="default">{rawFacts.length} raw facts</Badge>
                  <Badge variant="default">{rubricFactors.length} rubric factors</Badge>
                  {coverage ? (
                    <Badge variant="success">
                      Coverage {coverage.filled}/{coverage.total} ({coverage.coverage_pct}%)
                    </Badge>
                  ) : null}
                  <Badge variant="default">
                    {
                      new Set(
                        rubricFactors.map((f) => f.category).filter(Boolean),
                      ).size
                    }{" "}
                    categories
                  </Badge>
                  {factsCache?.rubric_status ? (
                    <Badge variant={factsCache.rubric_status === "approved" ? "success" : "default"}>
                      {factsCache.rubric_status}
                    </Badge>
                  ) : null}
                  {factsCache?.refreshed_at ? (
                    <span>cached {new Date(factsCache.refreshed_at).toLocaleString()}</span>
                  ) : null}
                </div>
              </Panel>

              {factsLoading ? (
                <p className="text-xs text-slate-500">Loading cached facts…</p>
              ) : !factsCache ? (
                <Panel title="No cached facts yet">
                  <p className="text-xs text-slate-500">
                    Feed data sources first, then click Refresh from AI (or Generate rubric).
                  </p>
                </Panel>
              ) : (
                <>
                  <Panel
                    title="Raw extracted facts"
                    subtitle="Hoped-to-extract shows what we look for. Edit when a PDF/crawl is missing or wrong."
                  >
                    {rawFacts.length === 0 ? (
                      <p className="text-xs text-slate-500">No raw facts extracted yet.</p>
                    ) : (
                      <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-950/90 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 font-medium">Factor</th>
                              <th className="px-3 py-2 font-medium">Hoped to extract</th>
                              <th className="px-3 py-2 font-medium">Value</th>
                              <th className="px-3 py-2 font-medium">Source</th>
                              <th className="px-3 py-2 font-medium">Conf.</th>
                              <th className="px-3 py-2 font-medium">Edit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {rawFacts.map((f, i) => (
                              <tr key={`${f.factor_key}-${i}`} className="text-slate-300">
                                <td className="px-3 py-1.5 font-medium text-slate-200">{f.factor_key}</td>
                                <td className="max-w-[14rem] px-3 py-1.5 text-slate-500">
                                  {f.hoped_to_extract || f.description || "—"}
                                </td>
                                <td className="px-3 py-1.5">{factValue(f)}</td>
                                <td className="px-3 py-1.5 text-slate-500">
                                  {f.source_url ? (
                                    <a
                                      href={f.source_url.startsWith("http") ? f.source_url : undefined}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={
                                        f.source_url.startsWith("http")
                                          ? "text-teal-400 hover:underline"
                                          : undefined
                                      }
                                    >
                                      {f.source_type || "web"}
                                    </a>
                                  ) : (
                                    f.source_type || "—"
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-slate-500">
                                  {f.confidence != null
                                    ? Math.round(Number(f.confidence) * 100) / 100
                                    : "—"}
                                </td>
                                <td className="px-3 py-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    disabled={!!busy}
                                    leftIcon={<Pencil className="h-3 w-3" />}
                                    onClick={() =>
                                      void run(`edit-fact-${f.factor_key}`, async () => {
                                        const next = window.prompt(
                                          `Set value for ${f.factor_key}\n(${f.hoped_to_extract || f.description || ""})`,
                                          f.value == null || f.value === "" ? "" : String(f.value),
                                        );
                                        if (next == null) return;
                                        const reason =
                                          window.prompt("Reason for this correction", "Admin correction") ||
                                          "Admin correction";
                                        const ai = await ensureAiSchool();
                                        await schoolAiApi.upsertManualFact(ai, f.factor_key, {
                                          value: next.trim() === "" ? null : parseEditValue(next),
                                          unit: f.unit,
                                          reason,
                                        });
                                        const { cache } = await schoolAiApi.refreshFactsCache(crmSchoolId);
                                        setFactsCache(cache);
                                        toast.success(`Updated ${f.factor_key}`);
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>

                  <Panel
                    title="Rubric factors"
                    subtitle="Hoped-to-extract is the taxonomy target. Edit value when evidence is missing or wrong."
                  >
                    {rubricFactors.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No rubric yet — click Generate rubric after facts are available.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Array.from(
                          rubricFactors.reduce((map, factor) => {
                            const cat = factor.category || "Other";
                            const list = map.get(cat) || [];
                            list.push(factor);
                            map.set(cat, list);
                            return map;
                          }, new Map<string, SchoolAiRubricFactor[]>()),
                        ).map(([category, factors]) => {
                          const filled = factors.filter(
                            (f) => f.weight_source && f.weight_source !== "pending_evidence",
                          ).length;
                          return (
                            <div key={category}>
                              <div className="mb-2 flex items-baseline justify-between gap-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  {category}
                                </h4>
                                <span className="text-[10px] text-slate-600">
                                  {filled}/{factors.length} with evidence
                                </span>
                              </div>
                              <div className="overflow-x-auto rounded-lg border border-slate-800">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-950/80 text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Factor</th>
                                      <th className="px-3 py-2 font-medium">Hoped to extract</th>
                                      <th className="px-3 py-2 font-medium">Value</th>
                                      <th className="px-3 py-2 font-medium">Weight</th>
                                      <th className="px-3 py-2 font-medium">Edit</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {factors.map((factor, i) => {
                                      const pending = factor.weight_source === "pending_evidence";
                                      const displayValue =
                                        factor.value == null || factor.value === ""
                                          ? "—"
                                          : typeof factor.value === "object"
                                            ? JSON.stringify(factor.value)
                                            : String(factor.value);
                                      return (
                                        <tr
                                          key={`${factor.factor_key}-${i}`}
                                          className={pending ? "text-slate-500" : "text-slate-300"}
                                        >
                                          <td className="px-3 py-1.5 font-medium text-slate-200">
                                            {factor.factor_key}
                                          </td>
                                          <td className="max-w-[14rem] px-3 py-1.5 text-slate-500">
                                            {factor.description || "—"}
                                          </td>
                                          <td className="px-3 py-1.5">{displayValue}</td>
                                          <td className="px-3 py-1.5">
                                            {pending
                                              ? "pending"
                                              : factor.weight != null
                                                ? Math.round(Number(factor.weight) * 100) / 100
                                                : "—"}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2"
                                              disabled={!!busy}
                                              leftIcon={<Pencil className="h-3 w-3" />}
                                              onClick={() =>
                                                void run(`edit-rubric-${factor.factor_key}`, async () => {
                                                  const next = window.prompt(
                                                    `Set rubric value for ${factor.factor_key}\n(${factor.description || ""})`,
                                                    displayValue === "—" ? "" : displayValue,
                                                  );
                                                  if (next == null) return;
                                                  const reason =
                                                    window.prompt(
                                                      "Reason for this correction",
                                                      "Admin correction",
                                                    ) || "Admin correction";
                                                  const ai = await ensureAiSchool();
                                                  await schoolAiApi.overrideRubricFactor(ai, factor.factor_key, {
                                                    value:
                                                      next.trim() === "" ? null : parseEditValue(next),
                                                    weight:
                                                      factor.weight != null
                                                        ? Number(factor.weight)
                                                        : undefined,
                                                    confidence: 1,
                                                    reasoning: reason,
                                                    reason,
                                                  });
                                                  const { cache } =
                                                    await schoolAiApi.refreshFactsCache(crmSchoolId);
                                                  setFactsCache(cache);
                                                  toast.success(`Updated rubric ${factor.factor_key}`);
                                                })
                                              }
                                            >
                                              Edit
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Compare ─────────────────────────────────────────────── */}
        <TabsContent value="compare" className="mt-4 space-y-4">
          <Panel
            title="Compare student vs school"
            subtitle="Every rubric factor is scored. Missing student evidence counts as not met (0). Outcome % are fit-derived estimates, not calibrated admissions odds."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <FormField label="Student" className="w-full max-w-md">
                <SelectMenu
                  value={studentId}
                  onChange={setStudentId}
                  options={studentOptions}
                  placeholder={
                    studentsLoading
                      ? "Loading…"
                      : studentOptions.length === 0
                        ? "No students found"
                        : "Select student…"
                  }
                  className="w-full"
                  disabled={studentsLoading || !!busy}
                />
              </FormField>
              <Button
                type="button"
                disabled={!crmSchoolId || !studentId || !!busy}
                leftIcon={
                  busy === "score" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )
                }
                onClick={() =>
                  void run("score", async () => {
                    const { score, persisted } = await schoolAiApi.refreshScore(
                      crmSchoolId,
                      studentId,
                    );
                    const withName: SchoolAiScoreRow = {
                      ...score,
                      schools: score.schools ?? {
                        id: crmSchoolId,
                        name: selectedSchool?.name || crmSchoolId,
                      },
                    };
                    if (persisted) {
                      await loadScores(studentId);
                    }
                    setScores((prev) => {
                      const rest = prev.filter((s) => s.school_id !== withName.school_id);
                      return [withName, ...rest];
                    });
                    if (!persisted) {
                      toast.warning(
                        "Score computed but not saved to DB — apply migrations 060/061, then re-score.",
                      );
                    } else {
                      toast.success(`Fit score ${Math.round(Number(score.score))}/100`);
                    }
                  })
                }
              >
                Score selected school
              </Button>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              {!crmSchoolId ? (
                <p className="text-amber-400/80">Select a school from the Working school dropdown above.</p>
              ) : (
                <p className="text-slate-400">
                  School:{" "}
                  <span className="font-medium text-teal-300">
                    {selectedSchool?.name || crmSchoolId}
                  </span>
                  {factsCache?.rubric_status ? (
                    <span className="text-slate-500">
                      {" "}
                      · rubric {factsCache.rubric_status}
                    </span>
                  ) : null}
                </p>
              )}
              {!studentId ? (
                <p className="text-amber-400/80">Select a student to see the factor table.</p>
              ) : null}
              {studentOptions.length === 0 && !studentsLoading ? (
                <p className="text-amber-400/80">
                  No CRM students available. Add a student user first.
                </p>
              ) : null}
            </div>
          </Panel>

          {crmSchoolId && studentId && !scoredForSelectedSchool ? (
            <Panel
              title="Factor preview"
              subtitle={
                rubricFactors.length
                  ? "Live school rubric vs this student’s profile — click Score to compute fit % and save"
                  : "No cached rubric yet — open Rubric tab, Generate, then Approve"
              }
            >
              <FactorCompareTable factors={previewFactors} />
            </Panel>
          ) : null}

          {studentId ? (
            <Panel
              title="Saved comparisons"
              subtitle="Latest fit scores + outcome probability estimates for this student"
            >
              {scoresLoading ? (
                <p className="text-xs text-slate-500">Loading saved comparisons…</p>
              ) : scores.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No saved scores yet. With a school selected above, click{" "}
                  <span className="text-slate-300">Score selected school</span>.
                </p>
              ) : (
                <div className="space-y-3">
                  {scores.map((s) => {
                    const factors = normalizeFactorBreakdown(s.per_factor_breakdown);
                    const notMet = factors.filter((f) =>
                      String(f.method || "").startsWith("not_met_"),
                    ).length;
                    const factorCount = factors.length;
                    const probs = [
                      { label: "Interview", value: s.interview_probability, tone: "text-sky-400" },
                      { label: "Acceptance", value: s.acceptance_probability, tone: "text-emerald-400" },
                      { label: "Waitlist", value: s.waitlist_probability, tone: "text-amber-300" },
                      { label: "Reject", value: s.reject_probability, tone: "text-red-400" },
                    ];
                    return (
                      <div
                        key={s.id || s.school_id}
                        className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {s.schools?.name || s.school_id}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {s.updated_at
                                ? `updated ${new Date(s.updated_at).toLocaleString()}`
                                : null}
                              {factorCount > 0
                                ? ` · ${factorCount} factors${notMet ? `, ${notMet} not met` : ""}`
                                : null}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-emerald-400">
                              {s.score != null ? `${Math.round(Number(s.score))}/100` : "—"}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={
                                busy === `refresh-${s.school_id}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )
                              }
                              disabled={!!busy}
                              onClick={() =>
                                void run(`refresh-${s.school_id}`, async () => {
                                  const { score, persisted } = await schoolAiApi.refreshScore(
                                    s.school_id,
                                    studentId,
                                  );
                                  const withName: SchoolAiScoreRow = {
                                    ...score,
                                    schools: score.schools ?? s.schools ?? {
                                      id: s.school_id,
                                      name: selectedSchool?.name || s.school_id,
                                    },
                                  };
                                  if (persisted) await loadScores(studentId);
                                  setScores((prev) => {
                                    const rest = prev.filter(
                                      (row) => row.school_id !== withName.school_id,
                                    );
                                    return [withName, ...rest];
                                  });
                                  toast.success(
                                    persisted
                                      ? "Comparison refreshed"
                                      : "Refreshed locally (DB persist failed)",
                                  );
                                })
                              }
                            >
                              Refresh
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {probs.map((p) => (
                            <div
                              key={p.label}
                              className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-2"
                            >
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                {p.label}
                              </p>
                              <p className={`mt-0.5 text-sm font-semibold ${p.tone}`}>
                                {p.value != null ? `${Math.round(Number(p.value))}%` : "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                        {s.probability_kind ? (
                          <p className="mt-2 text-[10px] text-slate-600">
                            Estimates: {s.probability_kind} (from fit score — not calibrated odds)
                          </p>
                        ) : null}

                        <div className="mt-4 grid gap-3 lg:grid-cols-5">
                          <div className="lg:col-span-3">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Factor comparison
                            </h4>
                            <FactorCompareTable factors={factors} />
                          </div>

                          <div className="lg:col-span-2">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              AI explanation
                            </h4>
                            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                              {s.reasoning ? (
                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
                                  {s.reasoning}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  No explanation yet. Refresh to generate one.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
