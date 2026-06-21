import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./client";
import type { LetterOfRecommendationRequest, LOREmailConfig } from "@/lib/types";

export interface CreateLorRequestInput {
  writerName: string;
  writerEmail: string;
  dueDate: string;
  studentName?: string;
  studentId?: string;
}

export interface GuestRequestInput {
  studentName: string;
  studentEmail: string;
  writerName: string;
  writerEmail: string;
  dueDate: string;
}

function normalizeRequest(r: any): LetterOfRecommendationRequest {
  if (!r) return r;
  return {
    id: r.id,
    studentId: r.student_id || r.studentId,
    studentName: r.student_name || r.studentName,
    writerName: r.writer_name || r.writerName,
    writerEmail: r.writer_email || r.writerEmail,
    dueDate: r.due_date || r.dueDate,
    status: r.status,
    requestedAt: r.requested_at || r.requestedAt,
    uploadedAt: r.uploaded_at || r.uploadedAt,
    reviewedAt: r.reviewed_at || r.reviewedAt,
    declineReason: r.decline_reason || r.declineReason,
    accessCode: r.access_code || r.accessCode,
    documentUrl: r.document_url || r.documentUrl,
  };
}

function normalizeConfig(c: any): LOREmailConfig {
  if (!c) return c;
  return {
    id: c.id,
    design: c.design ?? {},
    content: c.content ?? {},
    reminderSchedule: c.reminder_schedule ?? c.reminderSchedule ?? [],
  };
}

export const lorApi = {
  /** List LOR requests. Students only get their own; Admins get all. */
  listRequests: async (status?: string, search?: string): Promise<LetterOfRecommendationRequest[]> => {
    const data = await apiGet<{ requests: any[] }>("/api/lor/requests", {
      params: { status, search },
    });
    return (data?.requests ?? []).map(normalizeRequest);
  },

  /** Create a new LOR request (Student or Admin). */
  createRequest: async (body: CreateLorRequestInput): Promise<{ request: LetterOfRecommendationRequest }> => {
    const data = await apiPost<{ request: any }>("/api/lor/requests", body);
    return {
      request: normalizeRequest(data.request),
    };
  },

  /** Update status of an LOR request (Accept / Decline). Admin only. */
  updateStatus: async (
    id: string,
    status: "REVIEWED" | "DECLINED",
    declineReason?: string
  ): Promise<{ request: LetterOfRecommendationRequest }> => {
    const data = await apiPatch<{ request: any }>(`/api/lor/requests/${id}/status`, {
      status,
      declineReason,
    });
    return {
      request: normalizeRequest(data.request),
    };
  },

  /** Delete a request. Admin only. */
  deleteRequest: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiDelete<{ success: boolean; message: string }>(`/api/lor/requests/${id}`);
  },

  /** Bulk delete requests. Admin only. */
  bulkDeleteRequests: async (ids: string[]): Promise<{ success: boolean; message: string }> => {
    return apiDelete<{ success: boolean; message: string }>("/api/lor/requests", {
      data: { ids },
    });
  },

  /** Retrieve a signed URL to view/download the document. Admin only. */
  getDocumentSignedUrl: async (requestId: string, download: boolean): Promise<string> => {
    const data = await apiGet<{ url: string }>(`/api/lor/documents/${requestId}`, {
      params: { download: download.toString() },
    });
    return data?.url ?? "";
  },

  /** Get LOR tracking link (Admin only). */
  getTrackingLink: async (requestId: string): Promise<string> => {
    const data = await apiGet<{ trackingUrl: string }>(`/api/lor/requests/${requestId}/tracking-link`);
    return data?.trackingUrl ?? "";
  },

  /** Get email config (Admin only). */
  getConfig: async (): Promise<LOREmailConfig> => {
    const data = await apiGet<{ config: any }>("/api/lor/config");
    return normalizeConfig(data?.config);
  },

  /** Update email config (Admin only). */
  updateConfig: async (body: Partial<LOREmailConfig>): Promise<{ config: LOREmailConfig }> => {
    const data = await apiPut<{ config: any }>("/api/lor/config", body);
    return {
      config: normalizeConfig(data?.config),
    };
  },

  /** Send a test configuration email (Admin only). */
  sendTestEmail: async (testEmail: string): Promise<{ success: boolean; message: string }> => {
    return apiPost<{ success: boolean; message: string }>("/api/lor/send-test-email", { testEmail });
  },

  /** Verify access code (Public). */
  verifyAccessCode: async (
    accessCode: string
  ): Promise<{ request: LetterOfRecommendationRequest; config: any }> => {
    const data = await apiGet<{ request: any; config: any }>(
      `/api/lor/upload/${encodeURIComponent(accessCode)}`
    );
    return {
      request: normalizeRequest(data.request),
      config: data.config,
    };
  },

  /** Upload letter PDF (Public). */
  uploadDocument: async (accessCode: string, file: File): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ success: boolean; message: string }>(
      `/api/lor/upload/${encodeURIComponent(accessCode)}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  /** Guest LOR request creation (Public). */
  submitGuestRequest: async (
    body: GuestRequestInput
  ): Promise<{ request: LetterOfRecommendationRequest; trackingUrl: string }> => {
    const data = await apiPost<{ request: any; trackingUrl: string }>(
      "/api/lor/requests/guest",
      body
    );
    return {
      request: normalizeRequest(data.request),
      trackingUrl: data.trackingUrl,
    };
  },

  /** Guest LOR tracking (Public). */
  trackGuestRequests: async (token: string): Promise<LetterOfRecommendationRequest[]> => {
    const data = await apiGet<{ requests: any[] }>("/api/lor/requests/track", {
      params: { token },
    });
    return (data?.requests ?? []).map(normalizeRequest);
  },
};
