"use client";

import { useHubData } from "@/components/student/hub/HubDataProvider";
import TimelineTab from "@/components/student/hub/TimelineTab";

export default function HubTimelinePage() {
  const { student } = useHubData();

  return <TimelineTab student={student} />;
}
