"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/queryKeys";
import { useAuth } from "@/lib/hooks/useAuth";

/** Total unread messages across all conversations for the current user (or a previewed inbox). */
export function useUnreadMessageCount(userId?: string) {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.messages.conversations(userId),
    queryFn: () => messagesApi.list(userId),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = useMemo(
    () =>
      (query.data || []).reduce(
        (sum, c) => sum + (Number(c.unreadCount) || 0),
        0,
      ),
    [query.data],
  );

  return { unreadCount, ...query };
}
