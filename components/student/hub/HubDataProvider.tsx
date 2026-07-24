"use client";

import React, { createContext, useContext } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStudent } from "@/lib/hooks/useStudentProfile";
import { usePreviewSubject } from "@/lib/hooks/usePreviewSubject";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useOptimizationPlan } from "@/lib/hooks/useOptimizationPlans";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import type { AuthUser, Experience, OptimizationPlan, PlatformConfig, Student } from "@/lib/types";

interface HubDataContextValue {
  student: Student;
  experiences: Experience[];
  optimizationPlan: OptimizationPlan | null | undefined;
  platformConfig: PlatformConfig;
  isLoading: boolean;
  user: AuthUser | null;
}

const HubDataContext = createContext<HubDataContextValue | null>(null);

export function useHubData() {
  const ctx = useContext(HubDataContext);
  if (!ctx) {
    throw new Error("useHubData must be used within HubDataProvider");
  }
  return ctx;
}

export default function HubDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { subjectId, isLoadingSubjects } = usePreviewSubject("STUDENT");
  const platformConfig = usePlatformConfig();
  const { data: student, isLoading: isStudentLoading } = useStudent(subjectId);
  const { data: experiences = [], isLoading: isExperiencesLoading } = useExperiences(subjectId);
  const { data: optimizationPlan = null, isLoading: isPlanLoading } = useOptimizationPlan(subjectId);

  const isLoading =
    isLoadingSubjects || isStudentLoading || isExperiencesLoading || isPlanLoading || !user;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        Student profile not found.
      </div>
    );
  }

  return (
    <HubDataContext.Provider
      value={{
        student,
        experiences,
        optimizationPlan,
        platformConfig,
        isLoading: false,
        user,
      }}
    >
      {children}
    </HubDataContext.Provider>
  );
}
