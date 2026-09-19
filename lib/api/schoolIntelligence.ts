import { apiGet, apiPost, apiPut } from "./client";
import { useQuery } from "@tanstack/react-query";
import type {
  SchoolEvidence,
  SchoolScoringRubric,
  HistoricalApplication,
  PredictionResult,
  StudentProfileForPrediction,
} from "@/lib/types";

export const schoolIntelligenceApi = {

  /** Fetch evidence citations for a school */
  getEvidence: async (schoolId: string): Promise<SchoolEvidence[]> => {
    const res = await apiGet<{ evidence: SchoolEvidence[] }>(
      `/api/school-intelligence/evidence/${schoolId}`
    );
    return res.evidence || [];
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
