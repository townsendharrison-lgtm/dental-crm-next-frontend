import {
  LayoutDashboard,
  Users,
  User,
  UserPlus,
  UserCog,
  MessageSquare,
  CheckSquare,
  FileText,
  Settings,
  BarChart3,
  ShieldAlert,
  Rocket,
  Search,
  LayoutGrid,
  BookOpen,
  Sparkles,
  Megaphone,
  Calendar as CalendarIcon,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Role-based navigation, mirroring the old app's `getNavItems`.
 * Tab ids are mapped to route hrefs under the authenticated `(app)` group.
 */
const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
    { label: "Setter Management", href: "/admin/setter-management", icon: Target },
    { label: "Schedule", href: "/admin/schedule", icon: CalendarIcon },
    { label: "Tasks", href: "/admin/tasks", icon: CheckSquare },
    { label: "Engagement & Comms", href: "/admin/engagement", icon: Megaphone },
    { label: "Mentor Ops", href: "/admin/mentors", icon: UserCog },
    { label: "School Selection", href: "/admin/school-selection", icon: Target },
    { label: "Courses", href: "/admin/courses", icon: FileText },
    { label: "Global Data", href: "/admin/analytics", icon: BarChart3 },
    { label: "Admissions Research", href: "/admin/research", icon: Search },
    { label: "LOR Config", href: "/admin/lor-config", icon: ShieldAlert },
    { label: "LOR Review", href: "/admin/letter-portal", icon: FileText },
    { label: "Inbox", href: "/admin/messages", icon: MessageSquare },
    { label: "Rules Engine", href: "/admin/rules-engine", icon: Settings },
    { label: "User Management", href: "/admin/users", icon: UserPlus },
  ],
  MENTOR_MANAGER: [
    { label: "Compliance Hub", href: "/mentor-manager/compliance-hub", icon: ShieldAlert },
    { label: "Schedule", href: "/mentor-manager/schedule", icon: CalendarIcon },
    { label: "My Tasks", href: "/mentor-manager/tasks", icon: CheckSquare },
    { label: "Engagement & Comms", href: "/mentor-manager/engagement", icon: Megaphone },
    { label: "Mentor List", href: "/mentor-manager/mentors", icon: UserCog },
    { label: "Inbox", href: "/mentor-manager/messages", icon: MessageSquare },
    { label: "Analytics", href: "/mentor-manager/analytics", icon: BarChart3 },
    { label: "Active Nudges", href: "/mentor-manager/alerts", icon: MessageSquare },
    { label: "SLA Report", href: "/mentor-manager/reporting", icon: BarChart3 },
  ],
  MENTOR: [
    { label: "Command Center", href: "/mentor/command-center", icon: LayoutDashboard },
    { label: "Schedule", href: "/mentor/schedule", icon: CalendarIcon },
    { label: "My Tasks", href: "/mentor/tasks", icon: CheckSquare },
    { label: "My Students", href: "/mentor/students", icon: Users },
    { label: "School Filter", href: "/mentor/school-filter", icon: Search },
    { label: "Inbox", href: "/mentor/messages", icon: MessageSquare },
    { label: "Analytics", href: "/mentor/analytics", icon: BarChart3 },
  ],
  STUDENT: [
    { label: "Momentum", href: "/student/momentum", icon: Rocket },
    { label: "Central Hub", href: "/student/hub", icon: LayoutGrid },
    { label: "Profile & Docs", href: "/student/profile", icon: User },
    { label: "Resources", href: "/student/resources", icon: BookOpen },
    { label: "Inbox", href: "/student/messages", icon: MessageSquare },
  ],
  SETTER: [{ label: "Setter Management", href: "/setter/setter-management", icon: Target }],
  LETTER_WRITER: [{ label: "Letter Portal", href: "/letter-writer/letter-portal", icon: FileText }],
};

export function getAiToolItem(role: UserRole | undefined): NavItem {
  const rolePrefix = role ? `/${role.toLowerCase().replace("_", "-")}` : "";
  return {
    label: "Mentor Assistant",
    href: `${rolePrefix}/mentor-assistant`,
    icon: Sparkles,
  };
}

export function getNavItems(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_BY_ROLE[role] ?? [];
}

export function getInitialRouteForRole(role: UserRole | undefined): string {
  if (!role) return "/dashboard";
  const items = getNavItems(role);
  return items[0]?.href || "/dashboard";
}

export function showAiTools(role: UserRole | undefined): boolean {
  return !!role && !["LETTER_WRITER", "SETTER"].includes(role);
}

