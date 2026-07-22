import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Meeting, CalendarEvent, MeetingAudience } from "@/lib/types";

export interface CreateMeetingPayload {
  studentId?: string | null;
  mentorId?: string;
  title: string;
  date: string;
  timezone?: string;
  duration?: number;
  summary?: string;
  notes?: string;
  mentorNotes?: string;
  type?: "STUDENT_MEETING" | "MANAGER_MEETING" | "GENERAL";
  audience?: MeetingAudience;
  /** For ADMIN_DIRECT: meet with a student or a mentor */
  counterpartyType?: "student" | "mentor";
  link?: string;
  attendees?: string[];
}

export const meetingsApi = {
  list: async (): Promise<Meeting[]> => {
    const response = await apiGet<{ meetings: Meeting[] }>("/api/meetings");
    return response.meetings || [];
  },

  get: async (id: string): Promise<Meeting> => {
    return await apiGet<Meeting>(`/api/meetings/${id}`);
  },

  create: async (payload: CreateMeetingPayload): Promise<Meeting> => {
    return await apiPost<Meeting>("/api/meetings", payload);
  },

  update: async (
    id: string,
    updates: Partial<CreateMeetingPayload & { completed?: boolean }>,
  ): Promise<Meeting> => {
    return await apiPut<Meeting>(`/api/meetings/${id}`, updates);
  },

  attend: async (id: string): Promise<Meeting> => {
    return await apiPost<Meeting>(`/api/meetings/${id}/attend`);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/meetings/${id}`);
  },

  calendar: async (start?: string, end?: string): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    const queryString = params.toString();
    const response = await apiGet<{ events: CalendarEvent[] }>(
      `/api/meetings/calendar${queryString ? `?${queryString}` : ""}`,
    );
    return response.events || [];
  },

  inviteDirectory: async (): Promise<
    Array<{ id: string; name: string; email: string; avatar?: string | null; role: string }>
  > => {
    const response = await apiGet<{
      users: Array<{ id: string; name: string; email: string; avatar?: string | null; role: string }>;
    }>("/api/meetings/invite-directory");
    return response.users || [];
  },
};
