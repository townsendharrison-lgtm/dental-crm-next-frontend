import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { StaffTask } from "@/lib/types";

export interface CreateStaffTaskPayload {
  assignedTo: string; // Mentor or Mentor Manager ID
  task: string;
  dueDate: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  description?: string;
  relatedDocId?: string;
  studentId?: string;
}

export const staffTasksApi = {
  /**
   * List staff tasks (assigned to or created by the logged-in user; Admins see all).
   */
  list: async (): Promise<StaffTask[]> => {
    const response = await apiGet<{ staffTasks: StaffTask[] }>("/api/staff-tasks");
    return response.staffTasks || [];
  },

  /**
   * Fetch single staff task details by ID.
   */
  get: async (id: string): Promise<StaffTask> => {
    return await apiGet<StaffTask>(`/api/staff-tasks/${id}`);
  },

  /**
   * Create a new staff task (Admin only).
   */
  create: async (payload: CreateStaffTaskPayload): Promise<StaffTask> => {
    return await apiPost<StaffTask>("/api/staff-tasks", payload);
  },

  /**
   * Update a staff task.
   * Admins can edit details; Mentors/Managers can only change status.
   */
  update: async (
    id: string,
    updates: Partial<CreateStaffTaskPayload & { status?: "PENDING" | "COMPLETED" | "OVERDUE" }>,
  ): Promise<StaffTask> => {
    return await apiPut<StaffTask>(`/api/staff-tasks/${id}`, updates);
  },

  /**
   * Delete a staff task (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/staff-tasks/${id}`);
  },
};
