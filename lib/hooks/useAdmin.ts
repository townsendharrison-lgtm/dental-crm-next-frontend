"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Invitation, ManagedUser, UserRole } from "@/lib/types";

/** Fetch all users (admin only). */
export function useAdminUsers(enabled = true) {
  return useQuery<ManagedUser[]>({
    queryKey: queryKeys.admin.users(),
    queryFn: adminApi.listUsers,
    enabled,
  });
}

/** Platform analytics for Global Data page. */
export function useAdminAnalytics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.analytics(),
    queryFn: adminApi.getAnalytics,
    enabled,
    staleTime: 60_000,
  });
}

/** Fetch all invitations (admin only). */
export function useAdminInvitations() {
  return useQuery<Invitation[]>({
    queryKey: queryKeys.admin.invitations(),
    queryFn: adminApi.listInvitations,
  });
}

/** Invite a new user. */
export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.invite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.invitations() });
    },
  });
}

/** Delete an invitation. */
export function useDeleteInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteInvitation,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.admin.invitations() });
      const previous = qc.getQueryData<Invitation[]>(queryKeys.admin.invitations());
      qc.setQueryData<Invitation[]>(queryKeys.admin.invitations(), (old) =>
        (old ?? []).filter((i) => i.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.admin.invitations(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.invitations() });
    },
  });
}

/** Resend an invitation. */
export function useResendInvitation() {
  return useMutation({
    mutationFn: adminApi.resendInvitation,
  });
}

/** Delete a user. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteUser,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.admin.users() });
      const previous = qc.getQueryData<ManagedUser[]>(queryKeys.admin.users());
      qc.setQueryData<ManagedUser[]>(queryKeys.admin.users(), (old) =>
        (old ?? []).filter((u) => u.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.admin.users(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}

/** Bulk delete student accounts older than N years. */
export function useBulkDeleteOldStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (olderThanYears: number) => adminApi.bulkDeleteOldStudents(olderThanYears),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}

/** Update a user's role. */
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateRole(userId, role),
    onMutate: async ({ userId, role }) => {
      await qc.cancelQueries({ queryKey: queryKeys.admin.users() });
      const previous = qc.getQueryData<ManagedUser[]>(queryKeys.admin.users());
      qc.setQueryData<ManagedUser[]>(queryKeys.admin.users(), (old) =>
        (old ?? []).map((u) => (u.id === userId ? { ...u, role: role as UserRole } : u)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.admin.users(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
