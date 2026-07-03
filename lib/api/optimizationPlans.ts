import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { OptimizationPlan, KPIAssessment, RoadmapPhases, RiskFactor, LeverageAction } from "@/lib/types";

export interface UpsertPlanPayload {
  studentId: string;
  snapshot: string;
  overallScore?: number;
  improvementLeverageScore?: number;
  kpis?: KPIAssessment;
  roadmap?: RoadmapPhases;
  riskFactors?: RiskFactor[];
  leverageActions?: LeverageAction[];
  strengths?: string[];
  gaps?: string[];
}

export const optimizationPlansApi = {
  /**
   * Fetch a student's profile optimization plan.
   * If called by a Student, they get their own.
   * If called by staff, a studentId must be supplied.
   */
  get: async (studentId?: string): Promise<OptimizationPlan> => {
    const endpoint = `/api/optimization-plans${studentId ? `?studentId=${studentId}` : ""}`;
    return await apiGet<OptimizationPlan>(endpoint);
  },

  /**
   * Create or overwrite (upsert) a student's optimization plan (Admins and Mentors only).
   */
  upsert: async (payload: UpsertPlanPayload): Promise<OptimizationPlan> => {
    return await apiPost<OptimizationPlan>("/api/optimization-plans", payload);
  },

  /**
   * Update details of an optimization plan (Admins and Mentors only).
   */
  update: async (id: string, updates: Partial<UpsertPlanPayload>): Promise<OptimizationPlan> => {
    return await apiPut<OptimizationPlan>(`/api/optimization-plans/${id}`, updates);
  },

  /**
   * Delete an optimization plan (Admins and Mentors only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/optimization-plans/${id}`);
  },
};
