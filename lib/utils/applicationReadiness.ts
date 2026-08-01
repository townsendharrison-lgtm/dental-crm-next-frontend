import type {
  ApplicationReadinessFlags,
  Experience,
  ExperienceCategory,
  LetterOfRecommendationRequest,
  Student,
  StudentCredential,
} from "@/lib/types";

export type ReadinessItemSource = "manual" | "linked";

export type ReadinessManualKey = keyof ApplicationReadinessFlags;

export type ReadinessItemId =
  | "dat_scheduled"
  | "dat_completed"
  | "personal_statement_written"
  | "experience_descriptions_written"
  | "school_list_finalized"
  | "lor_letters"
  | "exp_shadowing"
  | "exp_volunteering"
  | "exp_academic"
  | "exp_research"
  | "exp_dental"
  | "exp_extracurricular"
  | "exp_licenses"
  | "exp_employment";

export type ReadinessSectionId = "dat" | "documents" | "experiences" | "school_list";

export interface ReadinessItemDef {
  id: ReadinessItemId;
  label: string;
  source: ReadinessItemSource;
  manualKey?: ReadinessManualKey;
  href?: string;
  hrefLabel?: string;
}

export interface ReadinessSectionDef {
  id: ReadinessSectionId;
  title: string;
  items: ReadinessItemDef[];
}

export const APPLICATION_READINESS_SECTIONS: ReadinessSectionDef[] = [
  {
    id: "dat",
    title: "DAT",
    items: [
      {
        id: "dat_scheduled",
        label: "Scheduled",
        source: "manual",
        manualKey: "dat_scheduled",
      },
      {
        id: "dat_completed",
        label: "Completed",
        source: "manual",
        manualKey: "dat_completed",
      },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    items: [
      {
        id: "personal_statement_written",
        label: "Personal Statement Written",
        source: "manual",
        manualKey: "personal_statement_written",
      },
      {
        id: "lor_letters",
        label: "Letters of Recommendation (4 Required)",
        source: "linked",
        href: "/student/letters/vault",
        hrefLabel: "Letter Vault",
      },
    ],
  },
  {
    id: "experiences",
    title: "Experiences",
    items: [
      {
        id: "exp_shadowing",
        label: "All Shadowing Experiences Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "exp_volunteering",
        label: "All Volunteering Experiences Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "exp_academic",
        label: "All Academic Enrichment Experiences Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "exp_research",
        label: "All Research Experiences Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "exp_dental",
        label: "All Dental Experiences Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "exp_extracurricular",
        label: "All Extracurricular Activities Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "exp_licenses",
        label: "All Licenses & Achievements Entered into DSG",
        source: "linked",
        href: "/student/profile",
        hrefLabel: "Profile & Docs",
      },
      {
        id: "exp_employment",
        label: "All Employment Experiences Entered into DSG",
        source: "linked",
        href: "/student/hub/tracker",
        hrefLabel: "Hour Tracker",
      },
      {
        id: "experience_descriptions_written",
        label: "Experience Descriptions Written",
        source: "manual",
        manualKey: "experience_descriptions_written",
      },
    ],
  },
  {
    id: "school_list",
    title: "School List",
    items: [
      {
        id: "school_list_finalized",
        label: "School List Finalized",
        source: "manual",
        manualKey: "school_list_finalized",
      },
    ],
  },
];

export const LOR_REQUIRED_FOR_READINESS = 4;

const EXP_CATEGORY_BY_ITEM: Partial<Record<ReadinessItemId, ExperienceCategory>> = {
  exp_shadowing: "Shadowing",
  exp_volunteering: "Volunteering",
  exp_academic: "Academic",
  exp_research: "Research",
  exp_dental: "Dental Experience",
  exp_extracurricular: "Extracurricular",
  exp_employment: "Employment",
};

export function normalizeApplicationReadinessFlags(
  raw: ApplicationReadinessFlags | Record<string, unknown> | null | undefined,
): ApplicationReadinessFlags {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    dat_scheduled: Boolean((src as ApplicationReadinessFlags).dat_scheduled),
    dat_completed: Boolean((src as ApplicationReadinessFlags).dat_completed),
    personal_statement_written: Boolean(
      (src as ApplicationReadinessFlags).personal_statement_written,
    ),
    experience_descriptions_written: Boolean(
      (src as ApplicationReadinessFlags).experience_descriptions_written,
    ),
    school_list_finalized: Boolean((src as ApplicationReadinessFlags).school_list_finalized),
  };
}

