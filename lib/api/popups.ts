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

type RawPopup = PopupAdvertisement & Record<string, unknown>;

export function normalizePopup(raw: RawPopup): PopupAdvertisement {
  const imageUrl = (raw.imageUrl ?? raw.image_url ?? null) as string | null;
  const ctaText = (raw.ctaText ?? raw.cta_text ?? null) as string | null;
  const ctaUrl = (raw.ctaUrl ?? raw.cta_url ?? null) as string | null;
  const backgroundColor = (raw.backgroundColor ?? raw.background_color ?? null) as string | null;
  const textColor = (raw.textColor ?? raw.text_color ?? null) as string | null;
  const targetRole = (raw.targetRole ??
    raw.target_role ??
    "BOTH") as PopupAdvertisement["targetRole"];
  const startDate = String(raw.startDate ?? raw.start_date ?? "");
  const endDate = String(raw.endDate ?? raw.end_date ?? "");
  const isActive =
    raw.isActive !== undefined
      ? Boolean(raw.isActive)
      : raw.is_active !== undefined
        ? Boolean(raw.is_active)
        : true;
  const createdBy = (raw.createdBy ?? raw.created_by ?? null) as string | null;
  const dismissedBy = (raw.dismissedBy ?? raw.dismissed_by ?? []) as string[];
  const createdAt = String(raw.createdAt ?? raw.created_at ?? "");

  return {
    ...raw,
    id: raw.id,
    title: raw.title,
    message: raw.message,
    image_url: imageUrl,
    imageUrl,
    cta_text: ctaText,
    ctaText,
    cta_url: ctaUrl,
    ctaUrl,
    background_color: backgroundColor,
    backgroundColor,
    text_color: textColor,
    textColor,
    target_role: targetRole,
    targetRole,
    start_date: startDate,
    startDate,
    end_date: endDate,
    endDate,
    is_active: isActive,
    isActive,
    created_by: createdBy,
    createdBy,
    dismissed_by: dismissedBy,
    dismissedBy,
    created_at: createdAt || raw.created_at,
    createdAt: createdAt || undefined,
    updated_at: raw.updated_at,
  };
}

export const popupsApi = {
  /**
   * Fetch all popup advertisement campaigns (Admin / Manager only).
   */
  list: async (): Promise<PopupAdvertisement[]> => {
    const response = await apiGet<{ popups: PopupAdvertisement[] }>("/api/popups");
    return (response.popups || []).map((p) => normalizePopup(p as RawPopup));
  },

  /**
   * Fetch currently active, non-dismissed popups targeting the current user's role.
   */
  active: async (): Promise<PopupAdvertisement[]> => {
    const response = await apiGet<{ popups: PopupAdvertisement[] }>("/api/popups/active");
    return (response.popups || []).map((p) => normalizePopup(p as RawPopup));
  },

  /**
   * Dismiss a popup so it is not shown to the current user again.
   */
  dismiss: async (id: string): Promise<PopupAdvertisement> => {
    const popup = await apiPost<PopupAdvertisement>(`/api/popups/${id}/dismiss`);
    return normalizePopup(popup as RawPopup);
  },

  /**
   * Create a new popup campaign (Admin only).
   */
  create: async (payload: CreatePopupPayload): Promise<PopupAdvertisement> => {
    const popup = await apiPost<PopupAdvertisement>("/api/popups", payload);
    return normalizePopup(popup as RawPopup);
  },

  /**
   * Update advertisement campaign parameters (Admin only).
   */
  update: async (id: string, updates: Partial<CreatePopupPayload>): Promise<PopupAdvertisement> => {
    const popup = await apiPut<PopupAdvertisement>(`/api/popups/${id}`, updates);
    return normalizePopup(popup as RawPopup);
  },

  /**
   * Delete an advertisement campaign (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/popups/${id}`);
  },
};
