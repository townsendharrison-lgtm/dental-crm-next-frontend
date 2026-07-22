"use client";

import { useHubData } from "@/components/student/hub/HubDataProvider";
import ImprovementTab from "@/components/student/hub/ImprovementTab";

export default function HubImprovementPage() {
  const { student, experiences, optimizationPlan } = useHubData();

  return (
    <ImprovementTab
      student={student}
      experiences={experiences}
      optimizationPlan={optimizationPlan}
      isMentorView={false}
    />
  );
}
