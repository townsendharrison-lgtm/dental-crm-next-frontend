"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentSchoolsApi, type CreateStudentSchoolPayload } from "@/lib/api/studentSchools";
import { schoolsApi } from "@/lib/api/schools";
import { queryKeys } from "@/lib/api/queryKeys";
import type { School, StudentSchool } from "@/lib/types";
import {
  mapStudentSchoolToHubSchool,
  schoolEnsurePayloadFromHub,
} from "@/lib/utils/schoolApplications";

export function useStudentSchools(studentId?: string) {
  return useQuery<School[]>({
    queryKey: queryKeys.studentSchools.all(studentId),
    queryFn: async () => {
      const rows = await studentSchoolsApi.list(studentId);
      return (rows || []).map((row) => mapStudentSchoolToHubSchool(row as StudentSchool));
    },
    enabled: !!studentId,
  });
}

export function useAddStudentSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      school,
      category,
    }: {
      studentId: string;
      school: School;
      category: string;
    }) => {
      const ensured = await schoolsApi.ensure(schoolEnsurePayloadFromHub(school));
      const schoolId = ensured.id;
      const created = await studentSchoolsApi.create({
        studentId,
        schoolId,
        category: category || "Target",
        status: "Interested",
        notes: typeof school.notes === "string" ? school.notes : undefined,
      });
      return mapStudentSchoolToHubSchool({
        ...created,
        school: created.school || ensured,
      } as StudentSchool);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.studentSchools.all(vars.studentId) });
    },
  });
}

export function useUpdateStudentSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      studentId,
      updates,
    }: {
      id: string;
      studentId: string;
      updates: Partial<CreateStudentSchoolPayload>;
    }) => studentSchoolsApi.update(id, updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.studentSchools.all(vars.studentId) });
    },
  });
}

export function useRemoveStudentSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; studentId: string }) => studentSchoolsApi.remove(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.studentSchools.all(vars.studentId) });
    },
  });
}
