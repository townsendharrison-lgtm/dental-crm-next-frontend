import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "URGENT" | "INFO" | string;
  category: "NEW_LEAD" | "BADGE" | "TASK" | string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
  created_by: string | null;
}

export const notificationsApi = {
  /** Fetch the user's notifications. */
  getNotifications: async (unreadOnly = false): Promise<SystemNotification[]> => {
    const data = await apiGet<{ notifications: SystemNotification[] }>("/api/notifications", {
      params: { unread: unreadOnly ? "true" : "false" },
    });
    return data?.notifications ?? [];
  },

  /** Get count of unread notifications. */
  getUnreadCount: async (): Promise<number> => {
    const data = await apiGet<{ count: number }>("/api/notifications/unread-count");
    return data?.count ?? 0;
  },

  /** Mark a single notification as read. */
  markAsRead: async (id: string): Promise<{ success: boolean }> => {
    return apiPatch<{ success: boolean }>(`/api/notifications/${id}/read`);
  },

  /** Mark all notifications as read. */
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    return apiPatch<{ success: boolean }>("/api/notifications/read-all");
  },

  /** Clear all notifications. */
  clearAllNotifications: async (): Promise<{ success: boolean }> => {
    return apiDelete<{ success: boolean }>("/api/notifications/clear-all");
  },

  /** Save an FCM device token. */
  registerToken: async (token: string, deviceInfo?: string): Promise<{ success: boolean }> => {
    return apiPost<{ success: boolean }>("/api/notifications/register-token", {
      token,
      deviceInfo: deviceInfo || "Unknown Device",
    });
  },

  /** Remove an FCM token. */
  unregisterToken: async (token: string): Promise<{ success: boolean }> => {
    return apiDelete<{ success: boolean }>("/api/notifications/unregister-token", {
      data: { token },
    });
  },
};
