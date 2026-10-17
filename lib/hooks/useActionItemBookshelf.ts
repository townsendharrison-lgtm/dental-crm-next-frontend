"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actionItemBookshelfApi,
  type ActionItemBookshelfPayload,
} from "@/lib/api/actionItemBookshelf";
import { queryKeys } from "@/lib/api/queryKeys";

export function useActionItemBookshelf(enabled = true) {
  return useQuery({
    queryKey: queryKeys.actionItemBookshelf.all(),
    queryFn: () => actionItemBookshelfApi.list(),
    enabled,
  });
}

export function useCreateActionItemBookshelfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ActionItemBookshelfPayload) => actionItemBookshelfApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.actionItemBookshelf.all() });
    },
  });
}

export function useUpdateActionItemBookshelfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Omit<ActionItemBookshelfPayload, "scope">;
    }) => actionItemBookshelfApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.actionItemBookshelf.all() });
    },
  });
}

export function useDeleteActionItemBookshelfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actionItemBookshelfApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.actionItemBookshelf.all() });
    },
  });
}
