import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  OptimizationPlan,
  KPIAssessment,
  RoadmapPhases,
  RiskFactor,
  LeverageAction,
  School,
  SchoolCategory,
} from "@/lib/types";

export type SchoolBoardPayload = {
  categories: SchoolCategory[];
  schools: School[];
};

export interface UpsertPlanPayload {
  /** Linked CRM student — mutually exclusive with external fields */
  studentId?: string;
  /** Existing external customer id (school_selection_externals) */
  externalId?: string;
  /** Create / rename external customer (no CRM account) */
  externalName?: string;
  /** Categories + schools snapshot for external plans */
  schoolBoard?: SchoolBoardPayload | null;
  snapshot: string;
  overallScore?: number;
  improvementLeverageScore?: number;
  kpis?: KPIAssessment;
  roadmap?: RoadmapPhases;
  riskFactors?: RiskFactor[];
  leverageActions?: LeverageAction[];
  strengths?: string[];
  gaps?: string[];
}

/** Map a full OptimizationPlan (or partial UI draft) into the upsert API shape. */
export function toUpsertPlanPayload(
  studentId: string,
  plan: Partial<OptimizationPlan>,
): UpsertPlanPayload {
  const snapshot =
    (typeof plan.snapshot === "string" && plan.snapshot) ||
    (plan.categories ? JSON.stringify(plan.categories) : "") ||
    "";

  return {
    studentId,
    snapshot,
    overallScore:
      typeof plan.overallScore === "number"
        ? plan.overallScore
        : typeof plan.overall_score === "number"
          ? plan.overall_score
          : undefined,
    improvementLeverageScore:
      typeof plan.improvementLeverageScore === "number"
        ? plan.improvementLeverageScore
        : typeof plan.improvement_leverage_score === "number"
          ? plan.improvement_leverage_score
          : undefined,
    kpis: plan.kpis,
    roadmap: plan.roadmap,
    riskFactors: plan.riskFactors || plan.risk_factors,
    leverageActions: plan.leverageActions || plan.leverage_actions,
    strengths: plan.strengths,
    gaps: plan.gaps,
  };
}

export type OptimizationPlanListItem = OptimizationPlan & {
  external_id?: string | null;
  externalId?: string | null;
  school_board?: SchoolBoardPayload | null;
  schoolBoard?: SchoolBoardPayload | null;
  student?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    isExternal?: boolean;
  };
};

export const optimizationPlansApi = {
  /**
   * Fetch a student's profile optimization plan.
   * If called by a Student, they get their own.
   * If called by staff, a studentId must be supplied.
   */
  get: async (studentId?: string): Promise<OptimizationPlan> => {
    const endpoint = `/api/optimization-plans${studentId ? `?studentId=${studentId}` : ""}`;
    return await apiGet<OptimizationPlan>(endpoint);
  },

  getByExternal: async (externalId: string): Promise<OptimizationPlan> => {
    return await apiGet<OptimizationPlan>(
      `/api/optimization-plans?externalId=${encodeURIComponent(externalId)}`,
    );
  },

  /** Admin / mentor-manager: all created optimization / school-selection plans. */
  list: async (): Promise<OptimizationPlanListItem[]> => {
    return await apiGet<OptimizationPlanListItem[]>("/api/optimization-plans?list=1");
  },

  /**
   * Create or overwrite (upsert) a student's optimization plan (Admins and Mentors only).
   */
  upsert: async (payload: UpsertPlanPayload): Promise<OptimizationPlan> => {
    return await apiPost<OptimizationPlan>("/api/optimization-plans", payload);
  },

  /**
   * Update details of an optimization plan (Admins and Mentors only).
   */
  update: async (id: string, updates: Partial<UpsertPlanPayload>): Promise<OptimizationPlan> => {
    return await apiPut<OptimizationPlan>(`/api/optimization-plans/${id}`, updates);
  },

  /**
   * Delete an optimization plan (Admins and Mentors only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/optimization-plans/${id}`);
  },
};
