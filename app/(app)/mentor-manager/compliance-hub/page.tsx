"use client";

import { Loader2 } from "lucide-react";
import { useMentorManagerOps } from "@/lib/hooks/useMentorManagerOps";
import ComplianceHubView from "@/components/mentor/ComplianceHubView";

export default function MentorManagerComplianceHubPage() {
  const ops = useMentorManagerOps({
    messagesHref: "/mentor-manager/messages",
    basePath: "/mentor-manager/mentors",
  });

  if (ops.isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Match admin: include pending-acceptance students (mentor_id cleared until accept).
  const unassignedCount = ops.students.filter((s) => {
    if (s.email?.toLowerCase().endsWith("@school-selection.local")) return false;
    return !(s.mentorId || s.profile?.mentor_id);
  }).length;

  return (
    <ComplianceHubView
      summary={ops.summary}
      insights={ops.insights}
      alerts={ops.alerts}
      rows={ops.complianceRows}
      students={ops.students}
      mentors={ops.mentors}
      meetings={ops.meetings}
      actionItems={ops.actionItems}
      unassignedCount={unassignedCount}
      onOpenChat={ops.onOpenChat}
      onSendNudge={ops.onSendNudge}
      onAuditMentor={ops.onAuditMentor}
      mentorsHref="/mentor-manager/mentors"
      nudgesHref="/mentor-manager/alerts"
      slaHref="/mentor-manager/reporting"
      scheduleHref="/mentor-manager/schedule"
      tasksHref="/mentor-manager/tasks"
    />
  );
}
