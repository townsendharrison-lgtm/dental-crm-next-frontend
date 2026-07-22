"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Activity, User } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type MentorSubpageTab = "students" | "audit" | "profile";

interface MentorSubpageShellProps {
  basePath: string;
  mentorId: string;
  mentorName: string;
  mentorEmail?: string;
  mentorAvatar?: string;
  meta?: string;
  activeTab: MentorSubpageTab;
  children: React.ReactNode;
}

const TABS: { id: MentorSubpageTab; label: string; icon: typeof Users }[] = [
  { id: "students", label: "Students", icon: Users },
  { id: "audit", label: "Audit", icon: Activity },
  { id: "profile", label: "Profile", icon: User },
];

export function mentorDisplayName(mentor: { name?: string; email?: string }) {
  const name = mentor.name?.trim();
  if (name && name !== mentor.email) return name;
  return name || mentor.email || "Mentor";
}

export default function MentorSubpageShell({
  basePath,
  mentorId,
  mentorName,
  mentorEmail,
  mentorAvatar,
  meta,
  activeTab,
  children,
}: MentorSubpageShellProps) {
  const router = useRouter();
  const subtitle =
    meta ||
    (mentorEmail && mentorEmail !== mentorName ? mentorEmail : "Mentor workspace");

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 shrink-0 text-indigo-400"
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            onClick={() => router.push(basePath)}
          >
            Mentor Ops
          </Button>
          <div className="hidden h-6 w-px bg-slate-800 sm:block" />
          <Avatar name={mentorName} src={mentorAvatar} size="md" className="rounded-xl shrink-0" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">{mentorName}</h2>
            <p className="truncate text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:min-w-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => router.push(`${basePath}/${mentorId}/${tab.id}`)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
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
