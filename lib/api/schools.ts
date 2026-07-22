import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { School } from "@/lib/types";

export interface CreateSchoolPayload {
  name: string;
  location: string;
  strengthScoreAvg?: number;
  datAvg?: number;
  avgGpa?: number;
  acceptanceRate?: number;
  isAcceptanceRate?: number;
  oosAcceptanceRate?: number;
  ccCredits?: boolean;
  tuition?: string;
  notes?: string;
  inStateEnrollment?: number;
  outOfStateEnrollment?: number;
  maleEnrollment?: number;
  femaleEnrollment?: number;
  ethnicity?: Record<string, number>;
  minDat5th?: number;
  minCgpa5th?: number;
}

export type EnsureSchoolPayload = Partial<CreateSchoolPayload> & {
  name: string;
  location?: string;
};

export const schoolsApi = {
  /**
   * Fetch all dental schools. Supports search by name or location query.
   */
  list: async (search?: string): Promise<School[]> => {
    const endpoint = `/api/schools${search ? `?search=${encodeURIComponent(search)}` : ""}`;
    const response = await apiGet<{ schools: School[] }>(endpoint);
    return response.schools || [];
  },

  /**
   * Fetch single school details by ID.
   */
  get: async (id: string): Promise<School> => {
    return await apiGet<School>(`/api/schools/${id}`);
  },

  /**
   * Find school by name or create it (any authenticated user).
   */
  ensure: async (payload: EnsureSchoolPayload): Promise<School> => {
    return await apiPost<School>("/api/schools/ensure", payload);
  },

  /**
   * Create a new school profile (Admin only).
   */
  create: async (payload: CreateSchoolPayload): Promise<School> => {
    return await apiPost<School>("/api/schools", payload);
  },

  /**
   * Update school profile stats (Admin only).
   */
  update: async (id: string, updates: Partial<CreateSchoolPayload>): Promise<School> => {
    return await apiPut<School>(`/api/schools/${id}`, updates);
  },

  /**
   * Remove a school profile (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/schools/${id}`);
  },
};
