import { apiGet, apiPost, apiPatch } from "./client";

export type SchoolAiSelectionDraft = {
  snapshot: string;
  overallScore: number;
  improvementLeverageScore: number;
  kpis: {
    academics: "Strong" | "Moderate" | "Developing" | "Weak";
    experienceDepth: "Strong" | "Moderate" | "Developing" | "Weak";
    leadership: "Strong" | "Moderate" | "Developing" | "Weak";
    shadowing: "Strong" | "Moderate" | "Developing" | "Weak";
  };
  strengths: string[];
  gaps: string[];
  roadmap: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
    phase4: string[];
  };
  leverageActions: Array<{ title: string; description: string; impact: string }>;
  riskFactors: Array<{
    factor: string;
    severity: string;
    description: string;
    mitigation: string;
  }>;
};

export type SchoolAiRawFact = {
  factor_key: string;
  value: number | string | null;
  unit: string | null;
  source_type?: string | null;
  source_url?: string | null;
  confidence?: number | null;
  section?: string | null;
  raw_text_snippet?: string | null;
  description?: string | null;
  hoped_to_extract?: string | null;
  category?: string | null;
};

export type SchoolAiRubricFactor = {
  factor_key: string;
  category?: string | null;
  description?: string | null;
  scoring_eligible?: boolean;
  weight?: number;
  weight_source?: string;
  tier?: string;
  value?: unknown;
  confidence?: number;
  reasoning?: string;
};

export type SchoolAiFactsCache = {
  school_id: string;
  ai_school_id: string | null;
  raw_facts: SchoolAiRawFact[];
  rubric: { rubric_status?: string; factors?: SchoolAiRubricFactor[] } | null;
  fact_count: number;
  rubric_status: string | null;
  refreshed_at: string;
};

export type SchoolAiFactorBreakdown = {
  factor_key: string;
  category?: string;
  weight?: number;
  student_value?: number | string | null;
  school_expectation?: number | string | null;
  factor_score?: number;
  contribution?: number;
  method?: string;
};

export type SchoolAiScoreRow = {
  id?: string;
  school_id: string;
  student_id: string;
  ai_school_id: string | null;
  score: number | null;
  score_kind?: string | null;
  reasoning?: string | null;
  per_factor_breakdown?: SchoolAiFactorBreakdown[] | { factors?: SchoolAiFactorBreakdown[] };
  skipped?: unknown[];
  attributes_used?: Record<string, unknown>;
  interview_probability?: number | null;
  acceptance_probability?: number | null;
  waitlist_probability?: number | null;
  reject_probability?: number | null;
  probability_kind?: string | null;
  updated_at?: string;
  schools?: { id: string; name: string } | null;
};

export type SchoolAiDocumentSource = {
  document_id: string;
  filename: string;
  source_type: string;
  source_url?: string | null;
  parsed_status: string;
  byte_size?: number | null;
  created_at?: string | null;
  job_id?: string | null;
  job_status?: string | null;
};

export type SchoolAiWebSource = {
  url: string;
  fact_count: number;
  last_seen_at?: string | null;
};

export type SchoolAiSelectionPlanResponse = {
  studentId: string;
  attributesUsed: Record<string, unknown>;
  scores: Array<{
    crmSchoolId: string;
    name: string;
    category: string;
    aiSchoolId: string | null;
    score: number | null;
    reasoning?: string;
    error?: string;
  }>;
  scoredCount: number;
  draft: SchoolAiSelectionDraft;
};

