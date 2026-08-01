"use client";

import React from "react";
import type { Student } from "@/lib/types";
import { StudentTimelineBoard } from "@/components/timeline/StudentTimelineBoard";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";

interface TimelineTabProps {
  student: Student;
  milestones?: unknown;
  onUpdateMilestones?: unknown;
  onUpdateStudent?: unknown;
}

/** Student Hub → Timeline: vertical accordion roadmap (no bookshelf). */
export default function TimelineTab({ student }: TimelineTabProps) {
  const platformConfig = usePlatformConfig();

  return (
    <StudentTimelineBoard
      student={student}
      mode="student"
      cardColors={platformConfig.timelineCardColors}
      showBookshelf={false}
    />
  );
}
