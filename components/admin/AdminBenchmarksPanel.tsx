"use client";

import AdminNationalBenchmarksView from "@/components/admin/AdminNationalBenchmarksView";
import {
  useCreateNationalBenchmark,
  useDeleteNationalBenchmark,
  useNationalBenchmarks,
  useUpdateNationalBenchmark,
} from "@/lib/hooks/useNationalBenchmarks";
import { toastAction } from "@/lib/utils/toastAction";
import { EmptyState, Button } from "@/components/ui";
import { RefreshCw, Target } from "lucide-react";

/** Shared national benchmarks editor (Rules Engine tab + legacy /admin/benchmarks). */
export default function AdminBenchmarksPanel() {
  const { data: benchmarks = [], isLoading, isError, error, refetch, isFetching } =
    useNationalBenchmarks();
  const createMutation = useCreateNationalBenchmark();
  const updateMutation = useUpdateNationalBenchmark();
  const deleteMutation = useDeleteNationalBenchmark();

  if (isError) {
    return (
      <div className="flex h-[40vh] items-center justify-center px-4">
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title="Could not load benchmarks"
          description={
            (error as Error)?.message ||
            "Run migration 042_national_benchmarks.sql, then retry."
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
    <AdminNationalBenchmarksView
      benchmarks={benchmarks}
      isLoading={isLoading}
      onCreate={(payload) =>
        toastAction(createMutation.mutateAsync(payload), {
          loading: "Adding section…",
          success: "Benchmark section added",
        })
      }
      onUpdate={(id, updates) =>
        toastAction(updateMutation.mutateAsync({ id, updates }), {
          loading: "Saving…",
          success: "Benchmark updated",
        })
      }
      onDelete={(id) =>
        toastAction(deleteMutation.mutateAsync(id), {
          loading: "Removing…",
          success: "Benchmark section removed",
        })
      }
    />
  );
}