export function getApplicationReadinessFlags(student: Student): ApplicationReadinessFlags {
  return normalizeApplicationReadinessFlags(student.profile?.application_readiness);
}

export function countCollectedLors(
  student: Student,
  lorRequests: LetterOfRecommendationRequest[],
): number {
  if (student.profile?.lor_external_service || student.lorExternalService) {
    return Math.max(0, Number(student.profile?.lor_external_collected ?? 0) || 0);
  }
  return lorRequests.filter(
    (r) => r.status === "UPLOADED" || r.status === "REVIEWED",
  ).length;
}

export function hasExperienceCategory(
  experiences: Experience[],
  category: ExperienceCategory,
): boolean {
  return experiences.some((e) => e.category === category);
}

export interface ReadinessResolvedItem extends ReadinessItemDef {
  done: boolean;
  meta?: string;
}

export interface ReadinessResolvedSection {
  id: ReadinessSectionId;
  title: string;
  items: ReadinessResolvedItem[];
  doneCount: number;
  totalCount: number;
}

export function buildApplicationReadiness(input: {
  student: Student;
  experiences: Experience[];
  lorRequests: LetterOfRecommendationRequest[];
  credentials: StudentCredential[];
}): {
  sections: ReadinessResolvedSection[];
  doneCount: number;
  totalCount: number;
  percent: number;
  flags: ApplicationReadinessFlags;
} {
  const flags = getApplicationReadinessFlags(input.student);
  const lorCount = countCollectedLors(input.student, input.lorRequests);
  const lorDone = lorCount >= LOR_REQUIRED_FOR_READINESS;
  const hasCredentials = input.credentials.length > 0;

  const sections: ReadinessResolvedSection[] = APPLICATION_READINESS_SECTIONS.map((section) => {
    const items: ReadinessResolvedItem[] = section.items.map((item) => {
      if (item.source === "manual" && item.manualKey) {
        return { ...item, done: Boolean(flags[item.manualKey]) };
      }

      if (item.id === "lor_letters") {
        return {
          ...item,
          done: lorDone,
          meta: `${lorCount} / ${LOR_REQUIRED_FOR_READINESS} collected`,
        };
      }

      if (item.id === "exp_licenses") {
        return {
          ...item,
          done: hasCredentials,
          meta: hasCredentials
            ? `${input.credentials.length} entered`
            : "Add in Profile & Docs",
        };
      }

      const category = EXP_CATEGORY_BY_ITEM[item.id];
      if (category) {
        const done = hasExperienceCategory(input.experiences, category);
        const count = input.experiences.filter((e) => e.category === category).length;
        return {
          ...item,
          done,
          meta: done ? `${count} entered` : "Add in Hour Tracker",
        };
      }

      return { ...item, done: false };
    });

    const doneCount = items.filter((i) => i.done).length;
    return {
      id: section.id,
      title: section.title,
      items,
      doneCount,
      totalCount: items.length,
    };
  });

  const doneCount = sections.reduce((sum, s) => sum + s.doneCount, 0);
  const totalCount = sections.reduce((sum, s) => sum + s.totalCount, 0);
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return { sections, doneCount, totalCount, percent, flags };
}

export function toggleManualReadinessFlag(
  current: ApplicationReadinessFlags,
  key: ReadinessManualKey,
  value?: boolean,
): ApplicationReadinessFlags {
  const next = normalizeApplicationReadinessFlags(current);
  next[key] = value !== undefined ? value : !next[key];
  return next;
}
