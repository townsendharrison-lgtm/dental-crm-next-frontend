"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Compass, X } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/users";
import { USER_KEY } from "@/lib/auth/cookies";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/authStore";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { useRole } from "@/lib/hooks/useRole";
import type { AuthUser, OnboardingGuide as OnboardingGuideConfig } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { OnboardingRichText } from "@/components/onboarding/OnboardingRichText";

function isFormField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("[data-onboarding-root]")) return false;
  return target.matches("input, textarea, select, [contenteditable='true']");
}

export function OnboardingGuide() {
  const router = useRouter();
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { actualRole } = useRole();
  const platform = usePlatformConfig();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [manualMinimized, setManualMinimized] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const guide: OnboardingGuideConfig | null =
    actualRole === "STUDENT"
      ? platform.studentOnboarding
      : actualRole === "MENTOR"
        ? platform.mentorOnboarding
        : null;

  const steps = guide?.steps || [];
  const isStudent = actualRole === "STUDENT";
  const alreadyDone = !!user?.onboardingCompletedAt;

  const completedKey = (user?.onboardingStepIds || []).join("|");

  useEffect(() => {
    setDismissed(false);
    setManualMinimized(false);
    setAutoHidden(false);
    setForcedOpen(false);
    setStepIndex(0);
  }, [user?.id, actualRole]);

  useEffect(() => {
    setCompletedIds(user?.onboardingStepIds || []);
  }, [completedKey, user?.onboardingStepIds]);

  useEffect(() => {
    if (dismissed || alreadyDone) return;
    const collapseForPage = () => {
      setAutoHidden(true);
      setForcedOpen(false);
    };
    const insideGuide = (target: EventTarget | null) =>
      target instanceof Node && !!document.querySelector("[data-onboarding-root]")?.contains(target);
    const onFocusIn = (event: FocusEvent) => {
      if (!isFormField(event.target)) return;
      collapseForPage();
    };
    const onPointerDown = (event: Event) => {
      if (insideGuide(event.target)) return;
      if (isFormField(event.target)) collapseForPage();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [dismissed, alreadyDone]);

  if (!platform.ready || !user || !guide?.enabled || steps.length === 0 || alreadyDone || dismissed) {
    return null;
  }

  const collapsed = (manualMinimized || autoHidden) && !forcedOpen;
  const doneCount = steps.filter((step) => completedIds.includes(step.id)).length;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  const persistUser = (next: AuthUser) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setUser(next);
  };

  const finish = async () => {
    if (finishing || !user) return;
    setFinishing(true);
    const completedAt = new Date().toISOString();
    try {
      await usersApi.updateProfile({ onboardingCompleted: true });
    } catch (err) {
      console.error("Finish onboarding error:", err);
      toast.error("Couldn't save that you finished. It will show again next time you sign in.");
      setFinishing(false);
      return;
    }
    persistUser({ ...user, onboardingCompletedAt: completedAt });
    setFinishing(false);
  };

  const markStep = async (stepId: string) => {
    if (!user || savingStepId) return;
    setSavingStepId(stepId);
    try {
      const updated = await usersApi.updateProfile({ onboardingStepId: stepId });
      const ids = Array.isArray(updated.onboarding_step_ids)
        ? updated.onboarding_step_ids
        : [...completedIds, stepId];
      const completedAt = updated.onboarding_completed_at || null;
      persistUser({
        ...user,
        onboardingStepIds: ids,
        onboardingCompletedAt: completedAt,
      });
      setCompletedIds(ids);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save that step.";
      toast.error(message);
    } finally {
      setSavingStepId(null);
    }
  };

  if (collapsed) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70]">
        <button
          type="button"
          data-onboarding-root
          onClick={() => {
            setManualMinimized(false);
            setForcedOpen(true);
          }}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/95 px-3 py-2 text-sm font-semibold text-white shadow-xl shadow-black/40 cursor-pointer"
        >
          <Compass className="h-4 w-4 text-indigo-300" />
          Setup guide
          {isStudent ? (
            <span className="text-xs font-medium text-slate-400">
              {doneCount}/{steps.length}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div
      data-onboarding-root
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 sm:justify-end sm:p-6"
    >
      <section className="pointer-events-auto flex max-h-[min(70vh,32rem)] w-full max-w-md flex-col rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-300">
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight text-white">{guide.title}</p>
              {guide.intro ? (
                <OnboardingRichText text={guide.intro} className="mt-1 space-y-1 text-sm leading-relaxed text-slate-400" />
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => {
                setManualMinimized(true);
                setForcedOpen(false);
              }}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Minimize setup guide"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Hide setup guide until the page is reloaded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {isStudent ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {doneCount} of {steps.length} complete
              </p>
              {steps.map((item) => {
                const done = completedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 ${
                      done ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          done
                            ? "border-emerald-400 bg-emerald-500 text-slate-950"
                            : "border-slate-600 text-transparent"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                        {item.body ? <OnboardingRichText text={item.body} className="mt-1 space-y-1 text-sm leading-relaxed text-slate-300" /> : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.linkHref ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => router.push(item.linkHref!)}
                            >
                              {item.linkLabel || "Open this page"}
                            </Button>
                          ) : null}
                          {done ? (
                            <span className="inline-flex items-center text-xs font-medium text-emerald-300">
                              Completed
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => markStep(item.id)}
                              isLoading={savingStepId === item.id}
                              disabled={!!savingStepId}
                            >
                              Mark complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
              {step.body ? <OnboardingRichText text={step.body} className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-slate-300" /> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {stepIndex > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStepIndex((n) => n - 1)}>
                    Back
                  </Button>
                )}
                {step.linkHref ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(step.linkHref!)}
                  >
                    {step.linkLabel || "Open this page"}
                  </Button>
                ) : null}
                {isLast ? (
                  <Button type="button" size="sm" onClick={finish} isLoading={finishing}>
                    Finish setup
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setStepIndex((n) => n + 1)}>
                    Next
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
