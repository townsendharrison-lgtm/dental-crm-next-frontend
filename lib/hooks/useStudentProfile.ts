"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "@/lib/api/students";
import { queryKeys } from "@/lib/api/queryKeys";
import { normalizeStudent, normalizeStudents } from "@/lib/utils/normalizeStudent";
import type { Student, StudentProfile } from "@/lib/types";

export function useStudents() {
  return useQuery<Student[]>({
    queryKey: queryKeys.students.all(),
    queryFn: async () => normalizeStudents(await studentsApi.list()),
  });
}

export function useStudent(id: string) {
  return useQuery<Student>({
    queryKey: queryKeys.students.detail(id),
    queryFn: async () => normalizeStudent(await studentsApi.get(id)),
    enabled: !!id,
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Student> | Partial<StudentProfile & { name?: string; avatar?: string }>;
    }) => studentsApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
      qc.invalidateQueries({ queryKey: queryKeys.students.detail(updated.id) });
      qc.invalidateQueries({ queryKey: queryKeys.students.datHistory(updated.id) });
      qc.invalidateQueries({ queryKey: queryKeys.students.strengthHistory(updated.id) });
    },
  });
}

export function useStudentDatHistory(studentId: string) {
  return useQuery({
    queryKey: queryKeys.students.datHistory(studentId),
    queryFn: () => studentsApi.datHistory(studentId),
    enabled: !!studentId,
  });
}

export function useStudentStrengthHistory(studentId: string) {
  return useQuery({
    queryKey: queryKeys.students.strengthHistory(studentId),
    queryFn: () => studentsApi.strengthHistory(studentId),
    enabled: !!studentId,
  });
}

export function useStudentStrengthPercentile(studentId: string) {
  return useQuery({
    queryKey: queryKeys.students.strengthPercentile(studentId),
    queryFn: () => studentsApi.strengthPercentile(studentId),
    enabled: !!studentId,
    staleTime: 60_000,
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}
