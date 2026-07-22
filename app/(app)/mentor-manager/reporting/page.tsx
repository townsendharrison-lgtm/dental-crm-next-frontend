"use client";

import { Loader2 } from "lucide-react";
import { useMentorManagerOps } from "@/lib/hooks/useMentorManagerOps";
import SlaReportView from "@/components/mentor/SlaReportView";

export default function MentorManagerSlaReportPage() {
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

  return (
    <SlaReportView
      rows={ops.complianceRows}
      summary={ops.summary}
      onAuditMentor={ops.onAuditMentor}
      onSendNudge={ops.onSendNudge}
    />
  );
}
