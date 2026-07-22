import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  Course,
  CourseModule,
  CourseSubmission,
  CourseStatus,
  CourseModuleType,
  CourseSubmissionStatus,
  CourseSubmissionType,
} from "@/lib/types";

export function normalizeModule(m: CourseModule): CourseModule {
  return {
    ...m,
    courseId: m.courseId ?? m.course_id,
    contentUrl: m.contentUrl ?? m.content_url ?? null,
    sortOrder: m.sortOrder ?? m.sort_order ?? 0,
    isRequired: m.isRequired ?? m.is_required ?? true,
  };
}

export function normalizeCourse(c: Course): Course {
  return {
    ...c,
    sortOrder: c.sortOrder ?? c.sort_order ?? 0,
    modules: (c.modules || []).map(normalizeModule),
  };
}

export function normalizeSubmission(s: CourseSubmission): CourseSubmission {
  return {
    ...s,
    courseId: s.courseId ?? s.course_id,
    moduleId: s.moduleId ?? s.module_id ?? null,
    studentId: s.studentId ?? s.student_id,
    fileUrl: s.fileUrl ?? s.file_url ?? null,
    reviewerNotes: s.reviewerNotes ?? s.reviewer_notes ?? null,
    reviewedAt: s.reviewedAt ?? s.reviewed_at ?? null,
  };
}

export interface CreateCoursePayload {
  title: string;
  description?: string;
  category?: string;
  status?: CourseStatus;
  sortOrder?: number;
}

export interface CreateModulePayload {
  title: string;
  description?: string;
  type?: CourseModuleType;
  contentUrl?: string;
  sortOrder?: number;
  isRequired?: boolean;
}

export interface CreateSubmissionPayload {
  moduleId?: string;
  type?: CourseSubmissionType;
  title?: string;
  fileUrl?: string;
  notes?: string;
}

export const coursesApi = {
  list: async (): Promise<Course[]> => {
    const response = await apiGet<{ courses: Course[] }>("/api/courses");
    return (response.courses || []).map(normalizeCourse);
  },

  get: async (id: string): Promise<Course> => {
    const course = await apiGet<Course>(`/api/courses/${id}`);
    return normalizeCourse(course);
  },

  create: async (payload: CreateCoursePayload): Promise<Course> => {
    const created = await apiPost<Course>("/api/courses", payload);
    return normalizeCourse(created);
  },

  update: async (id: string, updates: Partial<CreateCoursePayload>): Promise<Course> => {
    const updated = await apiPut<Course>(`/api/courses/${id}`, updates);
    return normalizeCourse(updated);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/api/courses/${id}`);
  },

  createModule: async (courseId: string, payload: CreateModulePayload): Promise<CourseModule> => {
    const created = await apiPost<CourseModule>(`/api/courses/${courseId}/modules`, payload);
    return normalizeModule(created);
  },

  updateModule: async (
    moduleId: string,
    updates: Partial<CreateModulePayload>,
  ): Promise<CourseModule> => {
    const updated = await apiPut<CourseModule>(`/api/courses/modules/${moduleId}`, updates);
    return normalizeModule(updated);
  },

  removeModule: async (moduleId: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/api/courses/modules/${moduleId}`);
  },

  listSubmissions: async (status?: string): Promise<CourseSubmission[]> => {
    const q = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    const response = await apiGet<{ submissions: CourseSubmission[] }>(
      `/api/courses/submissions${q}`,
    );
    return (response.submissions || []).map(normalizeSubmission);
  },

  createSubmission: async (
    courseId: string,
    payload: CreateSubmissionPayload,
  ): Promise<CourseSubmission> => {
    const created = await apiPost<CourseSubmission>(
      `/api/courses/${courseId}/submissions`,
      payload,
    );
    return normalizeSubmission(created);
  },

  reviewSubmission: async (
    submissionId: string,
    payload: { status: CourseSubmissionStatus; reviewerNotes?: string },
  ): Promise<CourseSubmission> => {
    const updated = await apiPut<CourseSubmission>(
      `/api/courses/submissions/${submissionId}`,
      payload,
    );
    return normalizeSubmission(updated);
  },
};
