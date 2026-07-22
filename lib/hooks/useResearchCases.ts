"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { researchCasesApi, type ResearchCasesFilters, type CreateResearchCasePayload } from "@/lib/api/researchCases";
import { queryKeys } from "@/lib/api/queryKeys";
import type { ResearchCase } from "@/lib/types";

export function useResearchCases(filters: ResearchCasesFilters = {}) {
  return useQuery<ResearchCase[]>({
    queryKey: queryKeys.researchCases.all(filters),
    queryFn: () => researchCasesApi.list(filters),
  });
}

export function useCreateResearchCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateResearchCasePayload) => researchCasesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["researchCases"] });
    },
  });
}

export function useUpdateResearchCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateResearchCasePayload> }) =>
      researchCasesApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["researchCases"] });
    },
  });
}

export function useDeleteResearchCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => researchCasesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["researchCases"] });
    },
  });
}
