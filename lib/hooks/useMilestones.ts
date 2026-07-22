"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  milestonesApi,
  type CreateMilestonePayload,
  type UpdateMilestonePayload,
} from "@/lib/api/milestones";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Milestone } from "@/lib/types";

export function useMilestones(studentId?: string) {
  return useQuery<Milestone[]>({
    queryKey: queryKeys.milestones.all(studentId),
    queryFn: () => milestonesApi.list(studentId),
    enabled: !!studentId,
  });
}

export function useCreateMilestone(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMilestonePayload) =>
      milestonesApi.create({ ...payload, studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all(studentId) });
    },
  });
}

export function useUpdateMilestone(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateMilestonePayload }) =>
      milestonesApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all(studentId) });
    },
  });
}

export function useSyncMilestones(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      milestones: Array<{ id: string; month?: string; sortOrder?: number; status?: string; title?: string }>,
    ) => milestonesApi.sync(studentId, milestones),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all(studentId) });
    },
  });
}

export function useDeleteMilestone(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => milestonesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all(studentId) });
    },
  });
}
