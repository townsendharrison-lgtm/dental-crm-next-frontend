"use client";

import React, { createContext, useContext } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStudent } from "@/lib/hooks/useStudentProfile";
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
  const platformConfig = usePlatformConfig();
  const { data: student, isLoading: isStudentLoading } = useStudent(user?.id || "");
  const { data: experiences = [], isLoading: isExperiencesLoading } = useExperiences(user?.id || "");
  const { data: optimizationPlan = null, isLoading: isPlanLoading } = useOptimizationPlan(user?.id || "");

  const isLoading = isStudentLoading || isExperiencesLoading || isPlanLoading || !user;

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
