"use client";

import { useRef, useState, type RefObject } from "react";
import { Bold, ChevronDown, ChevronUp, List, Plus, Trash2 } from "lucide-react";
import type { OnboardingGuide, OnboardingStep } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";

function newStepId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyFormat(
  value: string,
  start: number,
  end: number,
  mode: "bold" | "bullet",
): { next: string; start: number; end: number } {
  if (mode === "bold") {
    const selected = value.slice(start, end) || "text";
    const wrapped =
      selected.startsWith("**") && selected.endsWith("**") && selected.length > 4
        ? selected.slice(2, -2)
        : `**${selected}**`;
    return {
      next: value.slice(0, start) + wrapped + value.slice(end),
      start,
      end: start + wrapped.length,
    };
  }

  const blockStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const blockEnd = value.indexOf("\n", end);
  const sliceEnd = blockEnd === -1 ? value.length : blockEnd;
  const block = value.slice(blockStart, sliceEnd);
  const lines = block.split("\n").map((line) => {
    if (!line.trim()) return line;
    if (/^\s*[-*]\s+/.test(line)) return line;
    return `- ${line}`;
  });
  const nextBlock = lines.join("\n");
  return {
    next: value.slice(0, blockStart) + nextBlock + value.slice(sliceEnd),
    start: blockStart,
    end: blockStart + nextBlock.length,
  };
}

function FormatBar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const run = (mode: "bold" | "bullet") => {
    const el = textareaRef.current;
    if (!el) return;
    const result = applyFormat(value, el.selectionStart, el.selectionEnd, mode);
    onChange(result.next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  return (
    <div className="mb-1.5 flex items-center gap-1">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run("bold")}
        className="inline-flex items-center gap-1 rounded-md border border-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
      >
        <Bold className="h-3 w-3" />
        Bold
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run("bullet")}
        className="inline-flex items-center gap-1 rounded-md border border-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
      >
        <List className="h-3 w-3" />
        Bullet
      </button>
    </div>
  );
}

function RichTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <FormatBar textareaRef={ref} value={value} onChange={onChange} />
      <Textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        placeholder={placeholder}
      />
    </div>
  );
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

  const moveStep = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= guide.steps.length) return;
    const steps = [...guide.steps];
    const [row] = steps.splice(index, 1);
    steps.splice(nextIndex, 0, row);
    onChange({ ...guide, steps });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">
          Shown after a {audience === "Students" ? "student" : "mentor"} account is created.
          {audience === "Students"
            ? " Students keep seeing it until every step is marked complete."
            : " Mentors see it until they finish the guide."}
        </p>
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
      <FormField label="Short intro" hint="Bold and bullets work in the guide students and mentors see.">
        <RichTextarea
          value={guide.intro}
          onChange={(intro) => onChange({ ...guide, intro })}
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Move step up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === guide.steps.length - 1}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Move step down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
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
            </div>
            <FormField label="Step title">
              <Input
                value={step.title}
                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                placeholder="Complete your profile"
              />
            </FormField>
            <FormField label="What to do" hint="Select text, then Bold. Bullet turns each selected line into a list item.">
              <RichTextarea
                value={step.body}
                onChange={(body) => updateStep(step.id, { body })}
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
  const [audience, setAudience] = useState<"students" | "mentors">("students");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
        {(
          [
            ["students", "Student onboarding"],
            ["mentors", "Mentor onboarding"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAudience(id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              audience === id ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {audience === "students" ? (
        <GuideEditor audience="Students" guide={studentGuide} onChange={onStudentChange} />
      ) : (
        <GuideEditor audience="Mentors" guide={mentorGuide} onChange={onMentorChange} />
      )}
    </div>
  );
}
