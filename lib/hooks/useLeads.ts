"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { leadsApi, type LeadInput } from "@/lib/api/leads";
import { usersApi, type SetterGoalInput } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/queryKeys";
import { useRole } from "./useRole";
import type { Lead, SetterUser } from "@/lib/types";

/**
 * Data layer for the Lead Management / Setter Dashboard.
 * Mirrors the old frontend's fetch logic with React Query caching,
 * optimistic updates, and automatic refetch on error.
 */

export function useLeads() {
  const { actualRole } = useRole();
  const enabled = !!actualRole;
  return useQuery<Lead[]>({
    queryKey: queryKeys.leads.all(),
    queryFn: leadsApi.list,
    enabled,
  });
}

export function useSetters() {
  const { actualRole } = useRole();
  const isManager = actualRole === "ADMIN" || actualRole === "MENTOR_MANAGER";
  const isSetter = actualRole === "SETTER";

  return useQuery<SetterUser[]>({
    queryKey: queryKeys.setters.all(),
    enabled: isManager || isSetter,
    queryFn: async () => {
      if (isManager) return usersApi.listSetters();
      // SETTER: only their own profile
      const me = await usersApi.profile();
      return [me];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadInput) => leadsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LeadInput }) =>
      leadsApi.update(id, updates),
    // Optimistic update for instant UI feedback (matches old app behaviour).
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.all() });
      const previous = qc.getQueryData<Lead[]>(queryKeys.leads.all());
      qc.setQueryData<Lead[]>(queryKeys.leads.all(), (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, ...updates } : l)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.leads.all(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.all() });
      const previous = qc.getQueryData<Lead[]>(queryKeys.leads.all());
      qc.setQueryData<Lead[]>(queryKeys.leads.all(), (old) =>
        (old ?? []).filter((l) => l.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.leads.all(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
  });
}

export function useDeleteSetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (setterId: string) => usersApi.remove(setterId),
    onMutate: async (setterId) => {
      await qc.cancelQueries({ queryKey: queryKeys.setters.all() });
      const previous = qc.getQueryData<SetterUser[]>(queryKeys.setters.all());
      qc.setQueryData<SetterUser[]>(queryKeys.setters.all(), (old) =>
        (old ?? []).filter((s) => s.id !== setterId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.setters.all(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.setters.all() });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
  });
}

export function useUpdateSetterGoal() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  return useMutation({
    mutationFn: ({ setterId, updates }: { setterId: string; updates: SetterGoalInput }) =>
      usersApi.updateGoal(setterId, updates, isAdmin),
    onMutate: async ({ setterId, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.setters.all() });
      const previous = qc.getQueryData<SetterUser[]>(queryKeys.setters.all());
      qc.setQueryData<SetterUser[]>(queryKeys.setters.all(), (old) =>
        (old ?? []).map((s) => (s.id === setterId ? { ...s, ...updates } : s)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.setters.all(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.setters.all() });
    },
  });
}
