"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { useUIStore } from "@/lib/stores/uiStore";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useMentors } from "@/lib/hooks/useMentors";
import { adminApi } from "@/lib/api/admin";

export type PreviewSubjectKind = "STUDENT" | "MENTOR" | "MENTOR_MANAGER";

/**
 * Resolves which user id to load dashboard data for.
 *
 * - Normal users: always their own id
 * - Admin previewing STUDENT/MENTOR: a real account from the roster (picker)
 *
 * Backend still authorizes as ADMIN — this is UI-only impersonation for layout QA.
 * Preview subject selection is admin-only.
 */
export function usePreviewSubject(kind: PreviewSubjectKind) {
  const { user } = useAuth();
  const { isAdmin, isPreviewing, role } = useRole();
  const previewSubjectId = useUIStore((s) => s.previewSubjectId);
  const setPreviewSubjectId = useUIStore((s) => s.setPreviewSubjectId);

  const needsProxy = isAdmin && isPreviewing && role === kind;

  const { data: students = [], isLoading: studentsLoading } = useStudents(
    needsProxy && kind === "STUDENT",
  );
  const { data: mentors = [], isLoading: mentorsLoading } = useMentors(
    needsProxy && kind === "MENTOR",
  );
  const { data: managers = [], isLoading: managersLoading } = useQuery({
    queryKey: ["admin", "users", "mentor-managers"],
    queryFn: async () => {
      const users = await adminApi.listUsers();
      return users.filter((user) => user.role === "MENTOR_MANAGER");
    },
    enabled: needsProxy && kind === "MENTOR_MANAGER",
  });

  const options = useMemo(() => {
    if (!needsProxy) return [] as Array<{ id: string; name: string; subtitle?: string }>;
    const raw =
      kind === "STUDENT" ? students : kind === "MENTOR" ? mentors : managers;
    return raw
      .map((row) => {
        const email = ("email" in row ? row.email : undefined) || "";
        const rawName = (row.name || "").trim();
        const nameLooksLikeEmail = rawName.includes("@");
        const name =
          rawName && !nameLooksLikeEmail
            ? rawName
            : email || rawName || "Unnamed";
        return { id: row.id, name };
      })
      .filter((row) => !!row.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [needsProxy, kind, students, mentors, managers]);

  useEffect(() => {
    if (!needsProxy) return;
    if (previewSubjectId && options.some((o) => o.id === previewSubjectId)) return;
    if (options[0]?.id) setPreviewSubjectId(options[0].id);
  }, [needsProxy, options, previewSubjectId, setPreviewSubjectId]);

  const subjectId = needsProxy
    ? previewSubjectId && options.some((o) => o.id === previewSubjectId)
      ? previewSubjectId
      : options[0]?.id || ""
    : user?.id || "";

  const subjectName =
    options.find((o) => o.id === subjectId)?.name ||
    (needsProxy ? "…" : user?.name || "");

  const isLoadingSubjects =
    needsProxy &&
    (kind === "STUDENT"
      ? studentsLoading
      : kind === "MENTOR"
        ? mentorsLoading
        : managersLoading);

  return {
    subjectId,
    subjectName,
    isProxyPreview: needsProxy,
    isLoadingSubjects,
    options,
    setSubjectId: (id: string) => {
      if (!isAdmin) return;
      setPreviewSubjectId(id);
    },
  };
}
