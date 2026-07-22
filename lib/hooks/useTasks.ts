"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffTasksApi, type CreateStaffTaskPayload } from "@/lib/api/staffTasks";
import { queryKeys } from "@/lib/api/queryKeys";
import type { StaffTask } from "@/lib/types";

export function useTasks() {
  return useQuery<StaffTask[]>({
    queryKey: queryKeys.staffTasks.all(),
    queryFn: staffTasksApi.list,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffTaskPayload) => staffTasksApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.staffTasks.all() });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateStaffTaskPayload & { status?: "PENDING" | "COMPLETED" | "OVERDUE" }> }) =>
      staffTasksApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.staffTasks.all() });
      qc.invalidateQueries({ queryKey: queryKeys.staffTasks.detail(updated.id) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffTasksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.staffTasks.all() });
    },
  });
}
