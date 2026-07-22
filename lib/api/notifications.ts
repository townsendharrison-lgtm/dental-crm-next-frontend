import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "URGENT" | "INFO" | "WARNING" | string;
  category: "NEW_LEAD" | "BADGE" | "TASK" | "BROADCAST" | string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
  created_by: string | null;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  related_id?: string | null;
  targetRole?: "STUDENT" | "MENTOR" | "BOTH";
  target_role?: "STUDENT" | "MENTOR" | "BOTH";
  created_at?: string;
  createdAt?: string;
  created_by?: string | null;
  createdBy?: string | null;
  notified?: number;
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

  /** Admin: list recent broadcast alerts. */
  listBroadcasts: async (): Promise<BroadcastNotification[]> => {
    const data = await apiGet<{ broadcasts: BroadcastNotification[] }>("/api/notifications/broadcasts");
    return data?.broadcasts ?? [];
  },

  /** Admin/Manager: send a targeted nudge to one user (e.g. mentor). */
  nudge: async (payload: {
    userId: string;
    title: string;
    message: string;
    type?: "INFO" | "WARNING" | "URGENT";
  }): Promise<{ success: boolean }> => {
    return apiPost("/api/notifications/nudge", payload);
  },

  /** Admin: broadcast a system alert to a target role. */
  broadcast: async (payload: {
    title: string;
    message: string;
    type?: "INFO" | "WARNING" | "URGENT";
    targetRole?: "STUDENT" | "MENTOR" | "BOTH";
  }): Promise<{ success: boolean; notified: number; broadcast: BroadcastNotification | null }> => {
    return apiPost("/api/notifications/broadcast", payload);
  },

  /** Admin: delete a broadcast batch (all recipient rows). */
  deleteBroadcast: async (relatedId: string): Promise<{ success: boolean }> => {
    return apiDelete<{ success: boolean }>(
      `/api/notifications/broadcasts/${encodeURIComponent(relatedId)}`,
    );
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
