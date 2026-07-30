"use client";

import { useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useAdminAnalytics } from "@/lib/hooks/useAdmin";
import { useMentorManagerOps } from "@/lib/hooks/useMentorManagerOps";
import MentorManagerAnalyticsView from "@/components/mentor/MentorManagerAnalyticsView";
import { Spinner, EmptyState, Button } from "@/components/ui";

export default function MentorManagerAnalyticsPage() {
  const ops = useMentorManagerOps({
    messagesHref: "/mentor-manager/messages",
    basePath: "/mentor-manager/mentors",
  });
  const {
    data: platform,
    isLoading: platformLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminAnalytics(true);

  const unassignedCount = useMemo(
    () =>
      ops.students.filter((s) => {
        if (s.email?.toLowerCase().endsWith("@school-selection.local")) return false;
        return !(s.mentorId || s.profile?.mentor_id);
      }).length,
    [ops.students],
  );

  if (ops.isLoading || platformLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (isError || !platform) {
    return (
      <div className="flex h-[50vh] items-center justify-center px-4">
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Could not load analytics"
          description={
            (error as Error)?.message ||
            "Analytics failed to load. Confirm the backend is running and you are signed in as a mentor manager."
          }
          action={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <MentorManagerAnalyticsView
      platform={platform}
      summary={ops.summary}
      complianceRows={ops.complianceRows}
      unassignedCount={unassignedCount}
      studentCount={ops.students.length}
      complianceHref="/mentor-manager/compliance-hub"
      slaHref="/mentor-manager/reporting"
      nudgesHref="/mentor-manager/alerts"
    />
  );
}
