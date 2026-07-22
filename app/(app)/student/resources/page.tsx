"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clock,
  ExternalLink,
  ArrowUpRight,
  Search,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useResources } from "@/lib/hooks/useResources";
import type { Resource } from "@/lib/types";
import { renderBadgeIcon } from "@/lib/utils/badgeIcons";
import { Badge, Button, EmptyState, Input, SelectMenu, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

function resourceTime(r: Resource) {
  return r.estimatedTime || r.estimated_time || "5m";
}

function isActiveResource(r: Resource) {
  if (r.isActive !== undefined) return Boolean(r.isActive);
  if (r.is_active !== undefined) return Boolean(r.is_active);
  return true;
}

export default function StudentResourcesPage() {
  const router = useRouter();
  const { data: resources = [], isLoading, isError, refetch, isFetching } = useResources();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const activeResources = useMemo(
    () =>
      [...resources]
        .filter(isActiveResource)
        .sort((a, b) => {
          const ao = a.sortOrder ?? a.sort_order ?? 0;
          const bo = b.sortOrder ?? b.sort_order ?? 0;
          if (ao !== bo) return ao - bo;
          return a.title.localeCompare(b.title);
        }),
    [resources],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeResources.forEach((r) => {
      if (r.category?.trim()) set.add(r.category.trim());
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [activeResources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeResources.filter((r) => {
      if (category !== "All" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q)
      );
    });
  }, [activeResources, search, category]);

  const handleResourceClick = (resource: Resource) => {
    const url = (resource.url || "").trim();
    if (!url || url === "#") {
      toast.info(`${resource.title} is coming soon`);
      return;
    }
    if (url.startsWith("/")) {
      router.push(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[50vh] items-center justify-center px-4">
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="Could not load resources"
          description="Check your connection and try again."
          action={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectMenu
            value={category}
            onChange={setCategory}
            options={categories.map((c) => ({
              value: c,
              label: c === "All" ? "All categories" : c,
            }))}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={activeResources.length === 0 ? "No resources yet" : "No matching resources"}
          description={
            activeResources.length === 0
              ? "Your admin can publish resources from Engagement → Student Resources."
              : "Try a different search or category."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resource) => {
            const url = (resource.url || "").trim();
            const isInternal = url.startsWith("/");
            const isPlaceholder = !url || url === "#";
            const cta = isInternal
              ? "Open in app"
              : isPlaceholder
                ? "Coming soon"
                : "Open link";

            return (
              <button
                key={resource.id}
                type="button"
                onClick={() => handleResourceClick(resource)}
                className="group flex cursor-pointer flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-left transition-colors hover:border-indigo-500/40 hover:bg-slate-900/70"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                    {renderBadgeIcon(resource.icon || "BookOpen", "h-5 w-5")}
                  </div>
                  {!isInternal && !isPlaceholder && (
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-indigo-400" />
                  )}
                </div>

                <h3 className="text-base font-semibold text-white transition-colors group-hover:text-indigo-300">
                  {resource.title}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="primary">{resource.category || "General"}</Badge>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    {resourceTime(resource)}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-semibold text-indigo-400">
                  {cta}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
