"use client";

import { useHubData } from "@/components/student/hub/HubDataProvider";
import AnalyticsTab from "@/components/student/hub/AnalyticsTab";

export default function HubAnalyticsPage() {
  const { student, experiences, optimizationPlan } = useHubData();

  return (
    <AnalyticsTab
      student={student}
      experiences={experiences}
      optimizationPlan={optimizationPlan ?? undefined}
    />
  );
}
