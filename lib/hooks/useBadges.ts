"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { badgesApi, type CreateBadgePayload } from "@/lib/api/badges";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Badge, StudentBadge } from "@/lib/types";

export function useBadges() {
  return useQuery<Badge[]>({
    queryKey: queryKeys.badges.all(),
    queryFn: badgesApi.list,
  });
}

export function useEarnedBadges(studentId: string) {
  return useQuery<StudentBadge[]>({
    queryKey: ["badges", "student", studentId],
    queryFn: () => badgesApi.getEarned(studentId),
    enabled: !!studentId,
  });
}

export function useEvaluateBadges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => badgesApi.evaluate(studentId),
    onSuccess: (_, studentId) => {
      qc.invalidateQueries({ queryKey: ["badges", "student", studentId] });
      qc.invalidateQueries({ queryKey: ["students", studentId] });
    },
  });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBadgePayload) => badgesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.badges.all() });
    },
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateBadgePayload> }) =>
      badgesApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.badges.all() });
    },
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => badgesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.badges.all() });
    },
  });
}
