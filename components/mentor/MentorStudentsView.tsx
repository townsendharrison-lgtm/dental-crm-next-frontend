"use client";

import React, { useMemo, useState } from "react";
import {
  Users,
  Search,
  Mail,
  ChevronRight,
  UserMinus,
  Check,
  X,
  UserPlus,
} from "lucide-react";
import type { Student, Meeting, StudentAssignment } from "@/lib/types";
import { ReadinessStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Avatar";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcceptAssignmentModal } from "@/components/mentor/AcceptAssignmentModal";
import { cn } from "@/lib/utils/cn";

interface MentorStudentsViewProps {
  students: Student[];
  pendingAssignments?: StudentAssignment[];
  allStudents?: Student[];
  onSelectStudent: (id: string, initialTab?: string) => void;
  onMessageStudent?: (id: string) => void;
  meetings: Meeting[];
  onUnassignStudent?: (studentId: string) => void;
  onAcceptAssignment?: (
    assignmentId: string,
    availableTimes: string[],
    timezone: string,
    welcomeMessage: string,
  ) => void;
  onDeclineAssignment?: (assignmentId: string) => void;
  defaultAvailability?: string[];
  welcomeMessageTemplate?: string;
  acceptBusy?: boolean;
  hideTitle?: boolean;
}

const DEFAULT_WELCOME = `Hi [Mentee Name],

I'm excited to work with you as your mentor! Looking forward to supporting you on your dental school journey.

Best,
[Mentor Name]`;

type RosterRow = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  readiness?: ReadinessStatus | string;
  strengthScore?: number | null;
  gpa?: number | string | null;
  datScore?: number | null;
  openActionItemsCount?: number;
  progress?: number;
  pendingAssignment?: StudentAssignment;
};

function readinessLabel(status?: ReadinessStatus | string) {
  if (status === ReadinessStatus.GREEN || status === "GREEN") return "Ready";
  if (status === ReadinessStatus.YELLOW || status === "YELLOW") return "At risk";
  if (status === ReadinessStatus.RED || status === "RED") return "Critical";
  return "Unknown";
}

function readinessTone(status?: ReadinessStatus | string) {
  if (status === ReadinessStatus.GREEN || status === "GREEN") {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  }
  if (status === ReadinessStatus.YELLOW || status === "YELLOW") {
    return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  }
  if (status === ReadinessStatus.RED || status === "RED") {
    return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  }
  return "bg-slate-800 text-slate-400 border-slate-700";
}

function readinessDot(status?: ReadinessStatus | string) {
  if (status === ReadinessStatus.GREEN || status === "GREEN") return "bg-emerald-500";
  if (status === ReadinessStatus.YELLOW || status === "YELLOW") return "bg-amber-500";
  if (status === ReadinessStatus.RED || status === "RED") return "bg-rose-500";
  return "bg-slate-500";
}

function assignmentStudentId(a: StudentAssignment) {
  return a.studentId || a.student_id;
}

