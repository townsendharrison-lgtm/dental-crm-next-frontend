"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  timelineBookshelfApi,
  type CreateBookshelfPayload,
  type UpdateBookshelfPayload,
} from "@/lib/api/timelineBookshelf";
import { queryKeys } from "@/lib/api/queryKeys";
import type { TimelineBookshelfItem, TimelineCardColors } from "@/lib/types";
import { DEFAULT_TIMELINE_CARD_COLORS } from "@/lib/types";

export function useTimelineBookshelf(enabled = true) {
  return useQuery<{ items: TimelineBookshelfItem[]; cardColors: TimelineCardColors }>({
    queryKey: queryKeys.timelineBookshelf.all(),
    queryFn: () => timelineBookshelfApi.list(false),
    enabled,
    placeholderData: { items: [], cardColors: DEFAULT_TIMELINE_CARD_COLORS },
  });
}

export function useCreateBookshelfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookshelfPayload) => timelineBookshelfApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.timelineBookshelf.all() });
    },
  });
}

export function useUpdateBookshelfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateBookshelfPayload }) =>
      timelineBookshelfApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.timelineBookshelf.all() });
    },
  });
}

export function useDeleteBookshelfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timelineBookshelfApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.timelineBookshelf.all() });
    },
  });
}
