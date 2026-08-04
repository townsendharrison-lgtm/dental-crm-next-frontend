"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Loader2,
  Target,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { useUpdateStudent } from "@/lib/hooks/useStudentProfile";
import { useOptimizationPlan } from "@/lib/hooks/useOptimizationPlans";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import {
  APPLICATION_JOURNEY_PHASES,
  getApplicationJourneyFlags,
  getJourneyPhaseStatus,
  toggleJourneyPhase,
  type ApplicationJourneyPhaseId,
} from "@/lib/utils/applicationJourney";

interface ApplicationJourneyPanelProps {
  student: Student;
  /** Compact for Momentum side column; default full for profile. */
  compact?: boolean;
  className?: string;
  onUpdated?: (student: Student) => void;
  /** Force staff editing (mentors/admins). Students always view-only. */
  staffMode?: boolean;
}

function PhaseMarker({
  status,
  busy,
}: {
  status: "complete" | "current" | "upcoming";
  busy?: boolean;
}) {
  if (busy) {
    return (
      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500">
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>
    );
  }

  // Incomplete (current or upcoming): circle with a center dot
  return (
    <div
      className={cn(
        "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-slate-900",
        status === "current" ? "border-indigo-400" : "border-slate-600",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "current" ? "bg-indigo-400" : "bg-slate-600",
        )}
      />
    </div>
  );
}

export default function ApplicationJourneyPanel({
  student,
  compact = false,
  className,
  onUpdated,
  staffMode,
}: ApplicationJourneyPanelProps) {
  const { user } = useAuth();
  const isStaff =
    staffMode ??
    (user?.role === "ADMIN" ||
      user?.role === "MENTOR_MANAGER" ||
      user?.role === "MENTOR");
  const canEdit =
    !!isStaff &&
    !!user &&
    (user.role === "ADMIN" ||
      user.role === "MENTOR_MANAGER" ||
      user.role === "MENTOR");

  const { data: plan } = useOptimizationPlan(student.id);
  const roadmap = plan?.roadmap;

  const updateStudent = useUpdateStudent();
  const [savingPhase, setSavingPhase] = useState<ApplicationJourneyPhaseId | null>(
    null,
  );
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const didAutoOpen = useRef(false);

  const flags = getApplicationJourneyFlags(student);

  const currentPhaseId = useMemo(() => {
    const firstOpen = APPLICATION_JOURNEY_PHASES.find((p) => !flags[p.id]);
    return firstOpen?.id ?? null;
  }, [flags]);

  // Auto-open current phase once so roadmap items are visible
  useEffect(() => {
    if (!didAutoOpen.current && currentPhaseId) {
      didAutoOpen.current = true;
      setOpenPhase(currentPhaseId);
    }
  }, [currentPhaseId]);

  const handleToggle = async (phaseId: ApplicationJourneyPhaseId) => {
    if (!canEdit || savingPhase) return;
    const nextFlags = toggleJourneyPhase(flags, phaseId);

    setSavingPhase(phaseId);
    try {
      const updated = await updateStudent.mutateAsync({
        id: student.id,
        updates: { application_journey: nextFlags },
      });
      onUpdated?.(
        updated.profile
          ? updated
          : {
              ...student,
              profile: student.profile
                ? { ...student.profile, application_journey: nextFlags }
                : student.profile,
            },
      );
      toast.success("Application Journey updated");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not update journey";
      toast.error(message);
    } finally {
      setSavingPhase(null);
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
      <div className="mb-5 flex shrink-0 items-center gap-2">
        <Target className="h-4 w-4 text-indigo-400" />
        <h3 className="text-base font-bold text-white">Application Journey</h3>
      </div>

      <div
        className={cn(
          "relative",
          compact &&
            "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 custom-scrollbar",
        )}
      >
        <ol className="relative space-y-0">
          {APPLICATION_JOURNEY_PHASES.map((phase, idx) => {
            const status = getJourneyPhaseStatus(flags, phase.id);
            const isLast = idx === APPLICATION_JOURNEY_PHASES.length - 1;
            const open = openPhase === phase.id;
            const busy = savingPhase === phase.id;
            const items = (roadmap?.[phase.id] || []).filter(
              (item) => typeof item === "string" && item.trim().length > 0,
            );
            const active = status === "complete" || status === "current";

            return (
              <li key={phase.id} className="relative flex gap-3.5 sm:gap-4">
                {/* Rail */}
                <div className="relative flex w-8 shrink-0 flex-col items-center">
                  <PhaseMarker status={status} busy={busy} />
                  {!isLast && (
                    <div
                      aria-hidden
                      className={cn(
                        "mt-1 w-px flex-1 min-h-[2.25rem]",
                        status === "complete"
                          ? "bg-indigo-500/50"
                          : "bg-slate-800",
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={cn("min-w-0 flex-1", !isLast && "pb-5")}>
                  <button
                    type="button"
                    onClick={() => setOpenPhase(open ? null : phase.id)}
                    className="group flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.14em]",
                          active ? "text-indigo-400" : "text-slate-600",
                        )}
                      >
                        Phase {phase.number}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-sm font-bold leading-snug sm:text-[15px]",
                          active ? "text-white" : "text-slate-500",
                        )}
                      >
                        {phase.title}
                      </p>
                    </div>
                    {items.length > 0 || canEdit ? (
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 transition-transform",
                          active ? "text-slate-500" : "text-slate-700",
                          open && "rotate-180",
                        )}
                      />
                    ) : null}
                  </button>

                  {open && (items.length > 0 || canEdit) && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
                      {items.length === 0 ? (
                        <p className="px-1 py-1 text-xs text-slate-500">
                          No items for this phase yet.
                        </p>
                      ) : (
                        items.map((item, itemIdx) => (
                          <div
                            key={`${phase.id}-${itemIdx}`}
                            className="flex items-start gap-2 rounded-lg px-1.5 py-1.5"
                          >
                            <span
                              className={cn(
                                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                status === "complete"
                                  ? "bg-indigo-400"
                                  : "bg-slate-600",
                              )}
                            />
                            <p
                              className={cn(
                                "text-sm leading-snug",
                                status === "complete"
                                  ? "text-slate-300"
                                  : "text-slate-400",
                              )}
                            >
                              {item}
                            </p>
                          </div>
                        ))
                      )}

                      {canEdit ? (
                        <button
                          type="button"
                          disabled={!!savingPhase}
                          onClick={() => handleToggle(phase.id)}
                          className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 transition-colors hover:border-indigo-500/40 hover:text-white disabled:opacity-60"
                        >
                          {status === "complete" ? (
                            <Check className="h-3.5 w-3.5 text-indigo-400" />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded border border-slate-600" />
                          )}
                          {status === "complete" ? "Marked complete" : "Mark complete"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
