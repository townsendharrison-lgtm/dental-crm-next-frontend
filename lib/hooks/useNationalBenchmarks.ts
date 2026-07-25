"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  nationalBenchmarksApi,
  type NationalBenchmark,
  type NationalBenchmarkPayload,
} from "@/lib/api/nationalBenchmarks";
import { queryKeys } from "@/lib/api/queryKeys";

export function useNationalBenchmarks() {
  return useQuery<NationalBenchmark[]>({
    queryKey: queryKeys.nationalBenchmarks.all(),
    queryFn: nationalBenchmarksApi.list,
    staleTime: 60_000,
  });
}

export function useCreateNationalBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NationalBenchmarkPayload) => nationalBenchmarksApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.nationalBenchmarks.all() });
    },
  });
}

export function useUpdateNationalBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<NationalBenchmarkPayload> }) =>
      nationalBenchmarksApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.nationalBenchmarks.all() });
    },
  });
}

export function useDeleteNationalBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nationalBenchmarksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.nationalBenchmarks.all() });
    },
  });
}
