"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, Plus, Target } from "lucide-react";
import type {
  Student,
  Experience,
  OptimizationPlan,
  Application,
  PlatformConfig,
  School,
  KPIAssessment,
  TimelineBookshelfItem,
} from "@/lib/types";
import type { UpsertPlanPayload } from "@/lib/api/optimizationPlans";
import { generateDraftPlan } from "@/lib/services/geminiService";
import {
  DEFAULT_CATEGORY_PLANS,
  DEFAULT_MANUAL_DEXTERITY,
  mergeCategoryPlans,
} from "@/lib/utils/defaultCategoryPlans";
import ApplicationOptimizationPlan from "@/components/student/ApplicationOptimizationPlan";
import SchoolSelectionTab from "@/components/student/hub/SchoolSelectionTab";
import ApplicationTracker from "@/components/student/ApplicationTracker";
import ApplicationReadinessPanel from "@/components/student/ApplicationReadinessPanel";
import { StudentTimelineBoard } from "@/components/timeline/StudentTimelineBoard";
import { TimelineBookshelfDrawer } from "@/components/timeline/TimelineBookshelfDrawer";
import { Button, Modal, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { toast } from "sonner";
import { useCreateMilestone } from "@/lib/hooks/useMilestones";

type PlanSection = "strategy" | "schools" | "applications" | "timeline";

function buildMonthOptions(start?: string | null, end?: string | null) {
  const now = new Date();
  const fallbackStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let s = start || fallbackStart;
  let e = end;
  if (!e) {
    const [y, m] = s.split("-").map(Number);
    const endDate = new Date(y, m - 1 + 11, 1);
    e = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
  }
  const [sy, sm] = s.split("-").map(Number);
  const [ey, em] = e.split("-").map(Number);
  let cursor = new Date(sy, sm - 1, 1);
  const last = new Date(ey, em - 1, 1);
  if (cursor > last) cursor = new Date(ey, em - 1, 1);
  const options: Array<{ value: string; label: string }> = [];
  while (cursor <= last && options.length < 48) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    options.push({
      value,
      label: cursor.toLocaleString("en-US", { month: "long", year: "numeric" }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options;
}

interface MentorStudentPlanTabProps {
  student: Student;
  experiences: Experience[];
  optimizationPlan?: OptimizationPlan | null;
  platformConfig: PlatformConfig;
  onUpdatePlan: (plan: OptimizationPlan) => void;
  onCreatePlan: (payload: UpsertPlanPayload) => void | Promise<void>;
  onDeletePlan?: () => void;
  onUpdateSchools: (schools: School[]) => void;
  onUpdateStudent?: (updates: Partial<Student>) => void;
  onUpdateApplications?: (applications: Application[]) => void;
  isCreating?: boolean;
  /** Deep-link: Plan → Timeline when initialTab was `timeline` */
  initialSection?: PlanSection;
}

function blankPlanPayload(student: Student): UpsertPlanPayload {
  const kpis: KPIAssessment = {
    academics: "Developing",
    experienceDepth: "Developing",
    leadership: "Developing",
    shadowing: "Developing",
    volunteering: "Developing",
  };
  return {
    studentId: student.id,
    snapshot: `Strategy plan for ${student.name}. Add a short standing summary here.`,
    overallScore: student.strengthScore ?? student.profile?.strength_score ?? 0,
    improvementLeverageScore: 50,
    kpis,
    roadmap: {
      phase1: ["Define 30-day priorities with the student"],
      phase2: [],
      phase3: [],
      phase4: [],
    },
    riskFactors: [],
    leverageActions: [],
    strengths: [],
    gaps: [],
    categories: mergeCategoryPlans(DEFAULT_CATEGORY_PLANS),
    manualDexterity: { ...DEFAULT_MANUAL_DEXTERITY },
  };
}

function aiDraftToPayload(student: Student, draft: any): UpsertPlanPayload {
  const gaps: string[] = Array.isArray(draft?.gaps) ? draft.gaps : [];
  const strengths: string[] = Array.isArray(draft?.strengths) ? draft.strengths : [];
  const actions: string[] = Array.isArray(draft?.actionPlan30) ? draft.actionPlan30 : [];

  return {
    studentId: student.id,
    snapshot: draft?.snapshot || `AI draft strategy for ${student.name}.`,
    overallScore: student.strengthScore ?? student.profile?.strength_score ?? 0,
    improvementLeverageScore: 65,
    kpis: {
      academics: "Moderate",
      experienceDepth: "Developing",
      leadership: "Developing",
      shadowing: "Developing",
      volunteering: "Developing",
    },
    roadmap: {
      phase1: actions.slice(0, 5),
      phase2: [],
      phase3: [],
      phase4: [],
    },
    strengths,
    gaps,
    riskFactors: gaps.slice(0, 3).map((gap: string) => ({
      factor: gap.slice(0, 80),
      severity: "Medium" as const,
      description: gap,
      mitigation: "Discuss mitigation with the student in the next meeting.",
    })),
    leverageActions: strengths.slice(0, 3).map((s: string) => ({
      title: s.slice(0, 60),
      description: s,
      impact: "High" as const,
    })),
    categories: mergeCategoryPlans(DEFAULT_CATEGORY_PLANS),
    manualDexterity: { ...DEFAULT_MANUAL_DEXTERITY },
  };
}

export function MentorStudentPlanTab({
  student,
  experiences,
  optimizationPlan,
  platformConfig,
  onUpdatePlan,
  onCreatePlan,
  onDeletePlan,
  onUpdateSchools,
  onUpdateStudent,
  onUpdateApplications,
  isCreating = false,
  initialSection = "strategy",
}: MentorStudentPlanTabProps) {
  const [section, setSection] = useState<PlanSection>(initialSection);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bookshelfOpen, setBookshelfOpen] = useState(false);
  const [insertMonth, setInsertMonth] = useState<string | null>(null);
  const createMilestone = useCreateMilestone(student.id);

  const monthOptions = useMemo(
    () =>
      buildMonthOptions(
        student.timelineStart || student.profile?.timeline_start,
        student.timelineEnd || student.profile?.timeline_end,
      ),
    [
      student.timelineStart,
      student.timelineEnd,
      student.profile?.timeline_start,
      student.profile?.timeline_end,
    ],
  );

  React.useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const handleBookshelfPick = async (item: TimelineBookshelfItem) => {
    const month = insertMonth || monthOptions[0]?.value;
    if (!month) {
      toast.error("Pick a month first");
      return;
    }
    const monthLabel =
      monthOptions.find((m) => m.value === month)?.label || month;
    try {
      await createMilestone.mutateAsync({
        title: item.title,
        month,
        cardType: item.cardType,
        description: item.description || "",
        resourceLinks: item.resourceLinks || [],
        status: "Planned",
      });
      toast.success(`Added “${item.title}” to ${monthLabel}`);
      setBookshelfOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to insert preset");
    }
  };

  const hasPlan = Boolean(optimizationPlan?.id);

  const upsertPlan = (payload: UpsertPlanPayload) => {
    onCreatePlan(payload);
  };

  const handleCreateBlank = () => {
    try {
      upsertPlan(blankPlanPayload(student));
      toast.success("Strategy plan created — edit and save details below");
      setSection("strategy");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create plan");
    }
  };

  const handleGenerateAi = async () => {
    setIsGenerating(true);
    try {
      const draft = await generateDraftPlan(student);
      if (!draft) {
        toast.error("AI draft unavailable. Check the Gemini API key, or create a blank plan.");
        return;
      }
      upsertPlan(aiDraftToPayload(student, draft));
      toast.success("AI draft saved — review and refine it with the student");
      setSection("strategy");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate plan");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Tabs
      defaultValue="strategy"
      value={section}
      onValueChange={(v) => setSection(v as PlanSection)}
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="strategy">Strategy plan</TabsTrigger>
        <TabsTrigger value="schools">School list</TabsTrigger>
        <TabsTrigger value="applications">Applications</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="strategy" className="mt-4 space-y-4">
        {!hasPlan ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-10 text-center space-y-4">
            <Target className="mx-auto h-10 w-10 text-slate-700" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No strategy plan yet</h3>
              <p className="mx-auto max-w-md text-sm text-slate-500">
                Create a blank plan and fill it in, or generate an AI draft from this
                student&apos;s profile, then edit before sharing.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleCreateBlank}
                isLoading={isCreating}
              >
                Create blank plan
              </Button>
              <Button
                size="sm"
                leftIcon={<Sparkles className="h-4 w-4" />}
                onClick={handleGenerateAi}
                isLoading={isGenerating || isCreating}
              >
                Generate AI draft
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Strategy for {student.name}
              </p>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Sparkles className="h-4 w-4" />}
                onClick={handleGenerateAi}
                isLoading={isGenerating || isCreating}
              >
                Regenerate AI draft
              </Button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <ApplicationOptimizationPlan
                studentName={student.name}
                studentCreatedAt={student.createdAt}
                student={student}
                plan={optimizationPlan!}
                experiences={experiences}
                isEditable
                onUpdatePlan={onUpdatePlan}
                onDeletePlan={onDeletePlan ? () => setDeleteOpen(true) : undefined}
                onStudentUpdated={
                  onUpdateStudent
                    ? (updated) =>
                        onUpdateStudent({
                          profile: updated.profile,
                        })
                    : undefined
                }
              />
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="schools" className="mt-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <SchoolSelectionTab
            student={student}
            isMentorView
            onUpdateSchools={onUpdateSchools}
            onUpdateStudent={onUpdateStudent}
            onUpdateApplications={onUpdateApplications}
            platformConfig={platformConfig}
          />
        </div>
      </TabsContent>

      <TabsContent value="applications" className="mt-4 space-y-4">
        <ApplicationReadinessPanel student={student} staffMode />
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ApplicationTracker
            studentId={student.id}
            platformConfig={platformConfig}
          />
        </div>
      </TabsContent>

      <TabsContent value="timeline" className="mt-4">
        <StudentTimelineBoard
          student={student}
          mode="mentor"
          cardColors={platformConfig.timelineCardColors}
          showBookshelf
          onOpenBookshelf={(month) => {
            setInsertMonth(month || null);
            setBookshelfOpen(true);
          }}
        />
        <TimelineBookshelfDrawer
          open={bookshelfOpen}
          onClose={() => setBookshelfOpen(false)}
          onPick={handleBookshelfPick}
          allowPersonalManage
          pickMode
          targetMonth={insertMonth || monthOptions[0]?.value || null}
          onTargetMonthChange={setInsertMonth}
          monthOptions={monthOptions}
          cardColors={platformConfig.timelineCardColors}
        />
      </TabsContent>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete strategy plan"
        description={`Remove the strategy plan for ${student.name}? This can’t be undone.`}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                setDeleteOpen(false);
                onDeletePlan?.();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          The student will no longer see this plan in their hub until a new one is created.
        </p>
      </Modal>
    </Tabs>
  );
}

export default MentorStudentPlanTab;
