"use client";

import React, { useMemo, useState } from "react";
import type {
  Mentor,
  Student,
  Meeting,
  ActionItem,
  SystemNotification,
  StudentAssignment,
} from "@/lib/types";
import {
  Search,
  MessageSquare,
  Users,
  Activity,
  LayoutGrid,
  User,
  Hourglass,
  UserCheck,
  UserCog,
  AlertTriangle,
  UserMinus,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Avatar";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { cn } from "@/lib/utils/cn";

interface MentorManagerDashboardProps {
  onSelectMentor: (id: string) => void;
  onOpenChat: (id: string) => void;
  onAuditMentor?: (id: string) => void;
  onOpenProfile?: (id: string) => void;
  onUpdateMentorProfile: (mentorId: string, data: Partial<Mentor>) => void;
  onAddMeeting: (meeting: Partial<Meeting>) => void;
  onUpdateMeeting: (meetingId: string, data: Partial<Meeting>) => void;
  students: Student[];
  mentors: Mentor[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  studentAssignments: StudentAssignment[];
  onAssignStudent: (studentId: string, mentorId: string) => void;
  onTransferStudent: (studentId: string, mentorId: string) => void;
  onUnassignStudent?: (studentId: string) => void;
  activeTab?: string;
  notifications?: SystemNotification[];
  title?: string;
  subtitle?: string;
}

function displayName(mentor: Mentor) {
  const name = mentor.name?.trim();
  if (name && name !== mentor.email) return name;
  return name || mentor.email || "Mentor";
}

function complianceTone(score: number) {
  if (score < 80) return "text-rose-400";
  if (score < 90) return "text-amber-400";
  return "text-emerald-400";
}

function complianceBar(score: number) {
  if (score < 80) return "bg-rose-500";
  if (score < 90) return "bg-amber-500";
  return "bg-emerald-500";
}

function capacityColor(count: number) {
  if (count > 8) return "bg-rose-500";
  if (count > 5) return "bg-amber-500";
  return "bg-indigo-500";
}

const MentorManagerDashboard: React.FC<MentorManagerDashboardProps> = ({
  onSelectMentor,
  onOpenChat,
  onAuditMentor,
  onOpenProfile,
  onUpdateMentorProfile: _onUpdateMentorProfile,
  onAddMeeting: _onAddMeeting,
  onUpdateMeeting: _onUpdateMeeting,
  students,
  mentors,
  meetings,
  actionItems,
  studentAssignments,
  onAssignStudent,
  onTransferStudent,
  onUnassignStudent,
  notifications = [],
}) => {
  const filteredMentors = useMemo(
    () => mentors.filter((m) => m.role !== "ADMIN"),
    [mentors],
  );
  const [activeView, setActiveView] = useState<"mentors" | "assignments">("mentors");
  const [assignmentGroup, setAssignmentGroup] = useState<
    "unassigned" | "pending" | "assigned" | "workloads"
  >("unassigned");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [mentorSearch, setMentorSearch] = useState("");

  const openProfile = (id: string) => {
    if (onOpenProfile) onOpenProfile(id);
  };

  // Clear any leftover page-header CTA from other Mentor Ops views
  usePageHeaderAction(null);

  const searchableMentors = useMemo(() => {
    const q = mentorSearch.trim().toLowerCase();
    if (!q) return filteredMentors;
    return filteredMentors.filter(
      (m) =>
        displayName(m).toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.school?.toLowerCase().includes(q),
    );
  }, [filteredMentors, mentorSearch]);

  const avgCompliance = useMemo(() => {
    if (filteredMentors.length === 0) return 0;
    const total = filteredMentors.reduce((sum, m) => sum + (m.complianceScore || 0), 0);
    return Math.round(total / filteredMentors.length);
  }, [filteredMentors]);

  const criticalMentors = useMemo(
    () => filteredMentors.filter((m) => (m.complianceScore || 0) < 80),
    [filteredMentors],
  );
  const atRiskMentors = useMemo(
    () =>
      filteredMentors.filter((m) => {
        const s = m.complianceScore || 0;
        return s >= 80 && s < 90;
      }),
    [filteredMentors],
  );
  const compliantMentors = useMemo(
    () => filteredMentors.filter((m) => (m.complianceScore || 0) >= 90),
    [filteredMentors],
  );
  const highCapacityMentors = useMemo(
    () => filteredMentors.filter((m) => (m.studentIds || []).length > 8),
    [filteredMentors],
  );

  const pendingStudentIds = useMemo(
    () =>
      studentAssignments
        .filter((a) => a.status === "PENDING")
        .map((a) => a.studentId)
        .filter(Boolean) as string[],
    [studentAssignments],
  );

  const unassignedStudents = useMemo(
    () => students.filter((s) => !s.mentorId && !pendingStudentIds.includes(s.id)),
    [students, pendingStudentIds],
  );

  const mentorOptions = useMemo(
    () =>
      filteredMentors.map((m) => ({
        value: m.id,
        label: `${displayName(m)} (${(m.studentIds || []).length}/10)`,
      })),
    [filteredMentors],
  );

  const filterStudents = (list: Student[]) => {
    const q = assignmentSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q),
    );
  };

  const urgentNotifs = notifications.filter((n) => n.type === "URGENT");

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Engagement-style tab strip */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
        <button
          type="button"
          onClick={() => setActiveView("mentors")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all cursor-pointer",
            activeView === "mentors"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white",
          )}
        >
          <UserCog className="w-4 h-4" />
          Mentors
        </button>
        <button
          type="button"
          onClick={() => setActiveView("assignments")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all cursor-pointer",
            activeView === "assignments"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white",
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Assignments
          {unassignedStudents.length > 0 && (
            <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300">
              {unassignedStudents.length}
            </span>
          )}
        </button>
      </div>

      {/* Page overview cards — mentors tab only */}
      {activeView === "mentors" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
            label="SLA Risk"
            value={criticalMentors.length}
            hint="Mentors below 80% compliance"
            tone="rose"
          />
          <OverviewCard
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            label="At Risk"
            value={atRiskMentors.length}
            hint="Mentors between 80–89% compliance"
            tone="amber"
          />
          <OverviewCard
            icon={<Users className="w-5 h-5 text-indigo-400" />}
            label="Unassigned"
            value={unassignedStudents.length}
            hint={`${highCapacityMentors.length} mentors near capacity (>8)`}
            tone="indigo"
            onClick={() => {
              setAssignmentGroup("unassigned");
              setActiveView("assignments");
            }}
          />
          <OverviewCard
            icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
            label="Avg Compliance"
            value={`${avgCompliance}%`}
            hint={`${compliantMentors.length} mentors at 90%+`}
            tone="emerald"
          />
        </div>
      )}

      {urgentNotifs.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {urgentNotifs.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{n.title}</p>
                <p className="text-xs text-slate-400">{n.message}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setActiveView("assignments")}>
                Fix
              </Button>
            </div>
          ))}
        </div>
      )}

      {activeView === "mentors" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Mentor Roster</h3>
              <p className="text-sm text-slate-500">
                {filteredMentors.length} mentors · {highCapacityMentors.length} near capacity
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={mentorSearch}
                onChange={(e) => setMentorSearch(e.target.value)}
                placeholder="Search mentors…"
                className="pl-9"
              />
            </div>
          </div>

          {searchableMentors.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="No mentors found"
              description={
                mentorSearch
                  ? "Try a different search term."
                  : "Invite mentors from User Management to populate this list."
              }
            />
          ) : (
            <div className="grid gap-3">
              {searchableMentors.map((mentor) => {
                const name = displayName(mentor);
                const mentorStudents = students.filter((s) => s.mentorId === mentor.id);
                const mentorStudentIds = mentorStudents.map((s) => s.id);
                const now = new Date();
                const score = mentor.complianceScore || 0;
                const studentCount = (mentor.studentIds || []).length;
                const latency = String(
                  mentor.avgResponseTime ?? mentor.profile?.avg_response_time ?? "—",
                );

                const studentsWithoutMeeting = mentorStudents.filter((student) => {
                  const hasUpcoming = meetings.some(
                    (m) =>
                      (m.studentId || m.student_id) === student.id &&
                      !m.completed &&
                      new Date(m.date) > now,
                  );
                  return !hasUpcoming;
                }).length;

                const overdueTasksCount = actionItems.filter((item) => {
                  const sid = item.studentId || item.student_id || "";
                  return mentorStudentIds.includes(sid) && item.status === "OVERDUE";
                }).length;

                const fortyFiveDaysFromNow = new Date();
                fortyFiveDaysFromNow.setDate(now.getDate() + 45);
                const studentsWithNoTasksSoon = mentorStudents.filter((student) => {
                  const hasTasksSoon = actionItems.some((item) => {
                    const sid = item.studentId || item.student_id;
                    const due = item.dueDate || (item as { due_date?: string }).due_date;
                    if (!due || sid !== student.id) return false;
                    const dueDate = new Date(due);
                    return dueDate <= fortyFiveDaysFromNow && dueDate >= now;
                  });
                  return !hasTasksSoon;
                }).length;

                return (
                  <div
                    key={mentor.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-indigo-500/30"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={name} src={mentor.avatar} size="md" className="rounded-xl" />
                        <div className="min-w-0">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <h4 className="truncate font-semibold text-white">{name}</h4>
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                score < 80
                                  ? "bg-rose-500/20 text-rose-400"
                                  : score < 90
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-emerald-500/20 text-emerald-400",
                              )}
                            >
                              {score}% compliant
                            </span>
                          </div>
                          {mentor.email && mentor.email !== name && (
                            <p className="truncate text-sm text-slate-500">{mentor.email}</p>
                          )}
                          <p className="mt-0.5 text-xs text-slate-500">
                            {studentCount} students · latency {latency}
                            {mentor.school ? ` · ${mentor.school}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 sm:min-w-[280px]">
                        <RowMetric label="No meeting" value={studentsWithoutMeeting} warn />
                        <RowMetric label="Overdue" value={overdueTasksCount} warn />
                        <RowMetric label="No tasks" value={studentsWithNoTasksSoon} warn />
                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            Compliance
                          </p>
                          <p className={cn("text-sm font-bold tabular-nums", complianceTone(score))}>
                            {score}%
                          </p>
                          <div className="mx-auto mt-1 h-1 w-full max-w-[48px] overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={cn("h-full", complianceBar(score))}
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                          onClick={() => onOpenChat(mentor.id)}
                        >
                          Chat
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Users className="w-3.5 h-3.5" />}
                          onClick={() => onSelectMentor(mentor.id)}
                        >
                          Students
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<User className="w-3.5 h-3.5" />}
                          onClick={() => openProfile(mentor.id)}
                        >
                          Profile
                        </Button>
                        <Button
                          size="sm"
                          leftIcon={<Activity className="w-3.5 h-3.5" />}
                          onClick={() => onAuditMentor?.(mentor.id)}
                        >
                          Audit
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <AssignmentsPanel
          assignmentSearch={assignmentSearch}
          setAssignmentSearch={setAssignmentSearch}
          assignmentGroup={assignmentGroup}
          setAssignmentGroup={setAssignmentGroup}
          unassignedStudents={filterStudents(unassignedStudents)}
          pendingStudents={filterStudents(
            students.filter((s) => pendingStudentIds.includes(s.id)),
          )}
          assignedStudents={filterStudents(students.filter((s) => s.mentorId))}
          studentAssignments={studentAssignments}
          mentors={mentors}
          filteredMentors={filteredMentors}
          mentorOptions={mentorOptions}
          onAssignStudent={onAssignStudent}
          onTransferStudent={onTransferStudent}
          onUnassignStudent={onUnassignStudent}
          onOpenProfile={openProfile}
        />
      )}
    </div>
  );
};

function OverviewCard({
  icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
  tone: "rose" | "amber" | "indigo" | "emerald";
  onClick?: () => void;
}) {
  const tones = {
    rose: "text-rose-400 border-rose-500/20",
    amber: "text-amber-400 border-amber-500/20",
    indigo: "text-indigo-400 border-indigo-500/20",
    emerald: "text-emerald-400 border-emerald-500/20",
  };

  const className = cn(
    "rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition-colors",
    onClick && "cursor-pointer hover:border-indigo-500/40",
  );

  const inner = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-950",
            tones[tone],
          )}
        >
          {icon}
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", tones[tone].split(" ")[0])}>
          {label}
        </span>
      </div>
      <p className="text-3xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

function RowMetric({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={cn(
          "text-sm font-bold tabular-nums",
          warn && value > 0 ? "text-rose-400" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AssignmentsPanel({
  assignmentSearch,
  setAssignmentSearch,
  assignmentGroup,
  setAssignmentGroup,
  unassignedStudents,
  pendingStudents,
  assignedStudents,
  studentAssignments,
  mentors,
  filteredMentors,
  mentorOptions,
  onAssignStudent,
  onTransferStudent,
  onUnassignStudent,
  onOpenProfile,
}: {
  assignmentSearch: string;
  setAssignmentSearch: (v: string) => void;
  assignmentGroup: "unassigned" | "pending" | "assigned" | "workloads";
  setAssignmentGroup: (v: "unassigned" | "pending" | "assigned" | "workloads") => void;
  unassignedStudents: Student[];
  pendingStudents: Student[];
  assignedStudents: Student[];
  studentAssignments: StudentAssignment[];
  mentors: Mentor[];
  filteredMentors: Mentor[];
  mentorOptions: Array<{ value: string; label: string }>;
  onAssignStudent: (studentId: string, mentorId: string) => void;
  onTransferStudent: (studentId: string, mentorId: string) => void;
  onUnassignStudent?: (studentId: string) => void;
  onOpenProfile: (id: string) => void;
}) {
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [transferPick, setTransferPick] = useState<Record<string, string>>({});

  const navItems = [
    {
      id: "unassigned" as const,
      label: "Unassigned",
      description: "Need a mentor",
      count: unassignedStudents.length,
      icon: Users,
      tone: "indigo",
    },
    {
      id: "pending" as const,
      label: "Pending",
      description: "Awaiting accept",
      count: pendingStudents.length,
      icon: Hourglass,
      tone: "amber",
    },
    {
      id: "assigned" as const,
      label: "Assigned",
      description: "Active pairings",
      count: assignedStudents.length,
      icon: UserCheck,
      tone: "emerald",
    },
  ];

  const titles = {
    unassigned: "Unassigned students",
    pending: "Pending acceptance",
    assigned: "Assigned students",
    workloads: "Mentor workloads",
  };

  const subtitles = {
    unassigned: "Select a mentor and confirm. Pairings stay pending until accepted.",
    pending: "Waiting on the mentor to accept. You can reassign if needed.",
    assigned: "Transfer to another mentor or unassign entirely.",
    workloads: "Click a mentor to open their profile.",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Left nav */}
        <aside className="border-b border-slate-800 bg-slate-950/40 p-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Queues
          </p>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = assignmentGroup === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAssignmentGroup(item.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "bg-indigo-600/15 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      selected
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                        : "border-slate-800 bg-slate-900 text-slate-500",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {item.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                      selected
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "bg-slate-800 text-slate-500",
                      item.count > 0 && item.id === "unassigned" && !selected && "text-indigo-300",
                      item.count > 0 && item.id === "pending" && !selected && "text-amber-300",
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="my-3 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => setAssignmentGroup("workloads")}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
              assignmentGroup === "workloads"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-800/70 hover:text-white",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                assignmentGroup === "workloads"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-800 bg-slate-900 text-slate-500",
              )}
            >
              <Activity className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">Workloads</span>
              <span className="block truncate text-[11px] text-slate-500">Capacity view</span>
            </span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                assignmentGroup === "workloads"
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-slate-800 text-slate-500",
              )}
            >
              {filteredMentors.length}
            </span>
          </button>
        </aside>

        {/* Main pane */}
        <section className="flex min-h-[420px] flex-col">
          <header className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">{titles[assignmentGroup]}</h3>
              <p className="text-sm text-slate-500">{subtitles[assignmentGroup]}</p>
            </div>
            {assignmentGroup !== "workloads" && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="pl-9"
                />
              </div>
            )}
          </header>

          <div className="flex-1 overflow-auto">
            {assignmentGroup === "unassigned" && (
              unassignedStudents.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Users className="w-8 h-8" />}
                    title="No unassigned students"
                    description="Everyone currently has a mentor pairing."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {unassignedStudents.map((student) => {
                    const picked = assignPick[student.id] || "";
                    return (
                      <li
                        key={student.id}
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
                      >
                        <StudentRow student={student} />
                        <div className="flex w-full items-center gap-2 sm:w-[280px] sm:shrink-0">
                          <div className="min-w-0 flex-1">
                            <SelectMenu
                              value={picked}
                              onChange={(mentorId) =>
                                setAssignPick((prev) => ({ ...prev, [student.id]: mentorId }))
                              }
                              options={[{ value: "", label: "Select mentor…" }, ...mentorOptions]}
                              placeholder="Select mentor…"
                            />
                          </div>
                          <Button
                            size="sm"
                            disabled={!picked}
                            onClick={() => {
                              if (!picked) return;
                              onAssignStudent(student.id, picked);
                              setAssignPick((prev) => {
                                const next = { ...prev };
                                delete next[student.id];
                                return next;
                              });
                            }}
                          >
                            Assign
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {assignmentGroup === "pending" && (
              pendingStudents.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Hourglass className="w-8 h-8" />}
                    title="No pending assignments"
                    description="Nothing waiting on mentor acceptance."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {pendingStudents.map((student) => {
                    const assignment = studentAssignments.find(
                      (a) => a.studentId === student.id && a.status === "PENDING",
                    );
                    const mentor = mentors.find((m) => m.id === assignment?.mentorId);
                    const picked = assignPick[student.id] || "";
                    return (
                      <li
                        key={student.id}
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
                      >
                        <div className="min-w-0">
                          <StudentRow student={student} />
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:pl-11">
                            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                              Pending
                            </span>
                            <span>
                              Waiting on{" "}
                              <span className="font-medium text-amber-400">
                                {mentor ? displayName(mentor) : "Unknown"}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-[280px] sm:shrink-0">
                          <div className="min-w-0 flex-1">
                            <SelectMenu
                              value={picked}
                              onChange={(mentorId) =>
                                setAssignPick((prev) => ({ ...prev, [student.id]: mentorId }))
                              }
                              options={[{ value: "", label: "Reassign…" }, ...mentorOptions]}
                              placeholder="Reassign…"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!picked}
                            onClick={() => {
                              if (!picked) return;
                              onAssignStudent(student.id, picked);
                              setAssignPick((prev) => {
                                const next = { ...prev };
                                delete next[student.id];
                                return next;
                              });
                            }}
                          >
                            Reassign
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {assignmentGroup === "assigned" && (
              assignedStudents.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<UserCheck className="w-8 h-8" />}
                    title="No assigned students yet"
                    description="Assigned students will show here for transfer or unassign."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {assignedStudents.map((student) => {
                    const currentMentor = filteredMentors.find((m) => m.id === student.mentorId);
                    const transferOptions = mentorOptions.filter(
                      (o) => o.value !== student.mentorId,
                    );
                    const picked = transferPick[student.id] || "";
                    return (
                      <li
                        key={student.id}
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
                      >
                        <div className="min-w-0">
                          <StudentRow student={student} />
                          <p className="mt-1.5 text-xs text-slate-500 sm:pl-11">
                            Mentor:{" "}
                            <span className="font-medium text-indigo-400">
                              {currentMentor ? displayName(currentMentor) : "Unknown"}
                            </span>
                          </p>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:max-w-md sm:justify-end">
                          <div className="min-w-0 flex-1 sm:w-44">
                            <SelectMenu
                              value={picked}
                              onChange={(mentorId) =>
                                setTransferPick((prev) => ({ ...prev, [student.id]: mentorId }))
                              }
                              options={[
                                { value: "", label: "Transfer to…" },
                                ...transferOptions,
                              ]}
                              placeholder="Transfer to…"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!picked}
                            onClick={() => {
                              if (!picked) return;
                              onTransferStudent(student.id, picked);
                              setTransferPick((prev) => {
                                const next = { ...prev };
                                delete next[student.id];
                                return next;
                              });
                            }}
                          >
                            Transfer
                          </Button>
                          {onUnassignStudent && (
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={<UserMinus className="w-3.5 h-3.5" />}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Unassign ${student.name} from their mentor? They will have no mentor until reassigned.`,
                                  )
                                ) {
                                  onUnassignStudent(student.id);
                                }
                              }}
                            >
                              Unassign
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {assignmentGroup === "workloads" && (
              filteredMentors.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Activity className="w-8 h-8" />}
                    title="No mentors"
                    description="Mentor workloads will appear here once mentors are available."
                  />
                </div>
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                  {filteredMentors.map((mentor) => {
                    const count = (mentor.studentIds || []).length;
                    const pct = Math.min((count / 10) * 100, 100);
                    return (
                      <button
                        key={mentor.id}
                        type="button"
                        onClick={() => onOpenProfile(mentor.id)}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left transition-colors hover:border-emerald-500/30"
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <Avatar name={displayName(mentor)} src={mentor.avatar} size="md" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {displayName(mentor)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {count}/10 students
                              {count > 8 ? (
                                <span className="ml-1.5 text-rose-400">Near capacity</span>
                              ) : count > 5 ? (
                                <span className="ml-1.5 text-amber-400">Busy</span>
                              ) : (
                                <span className="ml-1.5 text-emerald-400">Available</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className={cn("h-full transition-all", capacityColor(count))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StudentRow({ student }: { student: Student }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={student.name} src={student.avatar} size="md" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{student.name}</p>
        <p className="truncate text-sm text-slate-500">{student.email}</p>
      </div>
    </div>
  );
}

export default MentorManagerDashboard;
