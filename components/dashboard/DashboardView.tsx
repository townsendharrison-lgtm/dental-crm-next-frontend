"use client";

import { usePathname } from "next/navigation";
import { GraduationCap, Users, PhoneCall, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoleGate } from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getNavItems } from "@/lib/navigation";

const STATS = [
  { label: "Active Students", value: "—", icon: GraduationCap, roles: ["ADMIN", "MENTOR_MANAGER", "MENTOR"] as const },
  { label: "Mentors", value: "—", icon: Users, roles: ["ADMIN", "MENTOR_MANAGER"] as const },
  { label: "Open Leads", value: "—", icon: PhoneCall, roles: ["ADMIN", "SETTER"] as const },
  { label: "Pending LORs", value: "—", icon: FileText, roles: ["ADMIN", "MENTOR_MANAGER", "LETTER_WRITER"] as const },
];

export function DashboardView() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { role } = useRole();
  if (!user || !role) return null;

  const navItems = getNavItems(role);
  const dashboardItem = navItems.find((item) => item.href === pathname);
  const dashboardTitle = dashboardItem?.label || "Dashboard";

  return (
    <div>
      <PageHeader
        title={dashboardTitle}
        description={`Welcome back, ${user.name.split(" ")[0] || "there"}! Here's an overview of your workspace.`}
        actions={<Badge variant="primary">{ROLE_LABELS[role]}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <RoleGate key={stat.label} allow={[...stat.roles]}>
            <Card className="transition-colors hover:border-slate-700">
              <CardContent className="flex items-center gap-4 pt-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-600/20 bg-indigo-600/10 text-indigo-400">
                  <stat.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </RoleGate>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-white">Foundation ready</h2>
          <p className="mt-1 text-sm text-slate-400">
            Auth, role-based access, shared UI library, layout system, React Query + Zustand,
            and the API client with token refresh are all wired up. Build feature pages under{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">app/(app)/</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
