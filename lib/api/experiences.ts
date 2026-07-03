import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Experience, ExperienceSession, ExperienceCategory } from "@/lib/types";

export interface CreateExperiencePayload {
  studentId?: string; // required if created by staff; defaults to student self
  category: ExperienceCategory;
  title: string;
  organization: string;
  supervisorName?: string;
  supervisorContact?: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  isOngoing?: boolean;
  dentistType?: "General" | "Specialty" | null;
}

export interface CreateSessionPayload {
  date: string;
  duration: number; // decimal hours (e.g. 2.5)
  notes?: string;
}

export const experiencesApi = {
  /**
   * List experiences (and nested hourly logs) for a student.
   * Mentors/Admins can filter by studentId.
   */
  list: async (studentId?: string): Promise<Experience[]> => {
    const endpoint = `/api/experiences${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ experiences: Experience[] }>(endpoint);
    return response.experiences || [];
  },

  /**
   * Fetch details of a single experience including its session logs.
   */
  get: async (id: string): Promise<Experience> => {
    return await apiGet<Experience>(`/api/experiences/${id}`);
  },

  /**
   * Create a new experience profile.
   */
  create: async (payload: CreateExperiencePayload): Promise<Experience> => {
    return await apiPost<Experience>("/api/experiences", payload);
  },

  /**
   * Update experience profile details.
   */
  update: async (id: string, updates: Partial<CreateExperiencePayload>): Promise<Experience> => {
    // Map camelCase updates to backend snake_case parameters if necessary
    const mappedUpdates: any = {};
    if (updates.category !== undefined) mappedUpdates.category = updates.category;
    if (updates.title !== undefined) mappedUpdates.title = updates.title;
    if (updates.organization !== undefined) mappedUpdates.organization = updates.organization;
    if (updates.supervisorName !== undefined) mappedUpdates.supervisorName = updates.supervisorName;
    if (updates.supervisorContact !== undefined) mappedUpdates.supervisorContact = updates.supervisorContact;
    if (updates.description !== undefined) mappedUpdates.description = updates.description;
    if (updates.startDate !== undefined) mappedUpdates.startDate = updates.startDate;
    if (updates.endDate !== undefined) mappedUpdates.endDate = updates.endDate;
    if (updates.isOngoing !== undefined) mappedUpdates.isOngoing = updates.isOngoing;
    if (updates.dentistType !== undefined) mappedUpdates.dentistType = updates.dentistType;

    return await apiPut<Experience>(`/api/experiences/${id}`, mappedUpdates);
  },

  /**
   * Delete an experience profile (cascade deletes sessions).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/experiences/${id}`);
  },

  /**
   * Log an individual session hours entry under an experience.
   */
  createSession: async (experienceId: string, payload: CreateSessionPayload): Promise<ExperienceSession> => {
    return await apiPost<ExperienceSession>(`/api/experiences/${experienceId}/sessions`, payload);
  },

  /**
   * Update details of a logged session.
   */
  updateSession: async (
    experienceId: string,
    sessionId: string,
    updates: Partial<CreateSessionPayload>,
  ): Promise<ExperienceSession> => {
    return await apiPut<ExperienceSession>(`/api/experiences/${experienceId}/sessions/${sessionId}`, updates);
  },

  /**
   * Delete a logged session hours entry.
   */
  removeSession: async (experienceId: string, sessionId: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/experiences/${experienceId}/sessions/${sessionId}`);
  },
};
