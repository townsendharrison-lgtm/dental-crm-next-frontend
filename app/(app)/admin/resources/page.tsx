"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminResourcesView from "@/components/admin/AdminResourcesView";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useCreateResource,
  useDeleteResource,
  useReorderResources,
  useResources,
  useUpdateResource,
} from "@/lib/hooks/useResources";
import type { Resource } from "@/lib/types";
import { toastAction } from "@/lib/utils/toastAction";

export default function AdminResourcesPage() {
  const { user } = useAuth();
  const { data: resources = [], isLoading } = useResources(!!user);
  const createResourceMutation = useCreateResource();
  const updateResourceMutation = useUpdateResource();
  const deleteResourceMutation = useDeleteResource();
  const reorderResourceMutation = useReorderResources();

  const handleAddResource = (resource: Partial<Resource>) => {
    void toastAction(
      createResourceMutation.mutateAsync({
        title: resource.title || "Untitled",
        url: resource.url || "#",
        estimatedTime: resource.estimatedTime || resource.estimated_time || "5m",
        category: resource.category || "General",
        icon: resource.icon || "BookOpen",
      }),
      {
        loading: "Adding resource…",
        success: "Resource added",
        error: "Failed to add resource",
      },
    );
  };

  const handleUpdateResource = (resource: Resource) => {
    void toastAction(
      updateResourceMutation.mutateAsync({
        id: resource.id,
        updates: {
          title: resource.title,
          url: resource.url,
          estimatedTime: resource.estimatedTime || resource.estimated_time,
          category: resource.category,
          icon: resource.icon,
        },
      }),
      {
        loading: "Saving resource…",
        success: "Resource updated",
        error: "Failed to update resource",
      },
    );
  };

  const handleDeleteResource = (id: string) => {
    void toastAction(deleteResourceMutation.mutateAsync(id), {
      loading: "Deleting resource…",
      success: "Resource deleted",
      error: "Failed to delete resource",
    });
  };

  const handleReorderResources = async (orderedIds: string[]) => {
    try {
      await reorderResourceMutation.mutateAsync(orderedIds);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      toast.error(message || "Couldn't save resource order");
      throw err;
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <AdminResourcesView
        resources={resources}
        onAddResource={handleAddResource}
        onUpdateResource={handleUpdateResource}
        onDeleteResource={handleDeleteResource}
        onReorderResources={handleReorderResources}
      />
    </div>
  );
}
