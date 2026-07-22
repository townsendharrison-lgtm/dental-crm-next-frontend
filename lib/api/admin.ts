import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Invitation, ManagedUser, UserRole } from "@/lib/types";

export interface AnalyticsStudentRow {
  id: string;
  name: string;
  avatar?: string | null;
  gpa: number | null;
  datAA: number | null;
  strengthScore: number | null;
  applicationCycle: string | null;
  mentorId: string | null;
  mentorName: string;
  lastMeetingDate: string | null;
  nextMeetingDate: string | null;
  lastContactDate: string | null;
  mentorshipMonths: number;
  shadowingHours: number;
  volunteerHours: number;
  hasApplied: boolean;
  hasAccepted: boolean;
  hasInterviewed: boolean;
  appliedInWindow: boolean;
  interviewCount: number;
  createdAt: string;
}

export interface PlatformAnalytics {
  summary: {
    totalStudents: number;
    activeStudents: number;
    appliedCount: number;
    interviewedCount: number;
    acceptedCount: number;
    avgInterviewsPerApplied: number;
    avgResponseHours: number;
  };
  interviewPie: { name: string; value: number }[];
  acceptancePie: { name: string; value: number }[];
  applicationTiming: { month: string; count: number }[];
  funnelByMentorship: { name: string; rate: number; count: number }[];
  schoolPerformance: {
    name: string;
    applications: number;
    interviews: number;
    acceptances: number;
  }[];
  mentors: {
    id: string;
    name: string;
    avatar: string | null;
    studentCount: number;
    avgResponse: string;
    avgResponseHours: number;
  }[];
  alerts: {
    noNextMeeting: { id: string; name: string; mentorName: string }[];
    noContactOneMonth: {
      id: string;
      name: string;
      mentorName: string;
      lastContact: string | null;
    }[];
    noMeetingOneAndHalfMonth: {
      id: string;
      name: string;
      mentorName: string;
      lastMeeting: string | null;
    }[];
  };
  signals: { title: string; desc: string; strength: string }[];
  topTrends: { label: string; rate: number; sample: number; tags: string[] }[];
  recommendation: string;
  cycles: string[];
  students: AnalyticsStudentRow[];
}

export const adminApi = {
  /** Platform analytics aggregations (admin only). */
  getAnalytics: async (): Promise<PlatformAnalytics> => {
    return apiGet<PlatformAnalytics>("/api/admin/analytics");
  },

  /** List all users (admin only). */
  listUsers: async (): Promise<ManagedUser[]> => {
    return apiGet<ManagedUser[]>("/api/admin/users");
  },

  /** Invite a new user. */
  invite: async (payload: { email: string; role: UserRole }): Promise<{
    message: string;
    invitationLink?: string;
  }> => {
    return apiPost("/api/admin/invite", payload);
  },

  /** List all invitations (admin only). */
  listInvitations: async (): Promise<Invitation[]> => {
    return apiGet<Invitation[]>("/api/admin/invitations");
  },

  /** Delete an invitation. */
  deleteInvitation: async (id: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/api/admin/invitations/${id}`);
  },

  /** Resend an invitation. */
  resendInvitation: async (id: string): Promise<{ message: string }> => {
    return apiPost<{ message: string }>(`/api/admin/invitations/${id}/resend`);
  },

  /** Delete a user (admin only). */
  deleteUser: async (id: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/api/admin/users/${id}`);
  },

  /** Update a user's role (admin only). */
  updateRole: async (id: string, role: string): Promise<{ message: string }> => {
    return apiPut<{ message: string }>(`/api/admin/users/${id}/role`, { role });
  },
};
