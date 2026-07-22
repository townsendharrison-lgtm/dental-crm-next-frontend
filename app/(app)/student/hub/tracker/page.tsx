"use client";

import { useHubData } from "@/components/student/hub/HubDataProvider";
import HourTrackerTab from "@/components/student/hub/HourTrackerTab";

export default function HubTrackerPage() {
  const { student, experiences } = useHubData();

  return <HourTrackerTab student={student} experiences={experiences} />;
}
