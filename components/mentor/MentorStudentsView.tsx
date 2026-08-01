"use client";

import React, { useMemo, useState } from "react";
import {
  Users,
  Search,
  Calendar,
  MessageSquare,
  Check,
  X,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { parseLocalDate, isUpcomingMeetingDate, formatMeetingLocal } from "@/lib/utils/dateUtils";
import { TimezoneHint } from "@/components/ui/TimezoneHint";
import { preferredDatScore } from "@/lib/utils/studentMetrics";
import type { Student, Meeting, StudentAssignment } from "@/lib/types";
import { ReadinessStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Avatar";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcceptAssignmentModal } from "@/components/mentor/AcceptAssignmentModal";
import { DEFAULT_ASSIGNMENT_WELCOME } from "@/lib/api/adminSettings";
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

type RosterRow = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  readiness?: ReadinessStatus | string;
  strengthScore?: number | null;
  gpa?: number | string | null;
  datScore?: number | null;
  progress?: number;
  applicationCycle?: string | null;
  lastMeetingDate?: string | null;
  lastContactDate?: string | null;
  pendingAssignment?: StudentAssignment;
};

function riskLabel(status?: ReadinessStatus | string) {
  if (status === ReadinessStatus.GREEN || status === "GREEN") return "Low Risk";
  if (status === ReadinessStatus.YELLOW || status === "YELLOW") return "Moderate";
  if (status === ReadinessStatus.RED || status === "RED") return "High Risk";
  return "Moderate";
}

function readinessFromProgress(progress?: number | null) {
  const p = Math.max(0, Math.min(100, Number(progress) || 0));
  if (p >= 70) return ReadinessStatus.GREEN;
  if (p >= 40) return ReadinessStatus.YELLOW;
  return ReadinessStatus.RED;
}

function assignmentStudentId(a: StudentAssignment) {
  return a.studentId || a.student_id;
}

function journeyProgressOf(row: RosterRow) {
  return Math.max(0, Math.min(100, Number(row.progress ?? 0) || 0));
}

function formatShortDate(raw?: string | null) {
  if (!raw) return "TBD";
  try {
    return parseLocalDate(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "TBD";
  }
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
  welcomeMessageTemplate = DEFAULT_ASSIGNMENT_WELCOME,
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
      const progress = s.progress ?? s.profile?.progress;
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: s.avatar,
        readiness: readinessFromProgress(progress),
        strengthScore: s.strengthScore ?? s.profile?.strength_score,
        gpa: s.gpa ?? s.profile?.gpa,
        datScore: preferredDatScore(s),
        progress,
        applicationCycle: s.applicationCycle ?? s.profile?.application_cycle,
        lastMeetingDate: s.lastMeetingDate ?? s.profile?.last_meeting_date,
        lastContactDate: s.lastContactDate ?? s.profile?.last_contact_date,
      });
    });

    pendingAssignments.forEach((assignment) => {
      const sid = assignmentStudentId(assignment);
      if (!sid) return;

      const fromList =
        allStudents.find((s) => s.id === sid) || assignedStudents.find((s) => s.id === sid);
      const fromAssignment = assignment.student;
      const existing = byId.get(sid);

      const progress =
        fromList?.progress ?? fromList?.profile?.progress ?? existing?.progress;
      byId.set(sid, {
        id: sid,
        name: fromList?.name || fromAssignment?.name || existing?.name || "Student",
        email: fromList?.email || fromAssignment?.email || existing?.email || "",
        avatar: fromList?.avatar || fromAssignment?.avatar || existing?.avatar || undefined,
        readiness: readinessFromProgress(progress),
        strengthScore:
          fromList?.strengthScore ??
          fromList?.profile?.strength_score ??
          existing?.strengthScore,
        gpa: fromList?.gpa ?? fromList?.profile?.gpa ?? existing?.gpa,
        datScore:
          preferredDatScore(fromList) ??
          preferredDatScore(fromAssignment as Student | undefined) ??
          existing?.datScore,
        progress,
        applicationCycle:
          fromList?.applicationCycle ??
          fromList?.profile?.application_cycle ??
          existing?.applicationCycle,
        lastMeetingDate:
          fromList?.lastMeetingDate ??
          fromList?.profile?.last_meeting_date ??
          existing?.lastMeetingDate,
        lastContactDate:
          fromList?.lastContactDate ??
          fromList?.profile?.last_contact_date ??
          existing?.lastContactDate,
        pendingAssignment: assignment,
      });
    });

    return Array.from(byId.values()).sort((a, b) => {
      if (a.pendingAssignment && !b.pendingAssignment) return -1;
      if (!a.pendingAssignment && b.pendingAssignment) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [assignedStudents, pendingAssignments, allStudents]);

  const getNextMeeting = (studentId: string) => {
    const now = new Date();
    return meetings
      .filter(
        (m) =>
          (m.studentId || m.student_id) === studentId &&
          !m.completed &&
          isUpcomingMeetingDate(m.date, now),
      )
      .sort(
        (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      )[0];
  };

  const getNextMeetingDate = (studentId: string) => {
    const upcoming = getNextMeeting(studentId);
    return upcoming
      ? parseLocalDate(upcoming.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Not Scheduled";
  };

  const renderNextMeetingLabel = (studentId: string) => {
    const upcoming = getNextMeeting(studentId);
    if (!upcoming) return "Not Scheduled";
    const title = upcoming.title?.trim();
    const when = formatMeetingLocal(upcoming.date, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    return (
      <span className="inline-flex items-center gap-1">
        <span className="line-clamp-2">{title ? `${title} · ${when}` : when}</span>
        {upcoming.date.includes("T") ? <TimezoneHint dateIso={upcoming.date} /> : null}
      </span>
    );
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
  const readyCount = roster.filter(
    (s) => s.readiness === ReadinessStatus.GREEN && !s.pendingAssignment,
  ).length;
  const atRiskCount = roster.filter(
    (s) => s.readiness === ReadinessStatus.YELLOW && !s.pendingAssignment,
  ).length;
  const criticalCount = roster.filter(
    (s) => s.readiness === ReadinessStatus.RED && !s.pendingAssignment,
  ).length;
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
        />
        <OverviewStat label="At risk" value={atRiskCount} hint="Yellow readiness" tone="amber" />
        <OverviewStat
          label="Critical"
          value={criticalCount}
          hint="Red readiness"
          tone="rose"
        />
      </div>

      {pendingCount > 0 && filterStatus !== "PENDING" && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-white">
              Pending assignments ({pendingCount})
            </h4>
          </div>
          <div className="space-y-2">
            {pendingAssignments.map((assignment) => {
              const sid = assignmentStudentId(assignment);
              const row = roster.find((r) => r.id === sid);
              if (!row || !sid) return null;
              return (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-slate-950/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.name} src={row.avatar} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{row.name}</p>
                      <p className="truncate text-sm text-slate-500">{row.email || "No email"}</p>
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

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead className="border-b border-slate-800 bg-slate-950/30">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Student
              </th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Status &amp; Risk
              </th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Stats
              </th>
              <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Strength
              </th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Readiness
              </th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Next Meeting
              </th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Last / Next Session
              </th>
              <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((row) => {
              const pending = !!row.pendingAssignment;
              const journey = journeyProgressOf(row);
              const nextMeetingLabel = renderNextMeetingLabel(row.id);
              const prevSession = row.lastMeetingDate || row.lastContactDate || null;

              return (
                <tr
                  key={row.id}
                  onClick={() => {
                    if (!pending) onSelectStudent(row.id, "overview");
                  }}
                  className={cn(
                    "group transition-colors",
                    pending
                      ? "bg-indigo-500/[0.03]"
                      : "cursor-pointer hover:bg-slate-800/40",
                  )}
                >
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={row.avatar}
                        name={row.name}
                        size="lg"
                        className="rounded-2xl ring-2 ring-slate-800 transition-all group-hover:ring-indigo-500/50"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold tracking-tight text-white transition-colors group-hover:text-indigo-400">
                            {row.name}
                          </h4>
                          {pending && (
                            <span className="shrink-0 rounded border border-indigo-500/30 bg-indigo-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div>
                      <div
                        className={cn(
                          "mb-1 w-fit rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                          row.readiness === ReadinessStatus.GREEN || row.readiness === "GREEN"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : row.readiness === ReadinessStatus.YELLOW || row.readiness === "YELLOW"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : "border-rose-500/20 bg-rose-500/10 text-rose-400",
                        )}
                      >
                        {pending ? "Pending" : riskLabel(row.readiness)}
                      </div>
                      <p className="whitespace-nowrap text-[10px] font-medium text-slate-500">
                        {row.applicationCycle || "—"}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div>
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        GPA:{" "}
                        <span className="ml-1 text-sm text-white">
                          {row.gpa != null && row.gpa !== "" ? row.gpa : "N/A"}
                        </span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        DAT: {row.datScore != null ? row.datScore : "N/A"}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center align-middle">
                    <div className="inline-block rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-center shadow-inner">
                      <p className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                        Strength
                      </p>
                      <p className="text-lg font-black leading-none text-white">
                        {row.strengthScore != null ? row.strengthScore : "—"}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    {pending ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      <button
                        type="button"
                        title="Open Application Readiness"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(row.id, "applications");
                        }}
                        className="flex w-full max-w-[120px] items-center gap-3"
                      >
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${journey}%`,
                              backgroundColor:
                                journey >= 80
                                  ? "#10b981"
                                  : journey >= 50
                                    ? "#f59e0b"
                                    : "#f43f5e",
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-bold text-white">{journey}%</span>
                      </button>
                    )}
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div className="flex max-w-[200px] items-center gap-3">
                      <div className="shrink-0 rounded-lg bg-indigo-500/10 p-1.5">
                        <Calendar className="h-4 w-4 text-indigo-400" />
                      </div>
                      <span className="line-clamp-2 text-[10px] font-medium text-slate-300">
                        {pending ? "—" : nextMeetingLabel}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div className="whitespace-nowrap">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Prev:{" "}
                        <span className="ml-1 font-medium capitalize text-slate-300">
                          {pending ? "—" : formatShortDate(prevSession)}
                        </span>
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                        Next:{" "}
                        <span className="ml-1 font-bold capitalize">
                          {pending ? "—" : getNextMeetingDate(row.id)}
                        </span>
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      {pending && row.pendingAssignment && onAcceptAssignment ? (
                        decliningId === row.pendingAssignment.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeclineAssignment?.(row.pendingAssignment!.id);
                                setDecliningId(null);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDecliningId(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAcceptingAssignment(row.pendingAssignment!);
                              }}
                            >
                              Accept
                            </Button>
                            {onDeclineAssignment && (
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<X className="w-3.5 h-3.5" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDecliningId(row.pendingAssignment!.id);
                                }}
                              >
                                Decline
                              </Button>
                            )}
                          </>
                        )
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Send Message"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMessageStudent
                                ? onMessageStudent(row.id)
                                : onSelectStudent(row.id, "messages");
                            }}
                            className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-400 shadow-lg transition-all hover:border-indigo-500 hover:bg-indigo-600 hover:text-white"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          {onUnassignStudent && (
                            <button
                              type="button"
                              title="Unassign student"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `Unassign ${row.name}? They will have no mentor until reassigned.`,
                                  )
                                ) {
                                  onUnassignStudent(row.id);
                                }
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-400 shadow-lg transition-all hover:border-rose-500 hover:bg-rose-600 hover:text-white"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(row.id, "overview");
                            }}
                            className="whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all group-hover:border-indigo-500 group-hover:bg-indigo-600"
                          >
                            Profile
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center">
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title={
                      pendingCount > 0 && filterStatus !== "PENDING"
                        ? "No assigned students yet"
                        : "No students found"
                    }
                    description={
                      pendingCount > 0
                        ? "Accept a pending assignment above to add them to your roster."
                        : "Try adjusting your search or filter criteria."
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          className={cn("h-2 w-2 shrink-0 rounded-full", {
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

export default MentorStudentsView;
