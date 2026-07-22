"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  studentsApi,
  type CreateNotePayload,
  type UpdateNotePayload,
  type CreateDexterityPayload,
  type UpdateDexterityPayload,
} from "@/lib/api/students";
import { queryKeys } from "@/lib/api/queryKeys";
import type { StudentNote, ManualDexterity } from "@/lib/types";

export function useStudentNotes(studentId: string) {
  return useQuery<StudentNote[]>({
    queryKey: queryKeys.students.notes(studentId),
    queryFn: () => studentsApi.listNotes(studentId),
    enabled: !!studentId,
  });
}

export function useCreateStudentNote(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNotePayload) => studentsApi.createNote(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.notes(studentId) });
    },
  });
}

export function useUpdateStudentNote(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: UpdateNotePayload }) =>
      studentsApi.updateNote(studentId, noteId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.notes(studentId) });
    },
  });
}

export function useDeleteStudentNote(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => studentsApi.deleteNote(studentId, noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.notes(studentId) });
    },
  });
}

export function useStudentDexterity(studentId: string) {
  return useQuery<ManualDexterity[]>({
    queryKey: queryKeys.students.dexterity(studentId),
    queryFn: () => studentsApi.listDexterity(studentId),
    enabled: !!studentId,
  });
}

export function useCreateStudentDexterity(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDexterityPayload) =>
      studentsApi.createDexterity(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.dexterity(studentId) });
    },
  });
}

export function useUpdateStudentDexterity(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: UpdateDexterityPayload }) =>
      studentsApi.updateDexterity(studentId, itemId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.dexterity(studentId) });
    },
  });
}

export function useDeleteStudentDexterity(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => studentsApi.deleteDexterity(studentId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.dexterity(studentId) });
    },
  });
}
