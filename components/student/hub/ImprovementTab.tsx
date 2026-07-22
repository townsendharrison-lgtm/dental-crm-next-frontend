"use client";

import { Target } from "lucide-react";
import ApplicationOptimizationPlan from "../ApplicationOptimizationPlan";
import { EmptyState } from "@/components/ui";
import type { Experience, OptimizationPlan, Student } from "@/lib/types";

interface ImprovementTabProps {
  student: Student;
  experiences: Experience[];
  optimizationPlan?: OptimizationPlan | null;
  isMentorView?: boolean;
}

export default function ImprovementTab({
  student,
  experiences,
  optimizationPlan,
  isMentorView = false,
}: ImprovementTabProps) {
  if (!optimizationPlan) {
    return (
      <EmptyState
        icon={<Target className="h-8 w-8" />}
        title="No optimization plan yet"
        description="Your mentor will build an Application Optimization Plan here once your profile is reviewed. Check back after your next mentoring session."
        className="min-h-[320px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <ApplicationOptimizationPlan
        studentName={student.name}
        studentCreatedAt={student.createdAt}
        plan={optimizationPlan}
        experiences={experiences}
        isEditable={isMentorView}
      />
    </div>
  );
}
