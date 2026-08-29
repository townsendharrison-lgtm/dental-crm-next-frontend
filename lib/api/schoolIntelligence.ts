import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SchoolEvidence,
  SchoolScoringRubric,
  HistoricalApplication,
  PredictionResult,
  StudentProfileForPrediction,
} from "@/lib/types";

export interface CrawlResponse {
  schoolId: string;
  schoolName: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  extractedRubric: any;
  evidenceList: any[];
}

export const schoolIntelligenceApi = {
  /** Crawl and extract admissions criteria from a dental school URL */
  crawl: async (payload: {
    url: string;
    schoolName?: string;
    schoolId?: string;
  }): Promise<CrawlResponse> => {
    return await apiPost<CrawlResponse>("/api/school-intelligence/crawl", payload);
  },

  /** Upload and ingest PDF, TXT, or Image (PNG/JPG) using Gemini Multimodal Vision */
  ingestFile: async (
    file: File,
    meta?: { schoolName?: string; schoolId?: string }
  ): Promise<CrawlResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (meta?.schoolName) formData.append("schoolName", meta.schoolName);
    if (meta?.schoolId) formData.append("schoolId", meta.schoolId);

    // Call backend endpoint with multipart/form-data
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/school-intelligence/ingest-file`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "File upload failed" }));
      throw new Error(err.error || `Upload failed with HTTP ${res.status}`);
    }

    return await res.json();
  },

  /** Ingest manual text or interview notes */
  ingestText: async (payload: {
    text: string;
    schoolName?: string;
    schoolId?: string;
    sourceName?: string;
  }): Promise<CrawlResponse> => {
    return await apiPost<CrawlResponse>("/api/school-intelligence/ingest-text", payload);
  },

  /** Fetch evidence citations for a school */
  getEvidence: async (schoolId: string): Promise<SchoolEvidence[]> => {
    const res = await apiGet<{ evidence: SchoolEvidence[] }>(
      `/api/school-intelligence/evidence/${schoolId}`
    );
    return res.evidence || [];
  },

  /** Verify or unverify an evidence citation snippet */
  verifyEvidence: async (
    id: string,
    payload: { isVerified: boolean; notes?: string }
  ): Promise<SchoolEvidence> => {
    return await apiPut<SchoolEvidence>(
      `/api/school-intelligence/evidence/${id}/verify`,
      payload
    );
  },

  /** Delete an evidence item */
  deleteEvidence: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(
      `/api/school-intelligence/evidence/${id}`
    );
  },

  /** Fetch school scoring rubric */
  getRubric: async (schoolId: string): Promise<SchoolScoringRubric | null> => {
    return await apiGet<SchoolScoringRubric | null>(
      `/api/school-intelligence/rubrics/${schoolId}`
    );
  },

  /** Update school scoring rubric */
  updateRubric: async (
    schoolId: string,
    updates: Partial<SchoolScoringRubric>
  ): Promise<SchoolScoringRubric> => {
    return await apiPut<SchoolScoringRubric>(
      `/api/school-intelligence/rubrics/${schoolId}`,
      updates
    );
  },

  /** Fetch historical applicant outcomes dataset */
  getHistoricalApplications: async (filters?: {
    schoolId?: string;
    cycle?: string;
    outcome?: string;
  }): Promise<HistoricalApplication[]> => {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append("schoolId", filters.schoolId);
    if (filters?.cycle) params.append("cycle", filters.cycle);
    if (filters?.outcome) params.append("outcome", filters.outcome);

    const qs = params.toString();
    const endpoint = `/api/school-intelligence/historical-applications${qs ? `?${qs}` : ""}`;
    const res = await apiGet<{ applications: HistoricalApplication[] }>(endpoint);
    return res.applications || [];
  },

  /** Sync CRM students and application outcomes to historical dataset */
  syncCrmHistorical: async (): Promise<{ syncedCount: number; errors: string[] }> => {
    return await apiPost<{ syncedCount: number; errors: string[] }>(
      "/api/school-intelligence/historical-applications/sync",
      {}
    );
  },

  /** Batch upload historical applicant cases (from CSV/JSON) */
  uploadHistorical: async (
    items: Partial<HistoricalApplication>[]
  ): Promise<{ insertedCount: number; errors: string[] }> => {
    return await apiPost<{ insertedCount: number; errors: string[] }>(
      "/api/school-intelligence/historical-applications/upload",
      { items }
    );
  },

  /** Calibrate rubrics and weights based on historical applications */
  calibrateRubrics: async (
    schoolId?: string
  ): Promise<{ calibratedSchoolsCount: number; calibratedRubrics: any[] }> => {
    return await apiPost<{ calibratedSchoolsCount: number; calibratedRubrics: any[] }>(
      "/api/school-intelligence/calibrate",
      { schoolId }
    );
  },

  /** Run predictive model for a student or simulator inputs */
  predict: async (
    studentProfile: StudentProfileForPrediction,
    schoolId?: string
  ): Promise<PredictionResult[]> => {
    const res = await apiPost<{ predictions: PredictionResult[] }>(
      "/api/school-intelligence/predict",
      { studentProfile, schoolId }
    );
    return res.predictions || [];
  },

  /** Get student fit across all schools */
  getStudentFit: async (
    studentId: string
  ): Promise<{
    student: StudentProfileForPrediction;
    predictions: PredictionResult[];
  }> => {
    return await apiGet<{
      student: StudentProfileForPrediction;
      predictions: PredictionResult[];
    }>(`/api/school-intelligence/student-fit/${studentId}`);
  },
};

// ─── React Query Hooks ──────────────────────────────────────────────

export function useStudentFit(studentId?: string) {
  return useQuery({
    queryKey: ["student-fit", studentId],
    queryFn: () => (studentId ? schoolIntelligenceApi.getStudentFit(studentId) : null),
    enabled: Boolean(studentId),
  });
}

export function useSchoolEvidence(schoolId?: string) {
  return useQuery({
    queryKey: ["school-evidence", schoolId],
    queryFn: () => (schoolId ? schoolIntelligenceApi.getEvidence(schoolId) : []),
    enabled: Boolean(schoolId),
  });
}

export function useSchoolRubric(schoolId?: string) {
  return useQuery({
    queryKey: ["school-rubric", schoolId],
    queryFn: () => (schoolId ? schoolIntelligenceApi.getRubric(schoolId) : null),
    enabled: Boolean(schoolId),
  });
}

export function useHistoricalApplications(filters?: {
  schoolId?: string;
  cycle?: string;
  outcome?: string;
}) {
  return useQuery({
    queryKey: ["historical-applications", filters],
    queryFn: () => schoolIntelligenceApi.getHistoricalApplications(filters),
  });
}
