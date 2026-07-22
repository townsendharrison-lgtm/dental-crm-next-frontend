import { apiGet, apiPut, apiPost } from "./client";
import type { AdminSettings, PlatformConfig } from "@/lib/types";

export interface UpdateSettingsPayload {
  platformName?: string;
  supportEmail?: string;
  maintenanceMode?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyMessage?: string | null;
  autoReplyInactivityMinutes?: number;
  autoReplyRateLimitMinutes?: number;
  welcomeTemplateStudent?: string | null;
  welcomeTemplateMentor?: string | null;
  acceptedMessage?: string | null;
  interviewMessage?: string | null;
  waitlistMessage?: string | null;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  acceptedMessage: "Congratulations! Your hard work has paid off. You're going to be a dentist!",
  interviewMessage: "Great job! An interview is a huge milestone. You've got this!",
  waitlistMessage:
    "You're still in the running! A waitlist is a 'not yet', not a 'no'. Stay positive!",
};

export function platformConfigFromSettings(settings?: AdminSettings | null): PlatformConfig {
  if (!settings) return DEFAULT_PLATFORM_CONFIG;
  return {
    acceptedMessage: settings.accepted_message || DEFAULT_PLATFORM_CONFIG.acceptedMessage,
    interviewMessage: settings.interview_message || DEFAULT_PLATFORM_CONFIG.interviewMessage,
    waitlistMessage: settings.waitlist_message || DEFAULT_PLATFORM_CONFIG.waitlistMessage,
  };
}

export const adminSettingsApi = {
  get: async (): Promise<AdminSettings> => {
    return await apiGet<AdminSettings>("/api/admin-settings");
  },

  update: async (payload: UpdateSettingsPayload): Promise<AdminSettings> => {
    return await apiPut<AdminSettings>("/api/admin-settings", payload);
  },

  resetProfileReminders: async (): Promise<{ success: boolean; resetCount: number; message: string }> => {
    return await apiPost<{ success: boolean; resetCount: number; message: string }>(
      "/api/admin-settings/reset-profile-reminders",
    );
  },
};
