"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi, type UpdateDocumentPayload } from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/queryKeys";
import type { StudentDocument, DocumentType } from "@/lib/types";

export function useDocuments(studentId?: string) {
  return useQuery<StudentDocument[]>({
    queryKey: queryKeys.documents.all(studentId),
    queryFn: () => documentsApi.list(studentId),
  });
}

export function useDocument(id: string) {
  return useQuery<StudentDocument & { downloadUrl: string | null }>({
    queryKey: queryKeys.documents.detail(id),
    queryFn: () => documentsApi.get(id),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      title,
      type,
      studentId,
    }: {
      file: File;
      title: string;
      type: DocumentType;
      studentId?: string;
    }) => documentsApi.upload(file, title, type, studentId),
    onSuccess: (newDoc) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all(newDoc.student_id) });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDocumentPayload }) =>
      documentsApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all(updated.student_id) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.detail(updated.id) });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) => documentsApi.remove(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all(vars.studentId) });
    },
  });
}
