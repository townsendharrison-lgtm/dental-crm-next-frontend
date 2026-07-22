"use client";

import AdminAnalyticsView from "@/components/admin/AdminAnalyticsView";
import { useAdminAnalytics } from "@/lib/hooks/useAdmin";
import { Spinner, EmptyState, Button } from "@/components/ui";
import { BarChart3, RefreshCw } from "lucide-react";

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAnalytics();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center px-4">
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Could not load analytics"
          description={
            (error as Error)?.message ||
            "The analytics endpoint failed. Check that the backend is running and you are signed in as admin."
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
    <div className="pt-2">
      <AdminAnalyticsView data={data} />
    </div>
  );
}
