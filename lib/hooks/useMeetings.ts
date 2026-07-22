"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi, type CreateMeetingPayload } from "@/lib/api/meetings";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Meeting } from "@/lib/types";

export function useMeetings() {
  return useQuery<Meeting[]>({
    queryKey: queryKeys.meetings.all(),
    queryFn: meetingsApi.list,
  });
}

export function useCalendarEvents(start?: string, end?: string) {
  return useQuery({
    queryKey: queryKeys.meetings.calendar(start, end),
    queryFn: () => meetingsApi.calendar(start, end),
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingPayload) => meetingsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all() });
      qc.invalidateQueries({ queryKey: ["meetings", "calendar"] });
    },
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateMeetingPayload & { completed?: boolean }> }) =>
      meetingsApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all() });
      qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["meetings", "calendar"] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meetingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all() });
      qc.invalidateQueries({ queryKey: ["meetings", "calendar"] });
    },
  });
}

export function useAttendMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meetingsApi.attend(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all() });
      qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["meetings", "calendar"] });
    },
  });
}

export function useMeetingInviteDirectory(enabled = true) {
  return useQuery({
    queryKey: ["meetings", "invite-directory"],
    queryFn: () => meetingsApi.inviteDirectory(),
    enabled,
  });
}
