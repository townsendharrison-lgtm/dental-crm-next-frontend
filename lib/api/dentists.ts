import { apiGet, apiPost } from "./client";
import type { Dentist } from "@/lib/types";

export interface SearchDentistsParams {
  zip?: string;
  city?: string;
  state?: string;
  name?: string;
  specialty?: string;
  sortBy?: "nearest" | "rating" | "friendly" | "alpha";
  page?: number;
  limit?: number;
  userLat?: number;
  userLng?: number;
}

export interface SearchDentistsResponse {
  results: Dentist[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SubmitShadowReportInput {
  npi: string;
  allowed: boolean;
  rating: number;
}

export const dentistsApi = {
  /** Query dentists registry (proxied backend route) with distance metrics. */
  searchDentists: async (params: SearchDentistsParams): Promise<SearchDentistsResponse> => {
    return apiGet<SearchDentistsResponse>("/api/dentists", { params });
  },

  /** Submit a shadowing report (allowed/rating) for a dentist (rate-limited by IP+NPI). */
  submitShadowReport: async (body: SubmitShadowReportInput): Promise<{ success: boolean }> => {
    return apiPost<{ success: boolean }>("/api/shadow-reports", body);
  },

  /** Batch-fetch aggregated shadow stats for a list of NPIs. */
  getShadowStats: async (npis: string[]): Promise<Record<string, { allowedPercentage: number; avgRating: number; totalReports: number }>> => {
    if (npis.length === 0) return {};
    return apiGet<Record<string, { allowedPercentage: number; avgRating: number; totalReports: number }>>("/api/shadow-reports/stats", {
      params: { npis: npis.join(",") },
    });
  },
};
