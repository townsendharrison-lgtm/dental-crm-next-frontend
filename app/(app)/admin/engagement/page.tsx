"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useSurveys, useCreateSurvey, useDeleteSurvey } from "@/lib/hooks/useSurveys";
import {
  useBroadcasts,
  useBroadcastNotification,
  useDeleteBroadcast,
} from "@/lib/hooks/useNotifications";
import { usePopups, useCreatePopup, useUpdatePopup, useDeletePopup } from "@/lib/hooks/usePopups";
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from "@/lib/hooks/useWorkflows";
import {
  useBadges,
  useCreateBadge,
  useUpdateBadge,
  useDeleteBadge,
} from "@/lib/hooks/useBadges";
import {
  useResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from "@/lib/hooks/useResources";
import AdminEngagementView from "@/components/admin/AdminEngagementView";
import type { Workflow, Badge, SystemNotification, Survey, PopupAdvertisement, Resource } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { toastAction, withToastLoading } from "@/lib/utils/toastAction";

export default function AdminEngagementPage() {
  const { user } = useAuth();
  const { data: surveys = [], isLoading: surveysLoading } = useSurveys();
  const { data: broadcasts = [], isLoading: broadcastsLoading } = useBroadcasts(!!user);
  const { data: popups = [] } = usePopups();
  const { data: workflows = [] } = useWorkflows();
  const { data: badges = [] } = useBadges();
  const { data: resources = [], isLoading: resourcesLoading } = useResources(!!user);

  const createSurveyMutation = useCreateSurvey();
  const deleteSurveyMutation = useDeleteSurvey();
  const broadcastMutation = useBroadcastNotification();
  const deleteBroadcastMutation = useDeleteBroadcast();
  const createPopupMutation = useCreatePopup();
  const updatePopupMutation = useUpdatePopup();
  const deletePopupMutation = useDeletePopup();
  const createWorkflowMutation = useCreateWorkflow();
  const updateWorkflowMutation = useUpdateWorkflow();
  const deleteWorkflowMutation = useDeleteWorkflow();
  const createBadgeMutation = useCreateBadge();
  const updateBadgeMutation = useUpdateBadge();
  const deleteBadgeMutation = useDeleteBadge();
  const createResourceMutation = useCreateResource();
  const updateResourceMutation = useUpdateResource();
  const deleteResourceMutation = useDeleteResource();

  if (!user || surveysLoading || broadcastsLoading || resourcesLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const notifications: SystemNotification[] = broadcasts.map((b) => ({
    id: b.id,
    title: b.title,
    message: b.message,
    type: b.type,
    category: b.category,
    related_id: b.related_id,
    targetRole: b.targetRole || b.target_role,
    target_role: b.target_role || b.targetRole,
    created_at: b.created_at,
    createdAt: b.createdAt || b.created_at,
    created_by: b.created_by,
    createdBy: b.createdBy || b.created_by,
  }));

  const handleAddSurvey = (survey: Partial<Survey>) => {
    const questions = (survey.questions || []).map((q) => ({
      ...q,
      questionText: q.questionText || q.question || "",
      question: q.question || q.questionText || "",
    }));
    void toastAction(
      createSurveyMutation.mutateAsync({
        title: survey.title || "Untitled Survey",
        questions,
        description: survey.description || "",
        targetRole: (survey.targetRole || survey.target_role || "STUDENT") as
          | "STUDENT"
          | "MENTOR"
          | "BOTH",
        isActive: true,
      }),
      {
        loading: "Creating survey…",
        success: "Survey created",
        error: "Failed to create survey",
      },
    );
  };

  const handleAddNotification = (notif: Partial<SystemNotification>) => {
    void toastAction(
      broadcastMutation.mutateAsync({
        title: notif.title || "",
        message: notif.message || "",
        type: (notif.type as "INFO" | "WARNING" | "URGENT") || "INFO",
        targetRole: (notif.targetRole || notif.target_role || "BOTH") as
          | "STUDENT"
          | "MENTOR"
          | "BOTH",
      }),
      {
        loading: "Sending alert…",
        success: (res) => `Alert sent to ${res.notified} user(s)`,
        error: "Failed to send alert",
      },
    );
  };

  const handleDeleteNotification = (id: string) => {
    void toastAction(deleteBroadcastMutation.mutateAsync(id), {
      loading: "Removing broadcast…",
      success: "Broadcast removed",
      error: "Failed to remove broadcast",
    });
  };

  const handleDeleteSurvey = (id: string) => {
    void toastAction(deleteSurveyMutation.mutateAsync(id), {
      loading: "Deleting survey…",
      success: "Survey deleted",
      error: "Failed to delete survey",
    });
  };

  const handleAddPopup = (popup: Partial<PopupAdvertisement>) => {
    void toastAction(
      createPopupMutation.mutateAsync({
        title: popup.title || "Untitled",
        message: popup.message || "",
        imageUrl: popup.imageUrl || undefined,
        ctaText: popup.ctaText || undefined,
        ctaUrl: popup.ctaUrl || undefined,
        backgroundColor: popup.backgroundColor || undefined,
        textColor: popup.textColor || undefined,
        targetRole: (popup.targetRole || "STUDENT") as
          | "STUDENT"
          | "MENTOR"
          | "ADMIN"
          | "MENTOR_MANAGER"
          | "BOTH",
        startDate: popup.startDate || new Date().toISOString(),
        endDate: popup.endDate || new Date().toISOString(),
        isActive: popup.isActive !== undefined ? popup.isActive : true,
      }),
      {
        loading: "Creating pop-up…",
        success: "Popup created",
        error: "Failed to create popup",
      },
    );
  };

  const handleUpdatePopup = (popup: PopupAdvertisement) => {
    void toastAction(
      updatePopupMutation.mutateAsync({
        id: popup.id,
        updates: {
          title: popup.title,
          message: popup.message,
          imageUrl: popup.imageUrl || undefined,
          ctaText: popup.ctaText || undefined,
          ctaUrl: popup.ctaUrl || undefined,
          backgroundColor: popup.backgroundColor || undefined,
          textColor: popup.textColor || undefined,
          targetRole: (popup.targetRole || popup.target_role) as
            | "STUDENT"
            | "MENTOR"
            | "ADMIN"
            | "MENTOR_MANAGER"
            | "BOTH",
          startDate: popup.startDate || popup.start_date || "",
          endDate: popup.endDate || popup.end_date || "",
          isActive: popup.isActive ?? popup.is_active,
        },
      }),
      {
        loading: "Saving pop-up…",
        success: "Popup updated",
        error: "Failed to update popup",
      },
    );
  };

  const handleDeletePopup = (id: string) => {
    void toastAction(deletePopupMutation.mutateAsync(id), {
      loading: "Deleting pop-up…",
      success: "Popup deleted",
      error: "Failed to delete popup",
    });
  };

  const handleUpdateWorkflows = async (next: Workflow[]) => {
    const t = withToastLoading("Saving workflows…");
    try {
      const prevMap = new Map(workflows.map((w) => [w.id, w]));
      const nextMap = new Map(next.map((w) => [w.id, w]));

      for (const w of workflows) {
        if (!nextMap.has(w.id)) {
          await deleteWorkflowMutation.mutateAsync(w.id);
        }
      }

      for (const w of next) {
        const isActive = w.isActive ?? w.is_active;
        if (!prevMap.has(w.id)) {
          await createWorkflowMutation.mutateAsync({
            name: w.name,
            trigger: w.trigger,
            steps: w.steps || [],
            isActive,
          });
        } else {
          const old = prevMap.get(w.id)!;
          const oldActive = old.isActive ?? old.is_active;
          if (
            old.name !== w.name ||
            old.trigger !== w.trigger ||
            JSON.stringify(old.steps) !== JSON.stringify(w.steps) ||
            oldActive !== isActive
          ) {
            await updateWorkflowMutation.mutateAsync({
              id: w.id,
              updates: {
                name: w.name,
                trigger: w.trigger,
                steps: w.steps,
                isActive,
              },
            });
          }
        }
      }
      t.success("Workflows saved");
    } catch {
      t.error("Failed to save workflows");
    }
  };

  const handleAddBadge = (badge: Partial<Badge>) => {
    void toastAction(
      createBadgeMutation.mutateAsync({
        name: badge.name || "Untitled Badge",
        description: badge.description || "",
        icon: badge.icon || "Award",
        color: badge.color || "bg-amber-400/10 text-amber-400",
        benchmarkType: (badge.benchmarkType || badge.benchmark_type || "PROGRESS") as Badge["benchmark_type"],
        benchmarkValue: badge.benchmarkValue ?? badge.benchmark_value ?? 0,
      }),
      {
        loading: "Creating badge…",
        success: "Badge created",
        error: "Failed to create badge",
      },
    );
  };

  const handleUpdateBadge = (badge: Badge) => {
    void toastAction(
      updateBadgeMutation.mutateAsync({
        id: badge.id,
        updates: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          benchmarkType: (badge.benchmarkType || badge.benchmark_type) as Badge["benchmark_type"],
          benchmarkValue: badge.benchmarkValue ?? badge.benchmark_value,
        },
      }),
      {
        loading: "Saving badge…",
        success: "Badge updated",
        error: "Failed to update badge",
      },
    );
  };

  const handleDeleteBadge = (id: string) => {
    void toastAction(deleteBadgeMutation.mutateAsync(id), {
      loading: "Deleting badge…",
      success: "Badge deleted",
      error: "Failed to delete badge",
    });
  };

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

  return (
    <div className="pt-2">
      <AdminEngagementView
        role={user.role}
        currentUserId={user.id}
        surveys={surveys}
        notifications={notifications}
        responses={[]}
        onAddSurvey={handleAddSurvey}
        onAddNotification={handleAddNotification}
        onDeleteSurvey={handleDeleteSurvey}
        onDeleteNotification={handleDeleteNotification}
        popups={popups}
        onAddPopup={handleAddPopup}
        onUpdatePopup={handleUpdatePopup}
        onDeletePopup={handleDeletePopup}
        workflows={workflows}
        onUpdateWorkflows={handleUpdateWorkflows}
        badges={badges}
        onAddBadge={handleAddBadge}
        onUpdateBadge={handleUpdateBadge}
        onDeleteBadge={handleDeleteBadge}
        resources={resources}
        onAddResource={handleAddResource}
        onUpdateResource={handleUpdateResource}
        onDeleteResource={handleDeleteResource}
      />
    </div>
  );
}
