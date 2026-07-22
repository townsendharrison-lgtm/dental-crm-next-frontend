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

  const pendingIds = new Set(
    ops.assignments
      .filter((a) => a.status === "PENDING")
      .map((a) => a.studentId || a.student_id)
      .filter(Boolean) as string[],
  );
  const unassignedCount = ops.students.filter(
    (s) => !(s.mentorId || s.profile?.mentor_id) && !pendingIds.has(s.id),
  ).length;

  return (
    <ComplianceHubView
      summary={ops.summary}
      insights={ops.insights}
      alerts={ops.alerts}
      rows={ops.complianceRows}
      unassignedCount={unassignedCount}
      onOpenChat={ops.onOpenChat}
      onSendNudge={ops.onSendNudge}
      onAuditMentor={ops.onAuditMentor}
      mentorsHref="/mentor-manager/mentors"
      nudgesHref="/mentor-manager/alerts"
      slaHref="/mentor-manager/reporting"
    />
  );
}
