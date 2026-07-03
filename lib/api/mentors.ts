import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Mentor, MentorProfile, Student } from "@/lib/types";

export interface AssignMentorPayload {
  studentId: string;
  mentorId: string | null;
  welcomeMessage?: string;
}

export interface TransferMentorPayload {
  studentId: string;
  newMentorId: string | null;
  note?: string;
}

export const mentorsApi = {
  /**
   * List all mentors.
   * Access: Admins and Mentor Managers.
   */
  list: async (): Promise<Mentor[]> => {
    const response = await apiGet<{ mentors: Mentor[] }>("/api/mentors");
    return response.mentors || [];
  },

  /**
   * Fetch a single mentor's profile and assignments.
   */
  get: async (id: string): Promise<Mentor> => {
    return await apiGet<Mentor>(`/api/mentors/${id}`);
  },

  /**
   * Update mentor profile (or name/avatar).
   * Mentors edit their own availability/notes; Admins edit scores/all.
   */
  update: async (
    id: string,
    updates: Partial<MentorProfile & { name?: string; avatar?: string }>,
  ): Promise<Mentor> => {
    return await apiPut<Mentor>(`/api/mentors/${id}`, updates);
  },

  /**
   * Delete mentor user (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/mentors/${id}`);
  },

  /**
   * Assign a student to a mentor. Set mentorId to null to unassign.
   */
  assign: async (payload: AssignMentorPayload): Promise<{ message: string }> => {
    return await apiPost<{ message: string }>("/api/mentors/assign", payload);
  },

  /**
   * Transfer a student from their current mentor to a new mentor.
   */
  transfer: async (payload: TransferMentorPayload): Promise<{ message: string }> => {
    return await apiPost<{ message: string }>("/api/mentors/transfer", payload);
  },

  /**
   * List students assigned to a specific mentor.
   */
  listStudents: async (mentorId: string): Promise<Student[]> => {
    const response = await apiGet<{ students: Student[] }>(`/api/mentors/${mentorId}/students`);
    return response.students || [];
  },
};
