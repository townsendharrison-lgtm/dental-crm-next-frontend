import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Workflow, PendingWorkflowAction, WorkflowStep } from "@/lib/types";

export interface CreateWorkflowPayload {
  name: string;
  trigger: "FIRST_ACCEPTANCE" | "APPLICATION_SUBMITTED" | "INTERVIEW_RECEIVED";
  steps: WorkflowStep[];
  isActive?: boolean;
}

type RawWorkflow = Workflow & Record<string, unknown>;

export function normalizeWorkflow(raw: RawWorkflow): Workflow {
  const isActive =
    raw.isActive !== undefined
      ? Boolean(raw.isActive)
      : raw.is_active !== undefined
        ? Boolean(raw.is_active)
        : true;
  const createdAt = String(raw.createdAt ?? raw.created_at ?? "");
  const updatedAt = String(raw.updatedAt ?? raw.updated_at ?? "");

  return {
    ...raw,
    id: raw.id,
    name: raw.name,
    trigger: raw.trigger,
    steps: raw.steps || [],
    is_active: isActive,
    isActive,
    created_at: createdAt || raw.created_at,
    createdAt: createdAt || undefined,
    updated_at: updatedAt || raw.updated_at,
    updatedAt: updatedAt || undefined,
  };
}

export const workflowsApi = {
  list: async (): Promise<Workflow[]> => {
    const response = await apiGet<{ workflows: Workflow[] }>("/api/workflows");
    return (response.workflows || []).map((w) => normalizeWorkflow(w as RawWorkflow));
  },

  create: async (payload: CreateWorkflowPayload): Promise<Workflow> => {
    const workflow = await apiPost<Workflow>("/api/workflows", payload);
    return normalizeWorkflow(workflow as RawWorkflow);
  },

  update: async (id: string, updates: Partial<CreateWorkflowPayload>): Promise<Workflow> => {
    const workflow = await apiPut<Workflow>(`/api/workflows/${id}`, updates);
    return normalizeWorkflow(workflow as RawWorkflow);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/workflows/${id}`);
  },

  getPending: async (studentId?: string): Promise<PendingWorkflowAction[]> => {
    const endpoint = `/api/workflows/pending${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ queue: PendingWorkflowAction[] }>(endpoint);
    return response.queue || [];
  },

  trigger: async (
    trigger: "FIRST_ACCEPTANCE" | "APPLICATION_SUBMITTED" | "INTERVIEW_RECEIVED",
    studentId: string,
    triggerData: Record<string, unknown> = {},
  ): Promise<{
    message: string;
    matchedWorkflowsCount: number;
    scheduledActions: number;
  }> => {
    return await apiPost("/api/workflows/trigger", { trigger, studentId, triggerData });
  },

  executeDue: async (): Promise<{ message: string; executedCount: number }> => {
    return await apiPost("/api/workflows/execute-due");
  },
};
