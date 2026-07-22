"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actionItemsApi, type CreateActionItemPayload } from "@/lib/api/actionItems";
import { queryKeys } from "@/lib/api/queryKeys";
import type { ActionItem } from "@/lib/types";

export function useActionItems(studentId?: string) {
  return useQuery<ActionItem[]>({
    queryKey: queryKeys.actionItems.all(studentId),
    queryFn: () => actionItemsApi.list(studentId),
  });
}

export function useActionItem(id: string) {
  return useQuery<ActionItem>({
    queryKey: queryKeys.actionItems.detail(id),
    queryFn: () => actionItemsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActionItemPayload) => actionItemsApi.create(payload),
    onSuccess: (newItem) => {
      const sid = newItem.student_id || newItem.studentId;
      if (sid) {
        qc.invalidateQueries({ queryKey: queryKeys.actionItems.all(sid) });
      }
      qc.invalidateQueries({ queryKey: ["actionItems"] });
    },
  });
}

export function useUpdateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateActionItemPayload & { status?: "PENDING" | "COMPLETED" | "OVERDUE" }> }) =>
      actionItemsApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all(updated.student_id) });
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.detail(updated.id) });
    },
  });
}

export function useDeleteActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) => actionItemsApi.remove(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all(vars.studentId) });
    },
  });
}
