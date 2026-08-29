"use client";

import React from "react";
import AdminSchoolIntelligenceView from "@/components/admin/AdminSchoolIntelligenceView";
import { useSchools } from "@/lib/hooks/useSchools";
import { Loader2 } from "lucide-react";

export default function AdminResearchPage() {
  const { data: schools, isLoading } = useSchools();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return <AdminSchoolIntelligenceView schools={schools || []} />;
}
