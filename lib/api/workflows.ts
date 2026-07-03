import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Workflow, PendingWorkflowAction, WorkflowStep } from "@/lib/types";

export interface CreateWorkflowPayload {
  name: string;
  trigger: "FIRST_ACCEPTANCE" | "APPLICATION_SUBMITTED" | "INTERVIEW_RECEIVED";
  steps: WorkflowStep[];
  isActive?: boolean;
}

export const workflowsApi = {
  /**
   * Fetch all workflow automation templates.
   */
  list: async (): Promise<Workflow[]> => {
    const response = await apiGet<{ workflows: Workflow[] }>("/api/workflows");
    return response.workflows || [];
  },

  /**
   * Create a new workflow template (Admin only).
   */
  create: async (payload: CreateWorkflowPayload): Promise<Workflow> => {
    return await apiPost<Workflow>("/api/workflows", payload);
  },

  /**
   * Update workflow templates (Admin only).
   */
  update: async (id: string, updates: Partial<CreateWorkflowPayload>): Promise<Workflow> => {
    return await apiPut<Workflow>(`/api/workflows/${id}`, updates);
  },

  /**
   * Delete a workflow template (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/workflows/${id}`);
  },

  /**
   * Get list of scheduled pending actions.
   */
  getPending: async (studentId?: string): Promise<PendingWorkflowAction[]> => {
    const endpoint = `/api/workflows/pending${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ queue: PendingWorkflowAction[] }>(endpoint);
    return response.queue || [];
  },

  /**
   * Programmatically trigger an automation event.
   */
  trigger: async (
    trigger: "FIRST_ACCEPTANCE" | "APPLICATION_SUBMITTED" | "INTERVIEW_RECEIVED",
    studentId: string,
    triggerData: any = {}
  ): Promise<{ message: string; matchedWorkflowsCount: number; scheduledActions: PendingWorkflowAction[] }> => {
    return await apiPost("/api/workflows/trigger", { trigger, studentId, triggerData });
  },

  /**
   * Run the queue engine manually to process any due actions.
   */
  executeDue: async (): Promise<{ message: string; executedCount: number }> => {
    return await apiPost("/api/workflows/execute-due");
  },
};
