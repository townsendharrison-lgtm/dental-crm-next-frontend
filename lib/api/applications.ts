import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Application, ApplicationStatus } from "@/lib/types";

export interface CreateApplicationPayload {
  studentId?: string; // required if created by staff; defaults to student self
  schoolId: string;
  status?: ApplicationStatus;
  appliedDate?: string | null;
  interviewDate?: string | null;
  decisionDate?: string | null;
}

export const applicationsApi = {
  /**
   * List application records for a student application profile.
   * Mentors/Admins can filter by studentId.
   */
  list: async (studentId?: string): Promise<Application[]> => {
    const endpoint = `/api/applications${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ applications: Application[] }>(endpoint);
    return response.applications || [];
  },

  /**
   * Fetch details of a single logged application.
   */
  get: async (id: string): Promise<Application> => {
    return await apiGet<Application>(`/api/applications/${id}`);
  },

  /**
   * Log a new application.
   */
  create: async (payload: CreateApplicationPayload): Promise<Application> => {
    return await apiPost<Application>("/api/applications", payload);
  },

  /**
   * Update application tracking details (status, interview date, decision date).
   */
  update: async (id: string, updates: Partial<CreateApplicationPayload>): Promise<Application> => {
    const mappedUpdates: any = {};
    if (updates.status !== undefined) mappedUpdates.status = updates.status;
    if (updates.appliedDate !== undefined) mappedUpdates.appliedDate = updates.appliedDate;
    if (updates.interviewDate !== undefined) mappedUpdates.interviewDate = updates.interviewDate;
    if (updates.decisionDate !== undefined) mappedUpdates.decisionDate = updates.decisionDate;

    return await apiPut<Application>(`/api/applications/${id}`, mappedUpdates);
  },

  /**
   * Remove an application tracking record.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/applications/${id}`);
  },
};
