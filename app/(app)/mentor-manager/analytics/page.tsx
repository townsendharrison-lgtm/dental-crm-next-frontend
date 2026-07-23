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

  const pendingIds = useMemo(
    () =>
      new Set(
        ops.assignments
          .filter((a) => a.status === "PENDING")
          .map((a) => a.studentId || a.student_id)
          .filter(Boolean) as string[],
      ),
    [ops.assignments],
  );

  const unassignedCount = useMemo(
    () =>
      ops.students.filter(
        (s) => !(s.mentorId || s.profile?.mentor_id) && !pendingIds.has(s.id),
      ).length,
    [ops.students, pendingIds],
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
