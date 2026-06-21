import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type SystemNotification } from "../api/notifications";
import { queryKeys } from "../api/queryKeys";

/** Hook to fetch notifications */
export function useNotifications(unreadOnly = false, enabled = true) {
  return useQuery<SystemNotification[]>({
    queryKey: queryKeys.notifications.all(unreadOnly),
    queryFn: () => notificationsApi.getNotifications(unreadOnly),
    enabled,
  });
}

/** Hook to get unread notification count */
export function useUnreadNotificationsCount(enabled = true) {
  return useQuery<number>({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsApi.getUnreadCount,
    enabled,
    refetchInterval: 30000, // Polling fallback every 30s
  });
}

/** Hook to mark a single notification as read */
export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Hook to mark all notifications as read */
export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Hook to delete all notifications */
export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.clearAllNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Hook to register an FCM device token */
export function useRegisterFcmToken() {
  return useMutation({
    mutationFn: ({ token, deviceInfo }: { token: string; deviceInfo?: string }) =>
      notificationsApi.registerToken(token, deviceInfo),
  });
}

/** Hook to unregister an FCM device token */
export function useUnregisterFcmToken() {
  return useMutation({
    mutationFn: (token: string) => notificationsApi.unregisterToken(token),
  });
}
