"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolCategoriesApi } from "@/lib/api/schoolCategories";
import { queryKeys } from "@/lib/api/queryKeys";
import type { SchoolCategory } from "@/lib/types";

export function useSchoolCategories(studentId?: string) {
  return useQuery<SchoolCategory[]>({
    queryKey: queryKeys.schoolCategories.all(studentId),
    queryFn: () => schoolCategoriesApi.list(studentId!),
    enabled: !!studentId,
  });
}

export function useReplaceSchoolCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      categories,
    }: {
      studentId: string;
      categories: SchoolCategory[];
    }) => schoolCategoriesApi.replace(studentId, categories),
    onSuccess: (categories, vars) => {
      qc.setQueryData(queryKeys.schoolCategories.all(vars.studentId), categories);
      qc.setQueryData(queryKeys.students.detail(vars.studentId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          schoolCategories: categories,
          profile: {
            ...(old.profile || {}),
            school_categories: categories,
          },
        };
      });
      qc.invalidateQueries({ queryKey: queryKeys.students.detail(vars.studentId) });
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}
