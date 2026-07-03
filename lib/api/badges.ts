import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Badge, StudentBadge } from "@/lib/types";

export interface CreateBadgePayload {
  name: string;
  description: string;
  icon: string;
  color: string;
  benchmarkType: "PROGRESS" | "STRENGTH_SCORE" | "DAT" | "TASKS_COMPLETED" | "MEETINGS_ATTENDED";
  benchmarkValue: number;
}

export interface EvaluationResponse {
  newlyAwarded: StudentBadge[];
  totalEarned: StudentBadge[];
}

export const badgesApi = {
  /**
   * Fetch the global catalog of badges and benchmarks.
   */
  list: async (): Promise<Badge[]> => {
    const response = await apiGet<{ badges: Badge[] }>("/api/badges");
    return response.badges || [];
  },

  /**
   * Define a new badge benchmark (Admin only).
   */
  create: async (payload: CreateBadgePayload): Promise<Badge> => {
    return await apiPost<Badge>("/api/badges", payload);
  },

  /**
   * Update badge benchmark thresholds (Admin only).
   */
  update: async (id: string, updates: Partial<CreateBadgePayload>): Promise<Badge> => {
    return await apiPut<Badge>(`/api/badges/${id}`, updates);
  },

  /**
   * Delete a badge template (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/badges/${id}`);
  },

  /**
   * Fetch all achievements earned by a specific student.
   */
  getEarned: async (studentId: string): Promise<StudentBadge[]> => {
    const response = await apiGet<{ badges: StudentBadge[] }>(`/api/badges/student/${studentId}`);
    return response.badges || [];
  },

  /**
   * Trigger the reward engine evaluation logic to scan progress metrics and award qualifying badges.
   */
  evaluate: async (studentId: string): Promise<EvaluationResponse> => {
    return await apiPost<EvaluationResponse>(`/api/badges/evaluate/${studentId}`);
  },
};
