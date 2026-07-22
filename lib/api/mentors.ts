import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Mentor, MentorProfile, Student, StudentAssignment } from "@/lib/types";

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

export interface AcceptAssignmentPayload {
  assignmentId: string;
  availableTimes?: string[];
  welcomeMessage?: string;
}

export const mentorsApi = {
  list: async (): Promise<Mentor[]> => {
    const response = await apiGet<{ mentors: Mentor[] }>("/api/mentors");
    return response.mentors || [];
  },

  listAssignments: async (): Promise<StudentAssignment[]> => {
    const response = await apiGet<{ assignments: StudentAssignment[] }>("/api/mentors/assignments");
    return response.assignments || [];
  },

  listPendingAssignments: async (): Promise<StudentAssignment[]> => {
    const response = await apiGet<{ assignments: StudentAssignment[] }>(
      "/api/mentors/assignments/pending",
    );
    return response.assignments || [];
  },

  get: async (id: string): Promise<Mentor> => {
    return await apiGet<Mentor>(`/api/mentors/${id}`);
  },

  update: async (
    id: string,
    updates: Partial<MentorProfile & { name?: string; avatar?: string }>,
  ): Promise<Mentor> => {
    return await apiPut<Mentor>(`/api/mentors/${id}`, updates);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/mentors/${id}`);
  },

  /** Propose assignment — stays PENDING until mentor accepts. */
  assign: async (payload: AssignMentorPayload): Promise<{ message: string }> => {
    return await apiPost<{ message: string }>("/api/mentors/assign", payload);
  },

  /** Propose transfer — stays PENDING until new mentor accepts. */
  transfer: async (payload: TransferMentorPayload): Promise<{ message: string }> => {
    return await apiPost<{ message: string }>("/api/mentors/transfer", payload);
  },

  /** Clear mentor link with no replacement. */
  unassign: async (studentId: string): Promise<{ message: string }> => {
    return await apiPost<{ message: string }>("/api/mentors/unassign", { studentId });
  },

  acceptAssignment: async (
    payload: AcceptAssignmentPayload,
  ): Promise<{ message: string }> => {
    const { assignmentId, ...body } = payload;
    return await apiPost<{ message: string }>(
      `/api/mentors/assignments/${assignmentId}/accept`,
      body,
    );
  },

  declineAssignment: async (assignmentId: string): Promise<{ message: string }> => {
    return await apiPost<{ message: string }>(
      `/api/mentors/assignments/${assignmentId}/decline`,
      {},
    );
  },

  listStudents: async (mentorId: string): Promise<Student[]> => {
    const response = await apiGet<{ students: Student[] }>(`/api/mentors/${mentorId}/students`);
    return response.students || [];
  },
};
