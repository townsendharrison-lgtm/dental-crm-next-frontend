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
      qc.invalidateQueries({ queryKey: ["notifications"] });
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
      qc.invalidateQueries({ queryKey: ["notifications"] });
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

function invalidateMeeting(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: queryKeys.meetings.all() });
  qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(id) });
  qc.invalidateQueries({ queryKey: ["meetings", "calendar"] });
}

export function useProvisionGoogleMeet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meetingsApi.provisionGoogleMeet(id),
    onSuccess: (updated) => invalidateMeeting(qc, updated.id),
  });
}

export function useSyncGoogleMeet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      meetingsApi.syncGoogleMeet(id, force),
    onSuccess: ({ meeting }) => {
      invalidateMeeting(qc, meeting.id);
      qc.invalidateQueries({ queryKey: ["actionItems"] });
    },
  });
}

export function useGoogleMeetStatus(enabled = true) {
  return useQuery({
    queryKey: ["meetings", "google-meet-status"],
    queryFn: () => meetingsApi.googleMeetStatus(),
    enabled,
    staleTime: 60_000,
  });
}

export function useGoogleMeetDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingsApi.googleMeetDisconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings", "google-meet-status"] }),
  });
}

export function useMeetingInviteDirectory(enabled = true) {
  return useQuery({
    queryKey: ["meetings", "invite-directory"],
    queryFn: () => meetingsApi.inviteDirectory(),
    enabled,
  });
}
