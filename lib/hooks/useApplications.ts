"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, type CreateApplicationPayload } from "@/lib/api/applications";
import { schoolsApi } from "@/lib/api/schools";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Application, ApplicationStatus, School } from "@/lib/types";
import {
  normalizeApplication,
  schoolEnsurePayloadFromHub,
} from "@/lib/utils/schoolApplications";

export function useApplications(studentId?: string) {
  return useQuery<Application[]>({
    queryKey: queryKeys.applications.all(studentId),
    queryFn: async () => {
      const rows = await applicationsApi.list(studentId);
      return (rows || []).map((row) => normalizeApplication(row));
    },
    enabled: !!studentId,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      studentId: string;
      schoolName: string;
      school?: Partial<School>;
      schoolId?: string;
      status?: ApplicationStatus;
      appliedDate?: string | null;
      interviewDate?: string | null;
      decisionDate?: string | null;
      notes?: string | null;
    }) => {
      let schoolId = payload.schoolId;
      if (!schoolId) {
        const ensured = await schoolsApi.ensure({
          name: payload.schoolName,
          location: payload.school?.location || "Unknown",
          ...schoolEnsurePayloadFromHub({
            id: "",
            name: payload.schoolName,
            location: payload.school?.location || "Unknown",
            ...(payload.school || {}),
          }),
        });
        schoolId = ensured.id;
      }
      const created = await applicationsApi.create({
        studentId: payload.studentId,
        schoolId,
        status: payload.status,
        appliedDate: payload.appliedDate,
        interviewDate: payload.interviewDate,
        decisionDate: payload.decisionDate,
        notes: payload.notes,
      });
      return normalizeApplication(created);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all(vars.studentId) });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      studentId,
      updates,
    }: {
      id: string;
      studentId: string;
      updates: Partial<CreateApplicationPayload>;
    }) => applicationsApi.update(id, updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all(vars.studentId) });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; studentId: string }) => applicationsApi.remove(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all(vars.studentId) });
    },
  });
}
