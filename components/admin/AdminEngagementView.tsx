"use client";

import React, { useMemo, useState } from "react";
import SurveyManagementView from "./SurveyManagementView";
import AdminPopupsView from "./AdminPopupsView";
import AdminWorkflowsView from "./AdminWorkflowsView";
import AdminBadgesView from "./AdminBadgesView";
import AdminResourcesView from "./AdminResourcesView";
import { ClipboardList, Rocket, Zap, Award, BookOpen } from "lucide-react";
import type {
  UserRole,
  Survey,
  SystemNotification,
  SurveyResponse,
  PopupAdvertisement,
  Workflow,
  Badge,
  Resource,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface AdminEngagementViewProps {
  role: UserRole;
  currentUserId: string;
  surveys: Survey[];
  notifications: SystemNotification[];
  responses: SurveyResponse[];
  onAddSurvey: (survey: Partial<Survey>) => void;
  onAddNotification: (notif: Partial<SystemNotification>) => void;
  onDeleteSurvey: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  popups: PopupAdvertisement[];
  onAddPopup: (popup: Partial<PopupAdvertisement>) => void;
  onUpdatePopup: (popup: PopupAdvertisement) => void;
  onDeletePopup: (id: string) => void;
  workflows: Workflow[];
  onUpdateWorkflows: (workflows: Workflow[]) => void;
  badges: Badge[];
  onAddBadge: (badge: Partial<Badge>) => void;
  onUpdateBadge: (badge: Badge) => void;
  onDeleteBadge: (id: string) => void;
  resources: Resource[];
  onAddResource: (resource: Partial<Resource>) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
}

type EngagementTab = "surveys" | "popups" | "workflows" | "badges" | "resources";

const AdminEngagementView: React.FC<AdminEngagementViewProps> = ({
  role,
  currentUserId,
  surveys,
  notifications,
  responses,
  onAddSurvey,
  onAddNotification,
  onDeleteSurvey,
  onDeleteNotification,
  popups,
  onAddPopup,
  onUpdatePopup,
  onDeletePopup,
  workflows,
  onUpdateWorkflows,
  badges,
  onAddBadge,
  onUpdateBadge,
  onDeleteBadge,
  resources,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
}) => {
  const isAdmin = role === "ADMIN";
  const [tab, setTab] = useState<EngagementTab>("surveys");

  const items = useMemo(
    () =>
      [
        { id: "surveys" as const, label: "Surveys & Alerts", icon: ClipboardList },
        ...(isAdmin
          ? [
              { id: "popups" as const, label: "Ad Popups", icon: Rocket },
              { id: "workflows" as const, label: "Workflows", icon: Zap },
              { id: "badges" as const, label: "Badges", icon: Award },
              { id: "resources" as const, label: "Resources", icon: BookOpen },
            ]
          : []),
      ],
    [isAdmin],
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max sm:min-w-0 items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          {items.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "surveys" && (
        <SurveyManagementView
          role={role}
          currentUserId={currentUserId}
          surveys={surveys}
          notifications={notifications}
          responses={responses}
          onAddSurvey={onAddSurvey}
          onAddNotification={onAddNotification}
          onDeleteSurvey={onDeleteSurvey}
          onDeleteNotification={onDeleteNotification}
          hideHeader
        />
      )}

      {tab === "popups" && isAdmin && (
        <AdminPopupsView
          popups={popups}
          onAddPopup={onAddPopup}
          onUpdatePopup={onUpdatePopup}
          onDeletePopup={onDeletePopup}
          hideHeader
        />
      )}

      {tab === "workflows" && isAdmin && (
        <AdminWorkflowsView workflows={workflows} onUpdateWorkflows={onUpdateWorkflows} />
      )}

      {tab === "badges" && isAdmin && (
        <AdminBadgesView
          badges={badges}
          onAddBadge={onAddBadge}
          onUpdateBadge={onUpdateBadge}
          onDeleteBadge={onDeleteBadge}
        />
      )}

      {tab === "resources" && isAdmin && (
        <AdminResourcesView
          resources={resources}
          onAddResource={onAddResource}
          onUpdateResource={onUpdateResource}
          onDeleteResource={onDeleteResource}
        />
      )}
    </div>
  );
};

export default AdminEngagementView;
