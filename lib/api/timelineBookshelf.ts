import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  TimelineBookshelfItem,
  TimelineCardColors,
  TimelineCardType,
  TimelineResourceLink,
} from "@/lib/types";
import { DEFAULT_TIMELINE_CARD_COLORS } from "@/lib/types";

export interface CreateBookshelfPayload {
  title: string;
  cardType?: TimelineCardType;
  description?: string;
  resourceLinks?: TimelineResourceLink[];
  sortOrder?: number;
  scope?: "GLOBAL" | "MENTOR";
}

export interface UpdateBookshelfPayload {
  title?: string;
  cardType?: TimelineCardType;
  description?: string;
  resourceLinks?: TimelineResourceLink[];
  sortOrder?: number;
}

export const timelineBookshelfApi = {
  list: async (includeMentor = false): Promise<{
    items: TimelineBookshelfItem[];
    cardColors: TimelineCardColors;
  }> => {
    const q = includeMentor ? "?includeMentor=true" : "";
    const data = await apiGet<{
      items: TimelineBookshelfItem[];
      cardColors?: TimelineCardColors;
    }>(`/api/timeline-bookshelf${q}`);
    return {
      items: data?.items || [],
      cardColors: data?.cardColors || DEFAULT_TIMELINE_CARD_COLORS,
    };
  },

  create: async (payload: CreateBookshelfPayload): Promise<TimelineBookshelfItem> => {
    return await apiPost<TimelineBookshelfItem>("/api/timeline-bookshelf", payload);
  },

  update: async (id: string, updates: UpdateBookshelfPayload): Promise<TimelineBookshelfItem> => {
    return await apiPut<TimelineBookshelfItem>(`/api/timeline-bookshelf/${id}`, updates);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/timeline-bookshelf/${id}`);
  },
};
