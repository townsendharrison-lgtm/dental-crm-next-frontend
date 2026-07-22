import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { StudentSchool } from "@/lib/types";

export interface CreateStudentSchoolPayload {
  studentId?: string; // required if created by staff; defaults to student self
  schoolId: string;
  category: string;
  status?: "Interested" | "Applying" | "Applied" | "Interviewed" | "Accepted" | "Waitlisted" | "Rejected";
  appliedDate?: string | null;
  interviewDate?: string | null;
  decisionDate?: string | null;
  notes?: string;
}

export const studentSchoolsApi = {
  /**
   * List school selections for a student portfolio.
   * Mentors/Admins can filter by studentId.
   */
  list: async (studentId?: string): Promise<StudentSchool[]> => {
    const endpoint = `/api/student-schools${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ selections: StudentSchool[] }>(endpoint);
    return response.selections || [];
  },

  /**
   * Add a school to the student's list of applications/selections.
   */
  create: async (payload: CreateStudentSchoolPayload): Promise<StudentSchool> => {
    return await apiPost<StudentSchool>("/api/student-schools", payload);
  },

  /**
   * Update category, application state, or notes for a selection.
   */
  update: async (id: string, updates: Partial<CreateStudentSchoolPayload>): Promise<StudentSchool> => {
    const mappedUpdates: any = {};
    if (updates.category !== undefined) mappedUpdates.category = updates.category;
    if (updates.status !== undefined) mappedUpdates.status = updates.status;
    if (updates.appliedDate !== undefined) mappedUpdates.appliedDate = updates.appliedDate;
    if (updates.interviewDate !== undefined) mappedUpdates.interviewDate = updates.interviewDate;
    if (updates.decisionDate !== undefined) mappedUpdates.decisionDate = updates.decisionDate;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    return await apiPut<StudentSchool>(`/api/student-schools/${id}`, mappedUpdates);
  },

  /**
   * Remove a school from the student's selections list.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/student-schools/${id}`);
  },
};
