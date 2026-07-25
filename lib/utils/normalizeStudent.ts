import type { Student, ReadinessStatus } from "@/lib/types";
import { preferredDatScore } from "@/lib/utils/studentMetrics";

/** Flatten nested profile fields the UI expects as top-level camelCase. */
export function normalizeStudent(s: Student): Student {
  const profile = s.profile;
  const datAA = s.datAA ?? profile?.dat_aa ?? null;
  const datTS = s.datTS ?? profile?.dat_ts ?? null;
  const rawDatScore = s.datScore ?? profile?.dat_score ?? null;
  const flattened: Student = {
    ...s,
    mentorId: s.mentorId ?? profile?.mentor_id ?? undefined,
    readiness: (s.readiness ?? profile?.readiness) as ReadinessStatus | undefined,
    progress: s.progress ?? profile?.progress,
    gpa: s.gpa ?? profile?.gpa,
    strengthScore: s.strengthScore ?? profile?.strength_score,
    datScore: rawDatScore,
    datAA,
    datTS,
    datVerified: s.datVerified ?? profile?.dat_verified,
    gpaVerified: s.gpaVerified ?? profile?.gpa_verified,
    lastMeetingDate: s.lastMeetingDate ?? profile?.last_meeting_date ?? undefined,
    nextMeetingDate: s.nextMeetingDate ?? profile?.next_meeting_date ?? undefined,
    lastContactDate: s.lastContactDate ?? profile?.last_contact_date ?? undefined,
    missingDocsCount: s.missingDocsCount ?? profile?.missing_docs_count,
    openActionItemsCount: s.openActionItemsCount ?? profile?.open_action_items_count,
    avgResponseTime: s.avgResponseTime ?? profile?.avg_response_time,
    monthColors:
      s.monthColors ??
      (profile as { month_colors?: Student["monthColors"] } | null | undefined)?.month_colors ??
      undefined,
    status: s.status ?? profile?.status,
    timezone: s.timezone ?? profile?.timezone,
    state: s.state ?? profile?.state,
    country: s.country ?? profile?.country,
    zipCode: s.zipCode ?? profile?.zip_code ?? undefined,
    createdAt: s.createdAt ?? profile?.created_at ?? undefined,
    updatedAt: s.updatedAt ?? profile?.updated_at ?? undefined,
    isReapplicant:
      s.isReapplicant ??
      profile?.is_reapplicant ??
      profile?.applicant_type === "REAPPLICANT",
    ethnicity: s.ethnicity ?? profile?.ethnicity,
    gender: s.gender ?? profile?.gender,
    age: s.age ?? profile?.age,
    undergradInstitution: s.undergradInstitution ?? profile?.undergrad_institution,
    undergradDegree: s.undergradDegree ?? profile?.undergrad_degree,
    undergradGradYear: s.undergradGradYear ?? profile?.undergrad_grad_year,
    applicationCycle: s.applicationCycle ?? profile?.application_cycle,
    lorRequired: s.lorRequired ?? profile?.lor_required,
    lorExternalService: s.lorExternalService ?? profile?.lor_external_service,
    postBac: s.postBac ?? profile?.post_bac ?? undefined,
    masters: s.masters ?? profile?.masters ?? undefined,
    schoolCategories:
      s.schoolCategories ??
      (profile as { school_categories?: Student["schoolCategories"] } | null | undefined)
        ?.school_categories ??
      undefined,
    // Keep nested profile as source of truth for newer academic fields
    // (sgpa, major, dat_type, sectionals, schools, etc.).
    profile: profile ?? s.profile,
  };

  // Prefer AA over a default-0 legacy overall score for top-level display.
  const preferred = preferredDatScore(flattened);
  if (preferred != null && (!rawDatScore || rawDatScore <= 0)) {
    flattened.datScore = preferred;
  }

  return flattened;
}

export function normalizeStudents(students: Student[]): Student[] {
  return students.map(normalizeStudent);
}
