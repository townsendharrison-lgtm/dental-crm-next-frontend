"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { compareResources } from "@/lib/api/resources";
import { useResources } from "@/lib/hooks/useResources";
import type { Resource } from "@/lib/types";
import { SelectMenu } from "@/components/ui/SelectMenu";

function isActiveResource(resource: Resource) {
  if (resource.isActive !== undefined) return Boolean(resource.isActive);
  if (resource.is_active !== undefined) return Boolean(resource.is_active);
  return true;
}

/** Compact picker of the student resources library. Choosing one fills the link. */
export function ResourcePicker({
  value,
  onPick,
  className,
}: {
  /** Current resource URL, used to show which library item is selected. */
  value: string;
  onPick: (link: string, resourceId: string | null) => void;
  className?: string;
}) {
  const { data: resources = [], isLoading } = useResources();
  const active = useMemo(
    () => resources.filter(isActiveResource).sort(compareResources),
    [resources],
  );
  const current = value.trim();
  const matched = active.find((resource) => (resource.url || "").trim() === current);

  return (
    <SelectMenu
      value={matched?.id || ""}
      onChange={(id) => {
        const resource = active.find((item) => item.id === id);
        if (!resource) {
          onPick("", null);
          return;
        }
        onPick((resource.url || "").trim(), resource.id);
      }}
      options={active.map((resource) => ({
        value: resource.id,
        label: resource.category?.trim()
          ? `${resource.title} · ${resource.category.trim()}`
          : resource.title,
      }))}
      placeholder={isLoading ? "Loading…" : active.length === 0 ? "No resources" : "Resources"}
      disabled={isLoading || active.length === 0}
      leftIcon={<BookOpen className="h-3.5 w-3.5 shrink-0" />}
      className={className || "h-10 w-36 shrink-0"}
    />
  );
}
