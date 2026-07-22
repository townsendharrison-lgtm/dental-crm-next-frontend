"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mentorsApi,
  type AssignMentorPayload,
  type TransferMentorPayload,
  type AcceptAssignmentPayload,
} from "@/lib/api/mentors";
import type { Mentor, Student, StudentAssignment } from "@/lib/types";
import { normalizeMentors, normalizeAssignments } from "@/lib/utils/normalizeMentor";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";

export function useMentors(enabled = true) {
  return useQuery<Mentor[]>({
    queryKey: ["mentors", "all"],
    queryFn: async () => normalizeMentors(await mentorsApi.list()),
    enabled,
  });
}

export function useMentor(id: string) {
  return useQuery<Mentor>({
    queryKey: ["mentors", "detail", id],
    queryFn: async () => normalizeMentors([await mentorsApi.get(id)])[0],
    enabled: !!id,
  });
}

export function useMentorStudents(mentorId: string) {
  return useQuery<Student[]>({
    queryKey: ["mentors", "students", mentorId],
    queryFn: async () => normalizeStudents(await mentorsApi.listStudents(mentorId)),
    enabled: !!mentorId,
  });
}

export function useMentorAssignments(enabled = true) {
  return useQuery<StudentAssignment[]>({
    queryKey: ["mentors", "assignments"],
    queryFn: async () => normalizeAssignments(await mentorsApi.listAssignments()),
    enabled,
  });
}

export function useMyPendingAssignments(enabled = true) {
  return useQuery<StudentAssignment[]>({
    queryKey: ["mentors", "assignments", "pending"],
    queryFn: async () => normalizeAssignments(await mentorsApi.listPendingAssignments()),
    enabled,
  });
}

function invalidateAssignmentCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["mentors"] });
  qc.invalidateQueries({ queryKey: ["students"] });
  qc.invalidateQueries({ queryKey: ["mentors", "assignments"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
}

export function useAssignMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignMentorPayload) => mentorsApi.assign(payload),
    onSuccess: () => invalidateAssignmentCaches(qc),
  });
}

export function useTransferMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferMentorPayload) => mentorsApi.transfer(payload),
    onSuccess: () => invalidateAssignmentCaches(qc),
  });
}

export function useUnassignMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => mentorsApi.unassign(studentId),
    onSuccess: () => invalidateAssignmentCaches(qc),
  });
}

export function useAcceptAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AcceptAssignmentPayload) => mentorsApi.acceptAssignment(payload),
    onSuccess: () => invalidateAssignmentCaches(qc),
  });
}

export function useDeclineAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => mentorsApi.declineAssignment(assignmentId),
    onSuccess: () => invalidateAssignmentCaches(qc),
  });
}

export function useUpdateMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Mentor["profile"] & { name?: string; avatar?: string }>;
    }) => mentorsApi.update(id, updates as any),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["mentors"] });
      qc.invalidateQueries({ queryKey: ["mentors", "detail", updated.id] });
    },
  });
}
