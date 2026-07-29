"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  optimizationPlansApi,
  type OptimizationPlanListItem,
  type UpsertPlanPayload,
} from "@/lib/api/optimizationPlans";
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

export function useOptimizationPlansList(enabled = true) {
  return useQuery<OptimizationPlanListItem[]>({
    queryKey: queryKeys.optimizationPlans.list(),
    queryFn: () => optimizationPlansApi.list(),
    enabled,
  });
}

export function useUpsertOptimizationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPlanPayload) => optimizationPlansApi.upsert(payload),
    onSuccess: (newPlan) => {
      const sid = newPlan.student_id || newPlan.studentId;
      const eid = newPlan.external_id || newPlan.externalId;
      if (sid) {
        qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.detail(sid) });
      }
      if (eid) {
        qc.invalidateQueries({
          queryKey: queryKeys.optimizationPlans.detail(`external:${eid}`),
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.list() });
    },
  });
}

export function useUpdateOptimizationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UpsertPlanPayload> }) =>
      optimizationPlansApi.update(id, updates),
    onSuccess: (updated) => {
      const sid = updated.student_id || updated.studentId;
      if (sid) {
        qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.detail(sid) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.list() });
    },
  });
}

export function useDeleteOptimizationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; studentId?: string }) =>
      optimizationPlansApi.remove(id),
    onSuccess: (_, vars) => {
      if (vars.studentId) {
        qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.detail(vars.studentId) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.optimizationPlans.list() });
    },
  });
}
