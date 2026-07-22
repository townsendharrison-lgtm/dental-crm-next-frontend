"use client";

import { useRouter } from "next/navigation";
import { Clock, TrendingUp, School as SchoolIcon, Target, Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type HubTabId = "tracker" | "analytics" | "schools" | "improvement" | "timeline";

const TABS: { id: HubTabId; label: string; icon: typeof Clock }[] = [
  { id: "tracker", label: "Hour Tracker", icon: Clock },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "schools", label: "School Selection", icon: SchoolIcon },
  { id: "improvement", label: "Improvement", icon: Target },
  { id: "timeline", label: "Timeline", icon: Calendar },
];

interface HubTabShellProps {
  activeTab: HubTabId;
  basePath?: string;
  onTabChange?: (tab: HubTabId) => void;
  children?: React.ReactNode;
}

export default function HubTabShell({
  activeTab,
  basePath = "/student/hub",
  onTabChange,
  children,
}: HubTabShellProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:min-w-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (onTabChange) {
                    onTabChange(tab.id);
                  } else {
                    router.push(`${basePath}/${tab.id}`);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all",
                  selected
                    ? "bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20"
                    : "font-medium text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
