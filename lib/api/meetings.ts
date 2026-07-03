import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Meeting, CalendarEvent } from "@/lib/types";

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
  link?: string;
  attendees?: string[];
}

export const meetingsApi = {
  /**
   * List all meetings for the current user.
   */
  list: async (): Promise<Meeting[]> => {
    const response = await apiGet<{ meetings: Meeting[] }>("/api/meetings");
    return response.meetings || [];
  },

  /**
   * Fetch single meeting details by ID.
   */
  get: async (id: string): Promise<Meeting> => {
    return await apiGet<Meeting>(`/api/meetings/${id}`);
  },

  /**
   * Schedule a new meeting.
   */
  create: async (payload: CreateMeetingPayload): Promise<Meeting> => {
    return await apiPost<Meeting>("/api/meetings", payload);
  },

  /**
   * Update meeting details (or mark as completed).
   */
  update: async (id: string, updates: Partial<CreateMeetingPayload & { completed?: boolean }>): Promise<Meeting> => {
    return await apiPut<Meeting>(`/api/meetings/${id}`, updates);
  },

  /**
   * Cancel/delete a scheduled meeting.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/meetings/${id}`);
  },

  /**
   * Retrieve aggregated calendar events in a date range.
   */
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
};
