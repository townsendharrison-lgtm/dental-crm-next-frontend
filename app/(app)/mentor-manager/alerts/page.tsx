"use client";

import { Loader2 } from "lucide-react";
import { useMentorManagerOps } from "@/lib/hooks/useMentorManagerOps";
import ActiveNudgesView from "@/components/mentor/ActiveNudgesView";

export default function MentorManagerActiveNudgesPage() {
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
    <ActiveNudgesView
      alerts={ops.alerts}
      rows={ops.complianceRows}
      onSendNudge={ops.onSendNudge}
      onOpenChat={ops.onOpenChat}
      onAuditMentor={ops.onAuditMentor}
    />
  );
}
