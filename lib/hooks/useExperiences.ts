"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { experiencesApi, type CreateExperiencePayload, type CreateSessionPayload } from "@/lib/api/experiences";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Experience, ExperienceSession } from "@/lib/types";

export function useExperiences(studentId?: string) {
  return useQuery<Experience[]>({
    queryKey: queryKeys.experiences.all(studentId),
    queryFn: () => experiencesApi.list(studentId),
  });
}

export function useExperience(id: string) {
  return useQuery<Experience>({
    queryKey: queryKeys.experiences.detail(id),
    queryFn: () => experiencesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExperiencePayload) => experiencesApi.create(payload),
    onSuccess: (newExp, vars) => {
      const studentId = newExp.student_id || newExp.studentId || vars.studentId;
      qc.invalidateQueries({ queryKey: queryKeys.experiences.all(studentId) });
      qc.invalidateQueries({ queryKey: ["experiences"] });
    },
  });
}

export function useUpdateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateExperiencePayload> }) =>
      experiencesApi.update(id, updates),
    onSuccess: (updated, vars) => {
      const studentId = updated.student_id || updated.studentId || vars.updates.studentId;
      qc.invalidateQueries({ queryKey: queryKeys.experiences.all(studentId) });
      qc.invalidateQueries({ queryKey: queryKeys.experiences.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["experiences"] });
    },
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; studentId: string }) => experiencesApi.remove(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.experiences.all(vars.studentId) });
      qc.invalidateQueries({ queryKey: ["experiences"] });
    },
  });
}

export function useCreateExperienceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experienceId, payload }: { experienceId: string; payload: CreateSessionPayload }) =>
      experiencesApi.createSession(experienceId, payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.experiences.detail(vars.experienceId) });
      qc.invalidateQueries({ queryKey: ["experiences"] });
    },
  });
}

export function useUpdateExperienceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      experienceId,
      sessionId,
      updates,
    }: {
      experienceId: string;
      sessionId: string;
      updates: Partial<CreateSessionPayload>;
    }) => experiencesApi.updateSession(experienceId, sessionId, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.experiences.detail(vars.experienceId) });
      qc.invalidateQueries({ queryKey: ["experiences"] });
    },
  });
}

export function useDeleteExperienceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experienceId, sessionId }: { experienceId: string; sessionId: string }) =>
      experiencesApi.removeSession(experienceId, sessionId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.experiences.detail(vars.experienceId) });
      qc.invalidateQueries({ queryKey: ["experiences"] });
    },
  });
}
