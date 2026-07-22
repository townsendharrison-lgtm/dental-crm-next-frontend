import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Resource } from "@/lib/types";

export interface CreateResourcePayload {
  title: string;
  url: string;
  estimatedTime?: string;
  category?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

type RawResource = Resource & Record<string, unknown>;

export function normalizeResource(raw: RawResource): Resource {
  const estimatedTime = String(raw.estimatedTime ?? raw.estimated_time ?? "5m");
  const sortOrder =
    typeof raw.sortOrder === "number"
      ? raw.sortOrder
      : typeof raw.sort_order === "number"
        ? raw.sort_order
        : 0;
  const isActive =
    raw.isActive !== undefined
      ? Boolean(raw.isActive)
      : raw.is_active !== undefined
        ? Boolean(raw.is_active)
        : true;

  return {
    ...raw,
    id: raw.id,
    title: raw.title,
    url: raw.url,
    category: raw.category || "General",
    icon: raw.icon || "BookOpen",
    estimatedTime,
    estimated_time: estimatedTime,
    sortOrder,
    sort_order: sortOrder,
    isActive,
    is_active: isActive,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    created_at: raw.created_at as string | undefined,
    updatedAt: (raw.updatedAt ?? raw.updated_at) as string | undefined,
    updated_at: raw.updated_at as string | undefined,
  };
}

export const resourcesApi = {
  list: async (): Promise<Resource[]> => {
    const response = await apiGet<{ resources: Resource[] }>("/api/resources");
    return (response.resources || []).map((r) => normalizeResource(r as RawResource));
  },

  create: async (payload: CreateResourcePayload): Promise<Resource> => {
    const resource = await apiPost<Resource>("/api/resources", payload);
    return normalizeResource(resource as RawResource);
  },

  update: async (id: string, updates: Partial<CreateResourcePayload>): Promise<Resource> => {
    const resource = await apiPut<Resource>(`/api/resources/${id}`, updates);
    return normalizeResource(resource as RawResource);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/resources/${id}`);
  },
};
