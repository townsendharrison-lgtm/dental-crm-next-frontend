import { apiClient, apiGet, apiPost, apiPut, apiDelete, ApiRequestError } from "./client";
import type { Student, StudentProfile, StudentNote, ManualDexterity } from "@/lib/types";

export type NoteTag = StudentNote["tags"][number];

export interface CreateNotePayload {
  content: string;
  tags?: NoteTag[];
}

export interface UpdateNotePayload {
  content?: string;
  tags?: NoteTag[];
}

export interface CreateDexterityPayload {
  activity: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  isOngoing?: boolean;
}

export type UpdateDexterityPayload = Partial<CreateDexterityPayload>;

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
    updates: Partial<Student> | Partial<StudentProfile & { name?: string; avatar?: string }>,
  ): Promise<Student> => {
    return await apiPut<Student>(`/api/students/${id}`, updates);
  },

  /**
   * Delete student user (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/students/${id}`);
  },

  /**
   * DAT score history snapshots for charts.
   */
  datHistory: async (
    id: string,
  ): Promise<
    Array<{
      id: string;
      student_id: string;
      dat_score?: number | null;
      dat_aa?: number | null;
      dat_ts?: number | null;
      recorded_at: string;
    }>
  > => {
    const response = await apiGet<{ history: any[] }>(`/api/students/${id}/dat-history`);
    return response.history || [];
  },

  /**
   * Strength score history snapshots for progression charts.
   */
  strengthHistory: async (
    id: string,
  ): Promise<
    Array<{
      id: string;
      student_id: string;
      strength_score: number;
      recorded_at: string;
    }>
  > => {
    const response = await apiGet<{ history: any[] }>(`/api/students/${id}/strength-history`);
    return response.history || [];
  },

  /**
   * Peer rank for strength score (how many applicants this student is ahead of).
   */
  strengthPercentile: async (
    id: string,
  ): Promise<{
    strengthScore: number;
    cohortSize: number;
    percentile: number | null;
    aheadOf: number | null;
  }> => {
    return apiGet(`/api/students/${id}/strength-percentile`);
  },

  listNotes: async (id: string): Promise<StudentNote[]> => {
    const response = await apiGet<{ notes: StudentNote[] }>(`/api/students/${id}/notes`);
    return response.notes || [];
  },

  createNote: async (id: string, payload: CreateNotePayload): Promise<StudentNote> => {
    const response = await apiPost<{ note: StudentNote }>(`/api/students/${id}/notes`, payload);
    return response.note;
  },

  updateNote: async (
    id: string,
    noteId: string,
    payload: UpdateNotePayload,
  ): Promise<StudentNote> => {
    const response = await apiPut<{ note: StudentNote }>(
      `/api/students/${id}/notes/${noteId}`,
      payload,
    );
    return response.note;
  },

  deleteNote: async (id: string, noteId: string): Promise<void> => {
    await apiDelete(`/api/students/${id}/notes/${noteId}`);
  },

  listDexterity: async (id: string): Promise<ManualDexterity[]> => {
    const response = await apiGet<{ items: ManualDexterity[] }>(`/api/students/${id}/dexterity`);
    return response.items || [];
  },

  createDexterity: async (
    id: string,
    payload: CreateDexterityPayload,
  ): Promise<ManualDexterity> => {
    const response = await apiPost<{ item: ManualDexterity }>(
      `/api/students/${id}/dexterity`,
      payload,
    );
    return response.item;
  },

  updateDexterity: async (
    id: string,
    itemId: string,
    payload: UpdateDexterityPayload,
  ): Promise<ManualDexterity> => {
    const response = await apiPut<{ item: ManualDexterity }>(
      `/api/students/${id}/dexterity/${itemId}`,
      payload,
    );
    return response.item;
  },

  deleteDexterity: async (id: string, itemId: string): Promise<void> => {
    await apiDelete(`/api/students/${id}/dexterity/${itemId}`);
  },

  /** Download a backend-generated PDF of the student profile / records. */
  exportPdf: async (id: string, fileName?: string): Promise<void> => {
    try {
      const response = await apiClient.get(`/api/students/${id}/export.pdf`, {
        responseType: "blob",
      });
      const blob = response.data as Blob;
      const contentType = String(response.headers["content-type"] || blob.type || "");
      if (contentType.includes("application/json")) {
        const text = await blob.text();
        let message = "Failed to export PDF";
        try {
          message = (JSON.parse(text) as { error?: string }).error || message;
        } catch {
          /* ignore */
        }
        throw new ApiRequestError(message, response.status);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "student_profile.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiRequestError) throw err;
      // Axios may reject with a blob body when responseType is blob
      const axiosErr = err as { response?: { data?: Blob; status?: number }; message?: string };
      if (axiosErr?.response?.data instanceof Blob) {
        try {
          const text = await axiosErr.response.data.text();
          const parsed = JSON.parse(text) as { error?: string };
          throw new ApiRequestError(
            parsed.error || "Failed to export PDF",
            axiosErr.response.status ?? 0,
          );
        } catch (inner) {
          if (inner instanceof ApiRequestError) throw inner;
        }
      }
      throw new ApiRequestError(
        err instanceof Error ? err.message : "Failed to export PDF",
        0,
      );
    }
  },

  /** Create (or reuse) a public read-only share link for this student. */
  createShareLink: async (
    id: string,
  ): Promise<{ token: string; shareUrl: string; createdAt?: string }> => {
    return await apiPost<{ token: string; shareUrl: string; createdAt?: string }>(
      `/api/students/${id}/share`,
    );
  },
};
