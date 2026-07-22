import { apiGet, apiPut } from "./client";
import type { SchoolCategory } from "@/lib/types";

export const schoolCategoriesApi = {
  list: async (studentId: string): Promise<SchoolCategory[]> => {
    const response = await apiGet<{ categories: SchoolCategory[] }>(
      `/api/students/${studentId}/school-categories`,
    );
    return response.categories || [];
  },

  replace: async (studentId: string, categories: SchoolCategory[]): Promise<SchoolCategory[]> => {
    const response = await apiPut<{ categories: SchoolCategory[] }>(
      `/api/students/${studentId}/school-categories`,
      { categories },
    );
    return response.categories || [];
  },
};
