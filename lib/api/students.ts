import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Student, StudentProfile } from "@/lib/types";

export interface CreateStudentPayload {
  userId: string;
}

export const studentsApi = {
  /**
   * List students.
   * Admins and Managers see all; Mentors see only assigned students.
   */
  list: async (): Promise<Student[]> => {
    const response = await apiGet<{ students: Student[] }>("/api/students");
    return response.students || [];
  },

  /**
   * Fetch a single student's profile details.
   */
  get: async (id: string): Promise<Student> => {
    return await apiGet<Student>(`/api/students/${id}`);
  },

  /**
   * Initialize a student profile record.
   * Typically done by admins after user signup.
   */
  create: async (userId: string): Promise<Student> => {
    return await apiPost<Student>("/api/students", { userId });
  },

  /**
   * Update student profile.
   * Supports modifying profile fields (e.g. readiness, progress) as well as main user fields (name, avatar).
   */
  update: async (
    id: string,
    updates: Partial<StudentProfile & { name?: string; avatar?: string }>,
  ): Promise<Student> => {
    return await apiPut<Student>(`/api/students/${id}`, updates);
  },

  /**
   * Delete student user (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/students/${id}`);
  },
};
