"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { optimizationPlansApi, type UpsertPlanPayload } from "@/lib/api/optimizationPlans";
import { queryKeys } from "@/lib/api/queryKeys";
import type { OptimizationPlan } from "@/lib/types";
import {
  isNotFoundError,
  normalizeOptimizationPlan,
} from "@/lib/utils/normalizeOptimizationPlan";

export function useOptimizationPlan(studentId?: string) {
  return useQuery<OptimizationPlan | null>({
    queryKey: queryKeys.optimizationPlans.detail(studentId),
    queryFn: async () => {
      try {
        const plan = await optimizationPlansApi.get(studentId);
        return normalizeOptimizationPlan(plan);
      } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
      }
    },
    enabled: Boolean(studentId),
  });
}

export function useUpsertOptimizationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPlanPayload) => optimizationPlansApi.upsert(payload),
    onSuccess: (newPlan) => {
      qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.detail(newPlan.student_id) });
    },
  });
}

export function useUpdateOptimizationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UpsertPlanPayload> }) =>
      optimizationPlansApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.detail(updated.student_id) });
    },
  });
}

export function useDeleteOptimizationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      optimizationPlansApi.remove(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.detail(vars.studentId) });
    },
  });
}
