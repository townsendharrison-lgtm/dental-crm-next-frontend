"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workflowsApi, type CreateWorkflowPayload } from "@/lib/api/workflows";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Workflow, PendingWorkflowAction } from "@/lib/types";

export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: queryKeys.workflows.all(),
    queryFn: workflowsApi.list,
  });
}

export function usePendingWorkflows(studentId?: string) {
  return useQuery<PendingWorkflowAction[]>({
    queryKey: ["workflows", "pending", studentId],
    queryFn: () => workflowsApi.getPending(studentId),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkflowPayload) => workflowsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all() });
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateWorkflowPayload> }) =>
      workflowsApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all() });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all() });
    },
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      trigger,
      studentId,
      triggerData,
    }: {
      trigger: "FIRST_ACCEPTANCE" | "APPLICATION_SUBMITTED" | "INTERVIEW_RECEIVED";
      studentId: string;
      triggerData: any;
    }) => workflowsApi.trigger(trigger, studentId, triggerData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows", "pending"] });
    },
  });
}
