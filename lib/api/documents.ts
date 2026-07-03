import { apiClient, apiGet, apiPut, apiDelete } from "./client";
import type { StudentDocument, DocumentType } from "@/lib/types";

export interface UpdateDocumentPayload {
  title?: string;
  status?: "Pending Review" | "Reviewed" | "Needs Revision";
  comment?: string;
  privateNote?: string;
}

export const documentsApi = {
  /**
   * Upload a student document to Supabase Storage.
   * Handles multipart file uploading.
   */
  upload: async (
    file: File,
    title: string,
    type: DocumentType,
    studentId?: string,
  ): Promise<StudentDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("type", type);
    if (studentId) {
      formData.append("studentId", studentId);
    }

    const { data } = await apiClient.post<StudentDocument>("/api/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  /**
   * List document metadata. Mentors/Admins can filter by studentId.
   */
  list: async (studentId?: string): Promise<StudentDocument[]> => {
    const endpoint = `/api/documents${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ documents: StudentDocument[] }>(endpoint);
    return response.documents || [];
  },

  /**
   * Retrieve document details (which includes a secure temporary Signed URL for downloads).
   */
  get: async (id: string): Promise<StudentDocument & { downloadUrl: string | null }> => {
    return await apiGet<StudentDocument & { downloadUrl: string | null }>(`/api/documents/${id}`);
  },

  /**
   * Update metadata (change status, feedback comment, private note, or title).
   */
  update: async (id: string, updates: UpdateDocumentPayload): Promise<StudentDocument> => {
    // Map camelCase payload to backend snake_case parameters if necessary
    const mappedUpdates: any = {};
    if (updates.title !== undefined) mappedUpdates.title = updates.title;
    if (updates.status !== undefined) mappedUpdates.status = updates.status;
    if (updates.comment !== undefined) mappedUpdates.comment = updates.comment;
    if (updates.privateNote !== undefined) mappedUpdates.private_note = updates.privateNote;

    return await apiPut<StudentDocument>(`/api/documents/${id}`, mappedUpdates);
  },

  /**
   * Delete document metadata and remove file from Supabase Storage.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/documents/${id}`);
  },
};