/** Browser → Node `/api/school-ai/*` only. Never call Python directly. */
export const schoolAiApi = {
  health: () => apiGet<{ status: string }>("/api/school-ai/health"),

  ensureSchool: (body: { crmSchoolId?: string; name?: string; officialUrl?: string }) =>
    apiPost<{ crmSchoolId: string; name: string; aiSchoolId: string; created: boolean }>(
      "/api/school-ai/ensure-school",
      body,
    ),

  getJob: (jobId: string) =>
    apiGet<{ job_id: string; status: string; error?: unknown }>(`/api/school-ai/jobs/${jobId}`),

  listFailedJobs: (limit = 50) =>
    apiGet<{ jobs: unknown[]; count: number }>(`/api/school-ai/jobs?status=failed&limit=${limit}`),

  generateRubric: (aiSchoolId: string) =>
    apiPost(`/api/school-ai/schools/${aiSchoolId}/rubric/generate`, {}),

  getRubric: (aiSchoolId: string) =>
    apiGet(`/api/school-ai/schools/${aiSchoolId}/rubric`),

  approveRubric: (aiSchoolId: string, editor?: string) =>
    apiPost(`/api/school-ai/schools/${aiSchoolId}/rubric/approve`, { editor }),

  enqueueResearch: (aiSchoolId: string, forceRefresh = false) =>
    apiPost<{ job_id: string; status: string; cached: boolean }>(
      `/api/school-ai/schools/${aiSchoolId}/research${forceRefresh ? "?force_refresh=true" : ""}`,
      {},
    ),

  discoverTrusted: (aiSchoolId: string, forceRefresh = false) =>
    apiPost<{ job_id: string; status: string; cached: boolean }>(
      `/api/school-ai/schools/${aiSchoolId}/discover-trusted${forceRefresh ? "?force_refresh=true" : ""}`,
      {},
    ),

  getCoverage: (aiSchoolId: string) =>
    apiGet<{
      school_id: string;
      filled: number;
      total: number;
      coverage_pct: number;
      by_category: Record<string, { total: number; filled: number }>;
      taxonomy_version: string;
    }>(`/api/school-ai/schools/${aiSchoolId}/coverage`),

  crawlUrl: (aiSchoolId: string, url: string, forceRefresh = false) =>
    apiPost<{ job_id: string; status: string; cached: boolean }>(
      `/api/school-ai/schools/${aiSchoolId}/crawl-url${forceRefresh ? "?force_refresh=true" : ""}`,
      { url },
    ),

  upsertManualFact: (
    aiSchoolId: string,
    factorKey: string,
    payload: { value?: unknown; unit?: string | null; reason: string; editor?: string; confidence?: number },
  ) =>
    apiPatch(`/api/school-ai/schools/${aiSchoolId}/facts/${encodeURIComponent(factorKey)}`, payload),

  overrideRubricFactor: (
    aiSchoolId: string,
    factorKey: string,
    payload: {
      value?: unknown;
      weight?: number;
      confidence?: number;
      reasoning: string;
      reason?: string;
      editor?: string;
    },
  ) =>
    apiPatch(`/api/school-ai/schools/${aiSchoolId}/rubric/${encodeURIComponent(factorKey)}`, payload),

  listSources: (aiSchoolId: string) =>
    apiGet<{
      school_id: string;
      documents: SchoolAiDocumentSource[];
      web_sources: SchoolAiWebSource[];
      document_count: number;
      web_source_count: number;
    }>(`/api/school-ai/schools/${aiSchoolId}/sources`),

  // Cached facts + rubric snapshot (read straight from CRM Supabase).
  getFactsCache: (crmSchoolId: string) =>
    apiGet<{ cache: SchoolAiFactsCache | null }>(`/api/school-ai/schools/${crmSchoolId}/facts-cache`),

  refreshFactsCache: (crmSchoolId: string, officialUrl?: string) =>
    apiPost<{ cache: SchoolAiFactsCache; persisted: boolean }>(
      `/api/school-ai/schools/${crmSchoolId}/facts-refresh`,
      { officialUrl },
    ),

  // Persisted student ↔ school comparisons.
  getStudentScores: (studentId: string) =>
    apiGet<{ scores: SchoolAiScoreRow[] }>(`/api/school-ai/students/${studentId}/scores`),

  refreshScore: (crmSchoolId: string, studentId: string) =>
    apiPost<{ score: SchoolAiScoreRow; persisted: boolean }>(
      `/api/school-ai/schools/${crmSchoolId}/score-refresh`,
      { studentId },
    ),

  scoreSchool: (aiSchoolId: string, studentId: string, attributes?: Record<string, unknown>) =>
    apiPost(`/api/school-ai/schools/${aiSchoolId}/score`, { studentId, attributes }),

  /** Scores the student's school board via approved Python rubrics → plan draft fields. */
  generateSelectionPlan: (studentId: string, options?: { schoolIds?: string[]; autoLink?: boolean }) =>
    apiPost<SchoolAiSelectionPlanResponse>("/api/school-ai/selection-plan", {
      studentId,
      schoolIds: options?.schoolIds,
      autoLink: options?.autoLink ?? true,
    }),

  uploadDocument: (aiSchoolId: string, file: File, forceRefresh = false) => {
    const form = new FormData();
    form.append("file", file);
    const q = forceRefresh ? "?force_refresh=true" : "";
    return apiPost<{ document_id: string; job_id: string; status: string }>(
      `/api/school-ai/schools/${aiSchoolId}/documents${q}`,
      form,
    );
  },
};
