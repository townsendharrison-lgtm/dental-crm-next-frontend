import type {
  CategoryPlan,
  CategoryRecommendation,
  ManualDexterityPlan,
} from "@/lib/types";

export const CATEGORY_ORDER = [
  "shadowing",
  "research",
  "academic",
  "dental",
  "employment",
  "volunteering",
] as const;

export type CategoryKey = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  shadowing: "Shadowing",
  research: "Research",
  academic: "Academic Enrichment",
  dental: "Dental Experiences",
  employment: "Employment",
  volunteering: "Volunteering",
};

export function normalizeRecommendation(
  raw: string | CategoryRecommendation | null | undefined,
): CategoryRecommendation {
  if (!raw) return { label: "" };
  if (typeof raw === "string") return { label: raw };
  return {
    label: String(raw.label || "").trim(),
    url: raw.url ? String(raw.url).trim() : undefined,
  };
}

export function normalizeRecommendations(
  list: Array<string | CategoryRecommendation> | null | undefined,
): CategoryRecommendation[] {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeRecommendation);
}

export const DEFAULT_CATEGORY_PLANS: Record<CategoryKey, CategoryPlan> = {
  shadowing: {
    status: "Developing",
    actionPlan: "",
    recommended: [
      { label: "Shadowing Log Template" },
      { label: "Specialist Outreach Guide" },
    ],
    cta: "Open",
    mentorNotes: "",
    subGoals: [
      { id: "sg1", label: "Shadowing Hours", target: 100, unit: "Hours" },
      { id: "sg2", label: "General Dentists", target: 3, unit: "Dentists" },
      { id: "sg3", label: "Specialty Dentists", target: 2, unit: "Dentists" },
      { id: "sg4", label: "Number of Offices", target: 5, unit: "Offices" },
    ],
  },
  research: {
    status: "Developing",
    actionPlan: "",
    recommended: [{ label: "Research Symposium Registration" }],
    cta: "View",
    mentorNotes: "",
    targetGoal: { value: 200, unit: "Hours" },
    subGoals: [{ id: "rg1", label: "Research Hours", target: 200, unit: "Hours" }],
  },
  academic: {
    status: "Developing",
    actionPlan: "",
    recommended: [
      { label: "Summer Dental Prep Program" },
      { label: "DAT Prep Course" },
    ],
    cta: "Enroll",
    mentorNotes: "",
    targetGoal: { value: 100, unit: "Hours" },
    subGoals: [
      { id: "ag1", label: "Academic Hours", target: 100, unit: "Hours" },
      { id: "ag2", label: "Experiences", target: 2, unit: "Exp" },
    ],
  },
  dental: {
    status: "Developing",
    actionPlan: "",
    recommended: [
      { label: "Clinical Skills Workshop" },
      { label: "Dental Assistant Certification" },
    ],
    cta: "Open",
    mentorNotes: "",
    subGoals: [
      { id: "dg1", label: "Dental Hours", target: 150, unit: "Hours" },
      { id: "dg2", label: "Experiences", target: 3, unit: "Exp" },
    ],
  },
  employment: {
    status: "Developing",
    actionPlan: "",
    recommended: [
      { label: "Resume Optimization Tool" },
      { label: "LinkedIn Profile Review" },
    ],
    cta: "View",
    mentorNotes: "",
    targetGoal: { value: 1, unit: "Roles" },
  },
  volunteering: {
    status: "Developing",
    actionPlan: "",
    recommended: [{ label: "Community Health Initiative" }],
    cta: "Enroll",
    mentorNotes: "",
    targetGoal: { value: 100, unit: "Hours" },
    subGoals: [
      { id: "vg1", label: "Volunteering Hours", target: 100, unit: "Hours" },
      { id: "vg2", label: "Organizations", target: 2, unit: "Orgs" },
    ],
  },
};

export const DEFAULT_MANUAL_DEXTERITY: ManualDexterityPlan = {
  status: "Developing",
  description:
    "Manual dexterity is a critical component of the dental application. Focus on fine motor skill development through hands-on activities.",
  recommendations: [
    "Simulation Lab Certification",
    "Weekly Wax Carving Practice",
    "Jewelry Making or Painting",
  ],
};

/** Merge saved categories with defaults so all accordion sections always appear. */
export function mergeCategoryPlans(
  saved?: Record<string, CategoryPlan> | null,
): Record<CategoryKey, CategoryPlan> {
  const out = {} as Record<CategoryKey, CategoryPlan>;
  for (const key of CATEGORY_ORDER) {
    const base = DEFAULT_CATEGORY_PLANS[key];
    const row = saved?.[key];
    if (!row) {
      out[key] = {
        ...base,
        recommended: normalizeRecommendations(base.recommended),
        subGoals: base.subGoals ? [...base.subGoals] : undefined,
      };
      continue;
    }
    out[key] = {
      ...base,
      ...row,
      recommended: normalizeRecommendations(
        row.recommended?.length ? row.recommended : base.recommended,
      ),
      subGoals: row.subGoals?.length ? row.subGoals : base.subGoals,
      targetGoal: row.targetGoal ?? base.targetGoal,
    };
  }
  return out;
}
