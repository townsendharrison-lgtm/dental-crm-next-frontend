import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Badge, StudentBadge } from "@/lib/types";

export interface CreateBadgePayload {
  name: string;
  description: string;
  icon: string;
  color: string;
  benchmarkType: "PROGRESS" | "STRENGTH_SCORE" | "DAT" | "TASKS_COMPLETED" | "MEETINGS_ATTENDED";
  benchmarkValue: number;
}

export interface EvaluationResponse {
  newlyAwarded: StudentBadge[];
  totalEarned: StudentBadge[];
}

type RawBadge = Badge & Record<string, unknown>;

export function normalizeBadge(raw: RawBadge): Badge {
  const benchmarkType = (raw.benchmarkType ??
    raw.benchmark_type ??
    "PROGRESS") as Badge["benchmark_type"];
  const benchmarkValue = Number(raw.benchmarkValue ?? raw.benchmark_value ?? 0);

  return {
    ...raw,
    id: raw.id,
    name: raw.name,
    description: raw.description,
    icon: raw.icon,
    color: raw.color,
    benchmark_type: benchmarkType,
    benchmarkType,
    benchmark_value: benchmarkValue,
    benchmarkValue,
    created_at: String(raw.created_at ?? raw.createdAt ?? ""),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

export const badgesApi = {
  list: async (): Promise<Badge[]> => {
    const response = await apiGet<{ badges: Badge[] }>("/api/badges");
    return (response.badges || []).map((b) => normalizeBadge(b as RawBadge));
  },

  create: async (payload: CreateBadgePayload): Promise<Badge> => {
    const badge = await apiPost<Badge>("/api/badges", payload);
    return normalizeBadge(badge as RawBadge);
  },

  update: async (id: string, updates: Partial<CreateBadgePayload>): Promise<Badge> => {
    const badge = await apiPut<Badge>(`/api/badges/${id}`, updates);
    return normalizeBadge(badge as RawBadge);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/badges/${id}`);
  },

  getEarned: async (studentId: string): Promise<StudentBadge[]> => {
    const response = await apiGet<{ badges: StudentBadge[] }>(`/api/badges/student/${studentId}`);
    return response.badges || [];
  },

  evaluate: async (studentId: string): Promise<EvaluationResponse> => {
    return await apiPost<EvaluationResponse>(`/api/badges/evaluate/${studentId}`);
  },
};
