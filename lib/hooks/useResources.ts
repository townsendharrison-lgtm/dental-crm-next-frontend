"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourcesApi, type CreateResourcePayload } from "@/lib/api/resources";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Resource } from "@/lib/types";

export function useResources(enabled = true) {
  return useQuery<Resource[]>({
    queryKey: queryKeys.resources.all(),
    queryFn: resourcesApi.list,
    enabled,
  });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateResourcePayload) => resourcesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.resources.all() });
    },
  });
}

export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateResourcePayload> }) =>
      resourcesApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.resources.all() });
    },
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourcesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.resources.all() });
    },
  });
}
