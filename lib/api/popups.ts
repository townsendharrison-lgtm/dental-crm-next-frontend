import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { PopupAdvertisement } from "@/lib/types";

export interface CreatePopupPayload {
  title: string;
  message: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  targetRole?: "STUDENT" | "MENTOR" | "ADMIN" | "MENTOR_MANAGER" | "BOTH";
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export const popupsApi = {
  /**
   * Fetch all popup advertisement campaigns (Admin / Manager only).
   */
  list: async (): Promise<PopupAdvertisement[]> => {
    const response = await apiGet<{ popups: PopupAdvertisement[] }>("/api/popups");
    return response.popups || [];
  },

  /**
   * Fetch currently active, non-dismissed popups targeting the current user's role.
   */
  active: async (): Promise<PopupAdvertisement[]> => {
    const response = await apiGet<{ popups: PopupAdvertisement[] }>("/api/popups/active");
    return response.popups || [];
  },

  /**
   * Dismiss a popup so it is not shown to the current user again.
   */
  dismiss: async (id: string): Promise<PopupAdvertisement> => {
    return await apiPost<PopupAdvertisement>(`/api/popups/${id}/dismiss`);
  },

  /**
   * Create a new popup campaign (Admin only).
   */
  create: async (payload: CreatePopupPayload): Promise<PopupAdvertisement> => {
    return await apiPost<PopupAdvertisement>("/api/popups", payload);
  },

  /**
   * Update advertisement campaign parameters (Admin only).
   */
  update: async (id: string, updates: Partial<CreatePopupPayload>): Promise<PopupAdvertisement> => {
    return await apiPut<PopupAdvertisement>(`/api/popups/${id}`, updates);
  },

  /**
   * Delete an advertisement campaign (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/popups/${id}`);
  },
};
