"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolsApi, type CreateSchoolPayload } from "@/lib/api/schools";
import type { School } from "@/lib/types";

export function useSchools(search?: string) {
  return useQuery<School[]>({
    queryKey: ["schools", "list", { search }],
    queryFn: () => schoolsApi.list(search),
  });
}

export function useSchool(id: string) {
  return useQuery<School>({
    queryKey: ["schools", "detail", id],
    queryFn: () => schoolsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSchoolPayload) => schoolsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

export function useUpdateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateSchoolPayload> }) =>
      schoolsApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["schools", "detail", updated.id] });
    },
  });
}

export function useDeleteSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schoolsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}
