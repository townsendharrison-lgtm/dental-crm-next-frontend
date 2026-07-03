import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { ActionItem } from "@/lib/types";

export interface CreateActionItemPayload {
  studentId?: string; // required if scheduled by mentor/admin; defaults to current student self
  meetingId?: string | null;
  task: string;
  dueDate: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  description?: string;
  category?: string;
  resourceId?: string;
  resourceLink?: string;
}

export const actionItemsApi = {
  /**
   * List action items. Supports optional filtering by studentId for mentors/admins.
   */
  list: async (studentId?: string): Promise<ActionItem[]> => {
    const endpoint = `/api/action-items${studentId ? `?studentId=${studentId}` : ""}`;
    const response = await apiGet<{ actionItems: ActionItem[] }>(endpoint);
    return response.actionItems || [];
  },

  /**
   * Fetch single action item details by ID.
   */
  get: async (id: string): Promise<ActionItem> => {
    return await apiGet<ActionItem>(`/api/action-items/${id}`);
  },

  /**
   * Create a new student action item (checklist task).
   */
  create: async (payload: CreateActionItemPayload): Promise<ActionItem> => {
    return await apiPost<ActionItem>("/api/action-items", payload);
  },

  /**
   * Update task details or change status (PENDING / COMPLETED / OVERDUE).
   */
  update: async (
    id: string,
    updates: Partial<CreateActionItemPayload & { status?: "PENDING" | "COMPLETED" | "OVERDUE" }>,
  ): Promise<ActionItem> => {
    return await apiPut<ActionItem>(`/api/action-items/${id}`, updates);
  },

  /**
   * Delete an action item.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/action-items/${id}`);
  },
};