const MentorStudentsView: React.FC<MentorStudentsViewProps> = ({
  students: assignedStudents,
  pendingAssignments = [],
  allStudents = [],
  onSelectStudent,
  onMessageStudent,
  meetings,
  onUnassignStudent,
  onAcceptAssignment,
  onDeclineAssignment,
  defaultAvailability = [],
  welcomeMessageTemplate = DEFAULT_WELCOME,
  acceptBusy = false,
  hideTitle = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReadinessStatus | "ALL" | "PENDING">("ALL");
  const [acceptingAssignment, setAcceptingAssignment] = useState<StudentAssignment | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const roster = useMemo(() => {
    const byId = new Map<string, RosterRow>();

    assignedStudents.forEach((s) => {
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: s.avatar,
        readiness: s.readiness,
        strengthScore: s.strengthScore,
        gpa: s.gpa,
        datScore: s.datScore,
        openActionItemsCount: s.openActionItemsCount,
        progress: s.progress,
      });
    });

    pendingAssignments.forEach((assignment) => {
      const sid = assignmentStudentId(assignment);
      if (!sid) return;

      const fromList =
        allStudents.find((s) => s.id === sid) || assignedStudents.find((s) => s.id === sid);
      const fromAssignment = assignment.student;
      const existing = byId.get(sid);

      byId.set(sid, {
        id: sid,
        name: fromList?.name || fromAssignment?.name || existing?.name || "Student",
        email: fromList?.email || fromAssignment?.email || existing?.email || "",
        avatar: fromList?.avatar || fromAssignment?.avatar || existing?.avatar || undefined,
        readiness: fromList?.readiness ?? existing?.readiness,
        strengthScore: fromList?.strengthScore ?? existing?.strengthScore,
        gpa: fromList?.gpa ?? existing?.gpa,
        datScore: fromList?.datScore ?? existing?.datScore,
        openActionItemsCount: fromList?.openActionItemsCount ?? existing?.openActionItemsCount,
        progress: fromList?.progress ?? existing?.progress,
        pendingAssignment: assignment,
      });
    });

    return Array.from(byId.values()).sort((a, b) => {
      if (a.pendingAssignment && !b.pendingAssignment) return -1;
      if (!a.pendingAssignment && b.pendingAssignment) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [assignedStudents, pendingAssignments, allStudents]);

  const getNextMeetingDate = (studentId: string) => {
    const now = new Date();
    const upcoming = meetings
      .filter(
        (m) =>
          (m.studentId || m.student_id) === studentId &&
          !m.completed &&
          new Date(m.date) > now,
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return upcoming ? new Date(upcoming.date).toLocaleDateString() : "—";
  };

  const filtered = roster.filter((row) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (filterStatus === "PENDING") return !!row.pendingAssignment;
    if (filterStatus === "ALL") return true;
    return row.readiness === filterStatus;
  });

  const pendingCount = pendingAssignments.length;
  const readyCount = roster.filter((s) => s.readiness === ReadinessStatus.GREEN && !s.pendingAssignment).length;
  const atRiskCount = roster.filter((s) => s.readiness === ReadinessStatus.YELLOW && !s.pendingAssignment).length;
  const criticalCount = roster.filter((s) => s.readiness === ReadinessStatus.RED && !s.pendingAssignment).length;
  const assignedCount = roster.filter((s) => !s.pendingAssignment).length;

  const acceptingName = acceptingAssignment
    ? roster.find((r) => r.id === assignmentStudentId(acceptingAssignment))?.name
    : undefined;

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div>
          <h3 className="text-base font-semibold text-white">Roster</h3>
          <p className="text-sm text-slate-500">Assigned students and pending mentoring requests.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <OverviewStat label="Assigned" value={assignedCount} hint="Active mentees" tone="indigo" />
        <OverviewStat
          label="Pending"
          value={pendingCount}
          hint="Awaiting accept"
          tone="indigo"
          valueClass="text-indigo-400"
        />
        <OverviewStat
          label="Ready"
          value={readyCount}
          hint="Green readiness"
          tone="emerald"
          valueClass="text-emerald-400"
        />
        <OverviewStat
          label="At risk"
          value={atRiskCount}
          hint="Yellow readiness"
          tone="amber"
          valueClass="text-amber-400"
        />
        <OverviewStat
          label="Critical"
          value={criticalCount}
          hint="Red readiness"
          tone="rose"
          valueClass="text-rose-400"
        />
      </div>

      {pendingCount > 0 && onAcceptAssignment && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {pendingCount} pending assignment{pendingCount === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Accept to start mentoring. Students stay unlinked until you confirm.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            {pendingAssignments.map((assignment) => {
              const sid = assignmentStudentId(assignment);
              const row = roster.find((r) => r.id === sid);
              const name = row?.name || assignment.student?.name || "Student";
              const email = row?.email || assignment.student?.email || "";
              const avatar = row?.avatar || assignment.student?.avatar || undefined;
              return (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-3 rounded-lg border border-indigo-500/20 bg-slate-950/50 p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={name} src={avatar} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{name}</p>
                      <p className="truncate text-xs text-slate-500">{email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {decliningId === assignment.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            onDeclineAssignment?.(assignment.id);
                            setDecliningId(null);
                          }}
                        >
                          Confirm decline
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setDecliningId(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => setAcceptingAssignment(assignment)}
                        >
                          Accept
                        </Button>
                        {onDeclineAssignment && (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<X className="w-3.5 h-3.5" />}
                            onClick={() => setDecliningId(assignment.id)}
                          >
                            Decline
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or email…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectMenu
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as ReadinessStatus | "ALL" | "PENDING")}
            options={[
              { value: "ALL", label: "All status" },
              { value: "PENDING", label: "Pending accept" },
              { value: ReadinessStatus.GREEN, label: "Ready" },
              { value: ReadinessStatus.YELLOW, label: "At risk" },
              { value: ReadinessStatus.RED, label: "Critical" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={pendingCount > 0 && filterStatus !== "PENDING" ? "No assigned students yet" : "No students found"}
          description={
            pendingCount > 0
              ? "Accept a pending assignment above to add them to your roster."
              : "Try adjusting your search or filter criteria."
          }
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map((row) => {
            const pending = !!row.pendingAssignment;
            const readiness = row.readiness || ReadinessStatus.GREEN;
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-xl border bg-slate-900 px-3 py-3 transition-colors sm:px-4",
                  pending
                    ? "border-indigo-500/40"
                    : "border-slate-800 hover:border-indigo-500/30",
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar name={row.name} src={row.avatar} size="md" />
                      {!pending && (
                        <span
                          className={cn(
                            "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900",
                            readinessDot(readiness),
                          )}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-semibold text-white">{row.name}</h4>
                        {pending ? (
                          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                            Pending accept
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                              readinessTone(readiness),
                            )}
                          >
                            {readinessLabel(readiness)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-slate-500">
                        {row.email || "No email"}
                        {!pending && (
                          <>
                            <span className="text-slate-600"> · </span>
                            {row.openActionItemsCount ?? 0} actions
                            <span className="text-slate-600"> · </span>
                            Next {getNextMeetingDate(row.id)}
                            <span className="text-slate-600"> · </span>
                            {row.progress ?? 0}% progress
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {!pending && (
                    <div className="flex shrink-0 items-center gap-4 text-center sm:gap-5">
                      <Metric label="Strength" value={row.strengthScore ?? 0} />
                      <Metric label="GPA" value={row.gpa ?? "N/A"} />
                      <Metric label="DAT" value={row.datScore ?? 0} />
                    </div>
                  )}

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
                    {pending && row.pendingAssignment && onAcceptAssignment ? (
                      decliningId === row.pendingAssignment.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              onDeclineAssignment?.(row.pendingAssignment!.id);
                              setDecliningId(null);
                            }}
                          >
                            Confirm decline
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setDecliningId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            leftIcon={<Check className="w-3.5 h-3.5" />}
                            onClick={() => setAcceptingAssignment(row.pendingAssignment!)}
                          >
                            Accept
                          </Button>
                          {onDeclineAssignment && (
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<X className="w-3.5 h-3.5" />}
                              onClick={() => setDecliningId(row.pendingAssignment!.id)}
                            >
                              Decline
                            </Button>
                          )}
                        </>
                      )
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Mail className="w-3.5 h-3.5" />}
                          onClick={() =>
                            onMessageStudent
                              ? onMessageStudent(row.id)
                              : onSelectStudent(row.id, "messages")
                          }
                        >
                          Message
                        </Button>
                        {onUnassignStudent && (
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<UserMinus className="w-3.5 h-3.5" />}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Unassign ${row.name}? They will have no mentor until reassigned.`,
                                )
                              ) {
                                onUnassignStudent(row.id);
                              }
                            }}
                          >
                            Unassign
                          </Button>
                        )}
                        <Button
                          size="sm"
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                          onClick={() => onSelectStudent(row.id, "overview")}
                        >
                          View
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AcceptAssignmentModal
        open={!!acceptingAssignment}
        studentName={acceptingName}
        defaultAvailability={defaultAvailability}
        welcomeTemplate={welcomeMessageTemplate}
        isSubmitting={acceptBusy}
        onClose={() => setAcceptingAssignment(null)}
        onConfirm={(times, timezone, message) => {
          if (!acceptingAssignment || !onAcceptAssignment) return;
          onAcceptAssignment(acceptingAssignment.id, times, timezone, message);
          setAcceptingAssignment(null);
        }}
      />
    </div>
  );
};

function OverviewStat({
  label,
  value,
  hint,
  tone,
  valueClass,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "indigo" | "emerald" | "amber" | "rose";
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span
          className={cn("h-2 w-2 rounded-full shrink-0", {
            indigo: "bg-indigo-500",
            emerald: "bg-emerald-500",
            amber: "bg-amber-500",
            rose: "bg-rose-500",
          }[tone])}
        />
      </div>
      <p className={cn("text-2xl font-bold tabular-nums text-white", valueClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[3.25rem]">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

export default MentorStudentsView;
