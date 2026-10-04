"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, X } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/users";
import { USER_KEY } from "@/lib/auth/cookies";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/authStore";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { useRole } from "@/lib/hooks/useRole";
import type { OnboardingGuide as OnboardingGuideConfig } from "@/lib/types";
import { Button } from "@/components/ui/Button";

function laterKey(userId: string) {
  return `onboarding-later:${userId}`;
}

function doneKey(userId: string) {
  return `onboarding-done:${userId}`;
}

export function OnboardingGuide() {
  const router = useRouter();
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { actualRole } = useRole();
  const platform = usePlatformConfig();
  const [stepIndex, setStepIndex] = useState(0);
  const [hiddenForSession, setHiddenForSession] = useState(false);
  const [locallyDone, setLocallyDone] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const guide: OnboardingGuideConfig | null =
    actualRole === "STUDENT"
      ? platform.studentOnboarding
      : actualRole === "MENTOR"
        ? platform.mentorOnboarding
        : null;

  const steps = guide?.steps || [];
  const alreadyDone = !!user?.onboardingCompletedAt || locallyDone;

  useEffect(() => {
    if (!user?.id) return;
    setLocallyDone(localStorage.getItem(doneKey(user.id)) === "1");
    setHiddenForSession(sessionStorage.getItem(laterKey(user.id)) === "1");
    setStepIndex(0);
  }, [user?.id, actualRole]);

  if (!platform.ready || !user || !guide?.enabled || steps.length === 0 || alreadyDone || hiddenForSession) {
    return null;
  }

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  const hideForNow = () => {
    sessionStorage.setItem(laterKey(user.id), "1");
    setHiddenForSession(true);
  };

  const finish = async () => {
    if (finishing) return;
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
    const next = { ...user, onboardingCompletedAt: completedAt };
    try {
      localStorage.setItem(doneKey(user.id), "1");
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setUser(next);
    setFinishing(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 sm:justify-end sm:p-6 lg:right-0">
      <section className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-300">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{guide.title}</p>
              {guide.intro ? <p className="mt-0.5 text-xs text-slate-400">{guide.intro}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={hideForNow}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Hide setup guide for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
        {step.body ? <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{step.body}</p> : null}

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
      </section>
    </div>
  );
}
