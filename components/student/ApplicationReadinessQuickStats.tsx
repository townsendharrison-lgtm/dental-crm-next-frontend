"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  School,
  Square,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useStudentCredentials } from "@/lib/hooks/useStudentNotesDexterity";
import { useUpdateStudent } from "@/lib/hooks/useStudentProfile";
import { cn } from "@/lib/utils/cn";
import {
  buildApplicationReadiness,
  readinessStatusFromPercent,
  toggleManualReadinessFlag,
  type ReadinessManualKey,
  type ReadinessResolvedSection,
  type ReadinessSectionId,
} from "@/lib/utils/applicationReadiness";

const SECTION_VISUAL: Record<
  ReadinessSectionId,
  { icon: React.ReactNode; tone: string }
> = {
  dat: {
    icon: <FlaskConical className="h-5 w-5 text-indigo-400" />,
    tone: "bg-indigo-500/10 border-indigo-500/20",
  },
  documents: {
    icon: <FileText className="h-5 w-5 text-emerald-400" />,
    tone: "bg-emerald-500/10 border-emerald-500/20",
  },
  experiences: {
    icon: <Briefcase className="h-5 w-5 text-amber-400" />,
    tone: "bg-amber-500/10 border-amber-500/20",
  },
  school_list: {
    icon: <School className="h-5 w-5 text-rose-400" />,
    tone: "bg-rose-500/10 border-rose-500/20",
  },
};

interface ApplicationReadinessQuickStatsProps {
  student: Student;
  className?: string;
}

export default function ApplicationReadinessQuickStats({
  student,
  className,
}: ApplicationReadinessQuickStatsProps) {
  const { data: experiences = [] } = useExperiences(student.id);
  const { data: credentials = [] } = useStudentCredentials(student.id);
  const { data: rawLor = [] } = useLorRequests();
  const lorRequests = useMemo(
    () => rawLor.filter((r) => r.studentId === student.id),
    [rawLor, student.id],
  );
  const updateStudent = useUpdateStudent();
  const [openId, setOpenId] = useState<ReadinessSectionId | null>(null);
  const [savingKey, setSavingKey] = useState<ReadinessManualKey | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!openId) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [openId]);

  const handleToggle = async (key: ReadinessManualKey) => {
    if (savingKey) return;
    const nextFlags = toggleManualReadinessFlag(readiness.flags, key);
    const next = buildApplicationReadiness({
      student: {
        ...student,
        profile: student.profile
          ? { ...student.profile, application_readiness: nextFlags }
          : student.profile,
      },
      experiences,
      lorRequests,
      credentials,
    });
    setSavingKey(key);
    try {
      await updateStudent.mutateAsync({
        id: student.id,
        updates: {
          application_readiness: nextFlags,
          progress: next.percent,
          readiness: readinessStatusFromPercent(next.percent),
        },
      });
      toast.success("Application Readiness updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update readiness");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}
    >
      {readiness.sections.map((section) => (
        <SectionStat
          key={section.id}
          section={section}
          open={openId === section.id}
          onToggleOpen={() =>
            setOpenId((prev) => (prev === section.id ? null : section.id))
          }
          savingKey={savingKey}
          onToggleManual={handleToggle}
        />
      ))}
    </div>
  );
}

function SectionStat({
  section,
  open,
  onToggleOpen,
  savingKey,
  onToggleManual,
}: {
  section: ReadinessResolvedSection;
  open: boolean;
  onToggleOpen: () => void;
  savingKey: ReadinessManualKey | null;
  onToggleManual: (key: ReadinessManualKey) => void;
}) {
  const visual = SECTION_VISUAL[section.id];

  return (
    <div className="relative flex flex-col items-center text-center">
      <button
        type="button"
        onClick={onToggleOpen}
        className="group flex w-full flex-col items-center rounded-xl px-1 py-0.5 transition-colors hover:bg-slate-800/40"
        aria-expanded={open}
      >
        <div
          className={cn(
            "mb-2 flex h-10 w-10 items-center justify-center rounded-full border",
            visual.tone,
          )}
        >
          {visual.icon}
        </div>
        <p className="mb-0.5 flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
          {section.title}
          <ChevronDown
            className={cn(
              "h-3 w-3 text-slate-600 transition-transform",
              open && "rotate-180",
            )}
          />
        </p>
        <p className="text-lg font-bold tabular-nums text-white">
          {section.doneCount}
          <span className="text-sm font-semibold text-slate-500">
            /{section.totalCount}
          </span>
        </p>
      </button>

      {open ? (
        <div className="absolute left-1/2 top-[calc(100%+6px)] z-30 w-[min(240px,70vw)] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-xl shadow-black/40">
          <p className="mb-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {section.doneCount}/{section.totalCount} complete
          </p>
          <div className="max-h-56 space-y-0.5 overflow-y-auto custom-scrollbar">
            {section.items.map((item) => {
              const isManual = item.source === "manual" && item.manualKey;
              const busy = isManual && savingKey === item.manualKey;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-1.5 text-left",
                    item.done ? "bg-emerald-500/5" : "hover:bg-slate-900",
                  )}
                >
                  {isManual ? (
                    <button
                      type="button"
                      disabled={!!savingKey}
                      onClick={() => onToggleManual(item.manualKey!)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-300 disabled:opacity-60"
                      aria-label={
                        item.done
                          ? `Mark ${item.label} incomplete`
                          : `Mark ${item.label} complete`
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                      ) : item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : item.done ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[11px] leading-snug",
                        item.done ? "font-medium text-emerald-100" : "text-slate-300",
                      )}
                    >
                      {item.label}
                    </p>
                    {item.meta ? (
                      <p className="mt-0.5 text-[10px] text-slate-500">{item.meta}</p>
                    ) : null}
                    {item.source === "linked" && item.href ? (
                      <Link
                        href={item.href}
                        className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        {item.hrefLabel || "Open"}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
