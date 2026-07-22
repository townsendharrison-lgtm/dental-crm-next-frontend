import type { Student, ReadinessStatus } from "@/lib/types";

/** Flatten nested profile fields the UI expects as top-level camelCase. */
export function normalizeStudent(s: Student): Student {
  const profile = s.profile;
  return {
    ...s,
    mentorId: s.mentorId ?? profile?.mentor_id ?? undefined,
    readiness: (s.readiness ?? profile?.readiness) as ReadinessStatus | undefined,
    progress: s.progress ?? profile?.progress,
    gpa: s.gpa ?? profile?.gpa,
    strengthScore: s.strengthScore ?? profile?.strength_score,
    datScore: s.datScore ?? profile?.dat_score,
    datAA: s.datAA ?? profile?.dat_aa,
    datTS: s.datTS ?? profile?.dat_ts,
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
    isReapplicant: s.isReapplicant ?? profile?.is_reapplicant,
    schoolCategories:
      s.schoolCategories ??
      (profile as { school_categories?: Student["schoolCategories"] } | null | undefined)
        ?.school_categories ??
      undefined,
  };
}

export function normalizeStudents(students: Student[]): Student[] {
  return students.map(normalizeStudent);
}
