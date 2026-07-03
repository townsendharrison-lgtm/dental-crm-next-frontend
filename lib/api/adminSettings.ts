import { apiGet, apiPut } from "./client";
import type { AdminSettings } from "@/lib/types";

export interface UpdateSettingsPayload {
  platformName?: string;
  supportEmail?: string;
  maintenanceMode?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyMessage?: string | null;
  welcomeTemplateStudent?: string | null;
  welcomeTemplateMentor?: string | null;
}

export const adminSettingsApi = {
  /**
   * Fetch the global system settings.
   */
  get: async (): Promise<AdminSettings> => {
    return await apiGet<AdminSettings>("/api/admin-settings");
  },

  /**
   * Update the global system settings (Admin only).
   */
  update: async (payload: UpdateSettingsPayload): Promise<AdminSettings> => {
    return await apiPut<AdminSettings>("/api/admin-settings", payload);
  },
};
