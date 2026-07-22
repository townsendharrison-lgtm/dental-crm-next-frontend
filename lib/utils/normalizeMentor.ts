import type { Mentor, StudentAssignment } from "@/lib/types";

/** Flatten nested profile fields the UI expects as top-level camelCase. */
export function normalizeMentor(m: Mentor): Mentor {
  const profile = m.profile;
  return {
    ...m,
    avgResponseTime: m.avgResponseTime ?? profile?.avg_response_time,
    avgResponseTimeValue: m.avgResponseTimeValue ?? profile?.avg_response_time_value,
    complianceScore: m.complianceScore ?? profile?.compliance_score ?? 0,
    defaultAvailability: m.defaultAvailability ?? profile?.default_availability ?? [],
    phone: m.phone ?? profile?.phone ?? null,
    school: m.school ?? profile?.school ?? null,
    graduationYear: m.graduationYear ?? profile?.graduation_year ?? null,
    notes: m.notes ?? profile?.notes ?? null,
    managerScore: m.managerScore ?? profile?.manager_score ?? 0,
    studentIds: m.studentIds ?? [],
  };
}

export function normalizeMentors(mentors: Mentor[]): Mentor[] {
  return mentors.map(normalizeMentor);
}

/** Normalize assignment rows so UI can use camelCase ids. */
export function normalizeAssignment(a: StudentAssignment): StudentAssignment {
  return {
    ...a,
    studentId: a.studentId ?? a.student_id,
    mentorId: a.mentorId ?? a.mentor_id ?? undefined,
    student: a.student ?? null,
  };
}

export function normalizeAssignments(assignments: StudentAssignment[]): StudentAssignment[] {
  return assignments.map(normalizeAssignment);
}
