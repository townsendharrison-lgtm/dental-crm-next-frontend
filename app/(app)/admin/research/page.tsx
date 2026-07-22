"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminResearchView from "@/components/admin/AdminResearchView";
import {
  useResearchCases,
  useCreateResearchCase,
  useUpdateResearchCase,
  useDeleteResearchCase,
} from "@/lib/hooks/useResearchCases";
import { useSchools } from "@/lib/hooks/useSchools";

export default function AdminResearchPage() {
  const { data: researchCases = [], isLoading: isCasesLoading } = useResearchCases();
  const { data: schools = [], isLoading: isSchoolsLoading } = useSchools();
  const createCase = useCreateResearchCase();
  const updateCase = useUpdateResearchCase();
  const deleteCase = useDeleteResearchCase();

  if (isCasesLoading || isSchoolsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <AdminResearchView
      researchCases={researchCases}
      schools={schools}
      isSaving={createCase.isPending || updateCase.isPending}
      onCreate={(payload) => {
        createCase.mutate(payload, {
          onSuccess: () => toast.success("Research case created"),
          onError: (err: any) => toast.error(err?.message || "Failed to create case"),
        });
      }}
      onUpdate={(id, updates) => {
        updateCase.mutate(
          { id, updates },
          {
            onSuccess: () => toast.success("Research case updated"),
            onError: (err: any) => toast.error(err?.message || "Failed to update case"),
          },
        );
      }}
      onDelete={(id) => {
        deleteCase.mutate(id, {
          onSuccess: () => toast.success("Research case deleted"),
          onError: (err: any) => toast.error(err?.message || "Failed to delete case"),
        });
      }}
    />
  );
}
