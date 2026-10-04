"use client";

import { Plus, Trash2 } from "lucide-react";
import type { OnboardingGuide, OnboardingStep } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";

function newStepId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function GuideEditor({
  audience,
  guide,
  onChange,
}: {
  audience: "Students" | "Mentors";
  guide: OnboardingGuide;
  onChange: (next: OnboardingGuide) => void;
}) {
  const updateStep = (id: string, patch: Partial<OnboardingStep>) => {
    onChange({
      ...guide,
      steps: guide.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{audience}</p>
          <p className="text-xs text-slate-500">
            Shown once after a {audience === "Students" ? "student" : "mentor"} account is created,
            until they finish it.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={guide.enabled}
          onClick={() => onChange({ ...guide, enabled: !guide.enabled })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer ${
            guide.enabled ? "bg-indigo-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              guide.enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <FormField label="Guide title">
        <Input
          value={guide.title}
          onChange={(e) => onChange({ ...guide, title: e.target.value })}
          placeholder="Welcome — start here"
        />
      </FormField>
      <FormField label="Short intro">
        <Textarea
          value={guide.intro}
          onChange={(e) => onChange({ ...guide, intro: e.target.value })}
          className="min-h-[72px] resize-y"
          placeholder="These are the first things to do on your dashboard."
        />
      </FormField>

      <div className="space-y-3">
        {guide.steps.map((step, index) => (
          <div key={step.id} className="space-y-3 rounded-lg border border-slate-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Step {index + 1}
              </p>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...guide, steps: guide.steps.filter((row) => row.id !== step.id) })
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
            <FormField label="Step title">
              <Input
                value={step.title}
                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                placeholder="Complete your profile"
              />
            </FormField>
            <FormField label="What to do">
              <Textarea
                value={step.body}
                onChange={(e) => updateStep(step.id, { body: e.target.value })}
                className="min-h-[80px] resize-y"
                placeholder="Explain this part of the dashboard."
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Button label">
                <Input
                  value={step.linkLabel || ""}
                  onChange={(e) => updateStep(step.id, { linkLabel: e.target.value })}
                  placeholder="Open this page"
                />
              </FormField>
              <FormField label="Page link">
                <Input
                  value={step.linkHref || ""}
                  onChange={(e) => updateStep(step.id, { linkHref: e.target.value })}
                  placeholder={audience === "Students" ? "/student/profile" : "/mentor/students"}
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={() =>
          onChange({
            ...guide,
            steps: [...guide.steps, { id: newStepId(), title: "", body: "", linkLabel: "", linkHref: "" }],
          })
        }
      >
        Add step
      </Button>
    </div>
  );
}

export default function AdminOnboardingPanel({
  studentGuide,
  mentorGuide,
  onStudentChange,
  onMentorChange,
}: {
  studentGuide: OnboardingGuide;
  mentorGuide: OnboardingGuide;
  onStudentChange: (next: OnboardingGuide) => void;
  onMentorChange: (next: OnboardingGuide) => void;
}) {
  return (
    <div className="space-y-4">
      <GuideEditor audience="Students" guide={studentGuide} onChange={onStudentChange} />
      <GuideEditor audience="Mentors" guide={mentorGuide} onChange={onMentorChange} />
    </div>
  );
}
