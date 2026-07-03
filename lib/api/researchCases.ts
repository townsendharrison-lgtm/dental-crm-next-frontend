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
    return response.cases || [];
  },

  /**
   * Create a new research case reference profile (Admin only).
   */
  create: async (payload: CreateResearchCasePayload): Promise<ResearchCase> => {
    return await apiPost<ResearchCase>("/api/research-cases", payload);
  },

  /**
   * Update details of a research case (Admin only).
   */
  update: async (id: string, updates: Partial<CreateResearchCasePayload>): Promise<ResearchCase> => {
    return await apiPut<ResearchCase>(`/api/research-cases/${id}`, updates);
  },

  /**
   * Delete a research case (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/research-cases/${id}`);
  },
};
