import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Milestone } from "@/lib/types";

export interface CreateMilestonePayload {
  studentId?: string;
  title: string;
  month: string;
  status?: string;
  isCustom?: boolean;
  sortOrder?: number;
}

export interface UpdateMilestonePayload {
  title?: string;
  month?: string;
  status?: string;
  sortOrder?: number;
  isCustom?: boolean;
}

export const milestonesApi = {
  list: async (studentId?: string): Promise<Milestone[]> => {
    const endpoint = `/api/milestones${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ milestones: Milestone[] }>(endpoint);
    return response.milestones || [];
  },

  create: async (payload: CreateMilestonePayload): Promise<Milestone> => {
    return await apiPost<Milestone>("/api/milestones", payload);
  },

  update: async (id: string, updates: UpdateMilestonePayload): Promise<Milestone> => {
    return await apiPut<Milestone>(`/api/milestones/${id}`, updates);
  },

  sync: async (
    studentId: string,
    milestones: Array<{ id: string; month?: string; sortOrder?: number; status?: string; title?: string }>,
  ): Promise<Milestone[]> => {
    const response = await apiPut<{ milestones: Milestone[] }>("/api/milestones/bulk/sync", {
      studentId,
      milestones,
    });
    return response.milestones || [];
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/milestones/${id}`);
  },
};
