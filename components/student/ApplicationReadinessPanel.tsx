"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Square,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useStudentCredentials } from "@/lib/hooks/useStudentNotesDexterity";
import { useUpdateStudent } from "@/lib/hooks/useStudentProfile";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import {
  buildApplicationReadiness,
  readinessStatusFromPercent,
  toggleManualReadinessFlag,
  type ReadinessManualKey,
} from "@/lib/utils/applicationReadiness";

interface ApplicationReadinessPanelProps {
  student: Student;
  /** Compact for Momentum side column; default full for profile. */
  compact?: boolean;
  className?: string;
  /** Called after a successful manual flag save (optional parent refresh). */
  onUpdated?: (student: Student) => void;
  /** Override staff deep-links (students use /student/... paths). */
  staffMode?: boolean;
}

function staffHref(href: string | undefined, studentId: string, staffMode: boolean) {
  if (!href || !staffMode) return href;
  if (href.includes("/letters")) return undefined;
  if (href.includes("/tracker")) return undefined;
  if (href.includes("/profile")) return undefined;
  return href;
}

export default function ApplicationReadinessPanel({
  student,
  compact = false,
  className,
  onUpdated,
  staffMode,
}: ApplicationReadinessPanelProps) {
  const { user } = useAuth();
  const isStaff =
    staffMode ??
    (user?.role === "ADMIN" ||
      user?.role === "MENTOR_MANAGER" ||
      user?.role === "MENTOR");
  const canEdit =
    !!user &&
    (user.id === student.id ||
      user.role === "ADMIN" ||
      user.role === "MENTOR_MANAGER" ||
      user.role === "MENTOR");

  const { data: experiences = [] } = useExperiences(student.id);
  const { data: credentials = [] } = useStudentCredentials(student.id);
  const { data: rawLor = [] } = useLorRequests(
    undefined,
    user?.role === "STUDENT" ? undefined : student.name,
  );
  const lorRequests = useMemo(
    () => rawLor.filter((r) => r.studentId === student.id),
    [rawLor, student.id],
  );

  const updateStudent = useUpdateStudent();
  const [savingKey, setSavingKey] = useState<ReadinessManualKey | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("dat");
  const syncingRef = useRef(false);

  const readiness = useMemo(
    () =>
      buildApplicationReadiness({
        student,
        experiences,
        lorRequests,
        credentials,
      }),
    [student, experiences, lorRequests, credentials],
  );

  const band = readinessStatusFromPercent(readiness.percent);
  const flagsKey = JSON.stringify(readiness.flags);

  // Keep stored progress + traffic-light readiness aligned with live checklist %
  useEffect(() => {
    if (!canEdit || syncingRef.current || savingKey) return;
    const storedProgress = Math.round(
      Number(student.progress ?? student.profile?.progress ?? 0) || 0,
    );
    const storedBand = String(
      student.profile?.readiness ?? student.readiness ?? "",
    ).toUpperCase();
    // student.readiness is already derived from progress in normalizeStudent —
    // compare against the persisted profile band when present.
    if (storedProgress === readiness.percent && storedBand === band) return;

    syncingRef.current = true;
    updateStudent
      .mutateAsync({
        id: student.id,
        updates: {
          application_readiness: readiness.flags,
          progress: readiness.percent,
          readiness: band,
        },
      })
      .catch(() => {
        /* silent background sync */
      })
      .finally(() => {
        syncingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on percent/flags drift only
  }, [canEdit, savingKey, student.id, student.progress, student.profile?.progress, student.profile?.readiness, readiness.percent, flagsKey, band]);

  const handleToggle = async (key: ReadinessManualKey) => {
    if (!canEdit || savingKey) return;
    const nextFlags = toggleManualReadinessFlag(readiness.flags, key);
    const nextPercent = buildApplicationReadiness({
      student: {
        ...student,
        profile: student.profile
          ? { ...student.profile, application_readiness: nextFlags }
          : student.profile,
      },
      experiences,
      lorRequests,
      credentials,
    }).percent;
    const nextBand = readinessStatusFromPercent(nextPercent);

    setSavingKey(key);
    try {
      const updated = await updateStudent.mutateAsync({
        id: student.id,
        updates: {
          application_readiness: nextFlags,
          progress: nextPercent,
          readiness: nextBand,
        },
      });
      onUpdated?.(
        updated.profile
          ? updated
          : {
              ...student,
              progress: nextPercent,
              readiness: nextBand,
              profile: student.profile
                ? {
                    ...student.profile,
                    application_readiness: nextFlags,
                    progress: nextPercent,
                    readiness: nextBand,
                  }
                : student.profile,
            },
      );
      toast.success("Application Readiness updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update readiness";
      toast.error(message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900",
        compact ? "flex h-full min-h-0 flex-col p-5" : "p-5 sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <ClipboardCheck className="h-4 w-4 text-indigo-400" />
            Application Readiness
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {readiness.doneCount} / {readiness.totalCount} complete
            {isStaff ? " · linked items update from student details" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-indigo-400">
            {readiness.percent}%
          </p>
        </div>
      </div>

      <div className="mb-4 h-2 w-full shrink-0 overflow-hidden rounded-full border border-slate-800/40 bg-slate-950">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${readiness.percent}%` }}
        />
      </div>

      <div
        className={cn(
          "space-y-2",
          compact && "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 custom-scrollbar",
        )}
      >
        {readiness.sections.map((section) => {
          const open = openSection === section.id;
          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50"
            >
              <button
                type="button"
                onClick={() => setOpenSection(open ? null : section.id)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-900/80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{section.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {section.doneCount}/{section.totalCount} done
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open && (
                <div className="space-y-1 border-t border-slate-800 px-2 py-2">
                  {section.items.map((item) => {
                    const isManual = item.source === "manual" && item.manualKey;
                    const busy = isManual && savingKey === item.manualKey;
                    const link = staffHref(item.href, student.id, isStaff);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg px-2 py-2",
                          item.done ? "bg-emerald-500/5" : "hover:bg-slate-900/60",
                        )}
                      >
                        {isManual && canEdit ? (
                          <button
                            type="button"
                            disabled={!!savingKey}
                            onClick={() => handleToggle(item.manualKey!)}
                            className="mt-0.5 shrink-0 text-slate-400 transition-colors hover:text-indigo-300 disabled:opacity-60"
                            aria-label={
                              item.done
                                ? `Mark ${item.label} incomplete`
                                : `Mark ${item.label} complete`
                            }
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                            ) : item.done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        ) : item.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm",
                              item.done ? "font-medium text-emerald-100" : "text-slate-300",
                            )}
                          >
                            {item.label}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {item.meta ? (
                              <span className="text-[11px] text-slate-500">{item.meta}</span>
                            ) : null}
                            {item.source === "linked" && !isStaff && link ? (
                              <Link
                                href={link}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                              >
                                {item.hrefLabel || "Open"}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : null}
                            {item.source === "linked" && isStaff ? (
                              <span className="text-[11px] text-slate-600">
                                Synced from student details
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
