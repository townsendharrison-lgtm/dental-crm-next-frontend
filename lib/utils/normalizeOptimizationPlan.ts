import type { OptimizationPlan, RoadmapPhases } from "@/lib/types";
import { ApiRequestError } from "@/lib/api/client";

const EMPTY_ROADMAP: RoadmapPhases = {
  phase1: [],
  phase2: [],
  phase3: [],
  phase4: [],
};

/** Normalize API snake_case optimization plan into the camelCase shape the UI expects. */
export function normalizeOptimizationPlan(
  plan: OptimizationPlan | null | undefined,
): OptimizationPlan | null {
  if (!plan) return null;

  const roadmap = {
    ...EMPTY_ROADMAP,
    ...(plan.roadmap || {}),
  };

  return {
    ...plan,
    studentId: plan.studentId ?? plan.student_id,
    overallScore: plan.overallScore ?? plan.overall_score ?? 0,
    improvementLeverageScore:
      plan.improvementLeverageScore ?? plan.improvement_leverage_score ?? 0,
    riskFactors: plan.riskFactors ?? plan.risk_factors ?? [],
    leverageActions: plan.leverageActions ?? plan.leverage_actions ?? [],
    strengths: plan.strengths ?? [],
    gaps: plan.gaps ?? [],
    kpis: plan.kpis ?? {},
    roadmap,
    lastUpdated: plan.lastUpdated ?? plan.updated_at ?? plan.created_at,
    categories: plan.categories ?? {},
  };
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404;
}
