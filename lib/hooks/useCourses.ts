"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  coursesApi,
  type CreateCoursePayload,
  type CreateModulePayload,
} from "@/lib/api/courses";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Course, CourseSubmission, CourseSubmissionStatus } from "@/lib/types";

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: queryKeys.courses.all(),
    queryFn: () => coursesApi.list(),
  });
}

export function useCourseSubmissions(status?: string) {
  return useQuery<CourseSubmission[]>({
    queryKey: queryKeys.courses.submissions(status),
    queryFn: () => coursesApi.listSubmissions(status),
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCoursePayload) => coursesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateCoursePayload> }) =>
      coursesApi.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coursesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useCreateCourseModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, payload }: { courseId: string; payload: CreateModulePayload }) =>
      coursesApi.createModule(courseId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useUpdateCourseModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      updates,
    }: {
      moduleId: string;
      updates: Partial<CreateModulePayload>;
    }) => coursesApi.updateModule(moduleId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useDeleteCourseModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) => coursesApi.removeModule(moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useReviewCourseSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reviewerNotes,
    }: {
      id: string;
      status: CourseSubmissionStatus;
      reviewerNotes?: string;
    }) => coursesApi.reviewSubmission(id, { status, reviewerNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}
