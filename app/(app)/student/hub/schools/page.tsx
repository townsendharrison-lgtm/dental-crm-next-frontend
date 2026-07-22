"use client";

import { useHubData } from "@/components/student/hub/HubDataProvider";
import SchoolSelectionTab from "@/components/student/hub/SchoolSelectionTab";

export default function HubSchoolsPage() {
  const { student, platformConfig } = useHubData();

  return (
    <SchoolSelectionTab
      student={student}
      isMentorView={false}
      platformConfig={platformConfig}
    />
  );
}
