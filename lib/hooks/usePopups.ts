"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { popupsApi, type CreatePopupPayload } from "@/lib/api/popups";
import { queryKeys } from "@/lib/api/queryKeys";
import type { PopupAdvertisement } from "@/lib/types";

export function usePopups() {
  return useQuery<PopupAdvertisement[]>({
    queryKey: queryKeys.popups.all(),
    queryFn: popupsApi.list,
  });
}

export function useActivePopups(enabled = true) {
  return useQuery<PopupAdvertisement[]>({
    queryKey: ["popups", "active"],
    queryFn: popupsApi.active,
    enabled,
  });
}

export function useCreatePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePopupPayload) => popupsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.popups.all() });
      qc.invalidateQueries({ queryKey: ["popups", "active"] });
    },
  });
}

export function useUpdatePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreatePopupPayload> }) =>
      popupsApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.popups.all() });
      qc.invalidateQueries({ queryKey: ["popups", "active"] });
    },
  });
}

export function useDeletePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => popupsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.popups.all() });
      qc.invalidateQueries({ queryKey: ["popups", "active"] });
    },
  });
}

export function useDismissPopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => popupsApi.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["popups", "active"] });
    },
  });
}
