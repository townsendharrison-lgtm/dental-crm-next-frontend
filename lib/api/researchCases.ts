import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { ResearchCase } from "@/lib/types";

export interface ResearchCasesFilters {
  minGpa?: number;
  maxGpa?: number;
  minDat?: number;
  school?: string;
  cycle?: string;
}

export interface CreateResearchCasePayload {
  studentNameAnonymized: string;
  gpa: number;
  datAa: number;
  datTs: number;
  major?: string;
  undergradInstitution?: string;
  shadowingHours?: number;
  volunteeringHours?: number;
  researchHours?: number;
  acceptedSchools?: string[];
  rejectedSchools?: string[];
  matriculatedSchool?: string;
  cycle: string;
  specialCircumstances?: string;
}

/** Flatten snake_case API rows into the camelCase fields the admin UI expects. */
export function normalizeResearchCase(c: ResearchCase): ResearchCase {
  const accepted = c.acceptedSchoolIds ?? c.accepted_schools ?? [];
  const rejected = c.rejected_schools ?? [];
  return {
    ...c,
    studentName: c.studentName ?? c.student_name_anonymized,
    datAA: c.datAA ?? c.dat_aa,
    datTS: c.datTS ?? c.dat_ts,
    totalShadowingHours: c.totalShadowingHours ?? c.shadowing_hours ?? 0,
    totalVolunteeringHours: c.totalVolunteeringHours ?? c.volunteering_hours ?? 0,
    researchExperience: c.researchExperience ?? c.research_hours ?? 0,
    personalStatementThemes:
      c.personalStatementThemes ?? c.personal_statement_themes ?? [],
    acceptedSchoolIds: Array.isArray(accepted) ? accepted : [],
    accepted_schools: Array.isArray(accepted) ? accepted : [],
    rejected_schools: Array.isArray(rejected) ? rejected : [],
    applicationUrl: c.applicationUrl ?? c.application_url ?? null,
    createdAt: c.createdAt ?? c.created_at,
  };
}

export const researchCasesApi = {
  /**
   * Fetch historical research cases matching given query criteria.
   */
  list: async (filters: ResearchCasesFilters = {}): Promise<ResearchCase[]> => {
    const params = new URLSearchParams();
    if (filters.minGpa !== undefined) params.append("minGpa", filters.minGpa.toString());
    if (filters.maxGpa !== undefined) params.append("maxGpa", filters.maxGpa.toString());
    if (filters.minDat !== undefined) params.append("minDat", filters.minDat.toString());
    if (filters.school) params.append("school", filters.school);
    if (filters.cycle) params.append("cycle", filters.cycle);

    const queryStr = params.toString();
    const endpoint = `/api/research-cases${queryStr ? `?${queryStr}` : ""}`;

    const response = await apiGet<{ cases: ResearchCase[] }>(endpoint);
    return (response.cases || []).map(normalizeResearchCase);
  },

  /**
   * Create a new research case reference profile (Admin only).
   */
  create: async (payload: CreateResearchCasePayload): Promise<ResearchCase> => {
    const created = await apiPost<ResearchCase>("/api/research-cases", payload);
    return normalizeResearchCase(created);
  },

  /**
   * Update details of a research case (Admin only).
   */
  update: async (
    id: string,
    updates: Partial<CreateResearchCasePayload>,
  ): Promise<ResearchCase> => {
    const updated = await apiPut<ResearchCase>(`/api/research-cases/${id}`, updates);
    return normalizeResearchCase(updated);
  },

  /**
   * Delete a research case (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/research-cases/${id}`);
  },
};
