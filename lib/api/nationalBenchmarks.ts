import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export interface NationalBenchmark {
  id: string;
  key: string;
  label: string;
  benchmark: number;
  unit: string;
  description: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NationalBenchmarkPayload {
  key: string;
  label: string;
  benchmark: number;
  unit?: string;
  description?: string;
  sortOrder?: number;
}

export const nationalBenchmarksApi = {
  list: async (): Promise<NationalBenchmark[]> => {
    const response = await apiGet<{ benchmarks: NationalBenchmark[] }>("/api/national-benchmarks");
    return response.benchmarks || [];
  },

  create: async (payload: NationalBenchmarkPayload): Promise<NationalBenchmark> => {
    return await apiPost<NationalBenchmark>("/api/national-benchmarks", payload);
  },

  update: async (
    id: string,
    updates: Partial<NationalBenchmarkPayload>,
  ): Promise<NationalBenchmark> => {
    return await apiPut<NationalBenchmark>(`/api/national-benchmarks/${id}`, updates);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/national-benchmarks/${id}`);
  },

  reorder: async (orderedIds: string[]): Promise<NationalBenchmark[]> => {
    const response = await apiPut<{ benchmarks: NationalBenchmark[] }>(
      "/api/national-benchmarks/reorder/bulk",
      { orderedIds },
    );
    return response.benchmarks || [];
  },
};
