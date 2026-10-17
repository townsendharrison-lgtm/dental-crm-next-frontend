import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import type { ActionItemBookshelfItem, ActionItemPriority } from "@/lib/types";

export interface ActionItemBookshelfPayload {
  title: string;
  description?: string;
  priority?: ActionItemPriority;
  resourceLink?: string;
  sortOrder?: number;
  scope?: "GLOBAL" | "MENTOR";
}

export const actionItemBookshelfApi = {
  list: async (): Promise<ActionItemBookshelfItem[]> => {
    const data = await apiGet<{ items: ActionItemBookshelfItem[] }>("/api/action-item-bookshelf");
    return data?.items || [];
  },

  create: async (payload: ActionItemBookshelfPayload): Promise<ActionItemBookshelfItem> => {
    return await apiPost<ActionItemBookshelfItem>("/api/action-item-bookshelf", payload);
  },

  update: async (
    id: string,
    updates: Omit<ActionItemBookshelfPayload, "scope">,
  ): Promise<ActionItemBookshelfItem> => {
    return await apiPut<ActionItemBookshelfItem>(`/api/action-item-bookshelf/${id}`, updates);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/action-item-bookshelf/${id}`);
  },
};
