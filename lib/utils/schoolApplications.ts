import type { Application, ApplicationStatus, School, StudentSchool } from "@/lib/types";

/** Map a student_schools row (+ joined school) into hub School list shape. */
export function mapStudentSchoolToHubSchool(row: StudentSchool): School {
  const school = row.school || ({} as School);
  const schoolId = row.school_id || (school as any).id || "";
  return {
    ...school,
    id: schoolId,
    name: school.name || "Unknown school",
    location: school.location || "—",
    type: row.category || "Target",
    notes: row.notes ?? school.notes ?? null,
    selectionId: row.id,
    selectionStatus: row.status,
    strengthScoreAvg: school.strengthScoreAvg ?? school.strength_score_avg,
    datAvg: school.datAvg ?? school.dat_avg,
    avgGPA: school.avgGPA ?? school.avg_gpa,
    acceptanceRate: school.acceptanceRate ?? school.acceptance_rate,
    isAcceptanceRate: school.isAcceptanceRate ?? school.is_acceptance_rate,
    oosAcceptanceRate: school.oosAcceptanceRate ?? school.oos_acceptance_rate,
  };
}

/** Normalize applications API row into UI camelCase shape. */
export function normalizeApplication(row: Application | Record<string, any>): Application {
  const school = row.school as School | undefined;
  const schoolId = row.schoolId ?? row.school_id ?? school?.id ?? "";
  const status = (row.status || "Applied") as ApplicationStatus;
  return {
    ...row,
    id: row.id,
    studentId: row.studentId ?? row.student_id,
    student_id: row.student_id ?? row.studentId,
    schoolId,
    school_id: schoolId,
    schoolName: row.schoolName ?? school?.name ?? "Unknown school",
    school,
    status,
    appliedDate: row.appliedDate ?? row.applied_date ?? null,
    applied_date: row.applied_date ?? row.appliedDate ?? null,
    interviewDate: row.interviewDate ?? row.interview_date ?? null,
    interview_date: row.interview_date ?? row.interviewDate ?? null,
    decisionDate: row.decisionDate ?? row.decision_date ?? null,
    decision_date: row.decision_date ?? row.decisionDate ?? null,
    notes: row.notes ?? null,
  };
}

export function schoolEnsurePayloadFromHub(school: School) {
  return {
    name: school.name,
    location: school.location || "Unknown",
    strengthScoreAvg: school.strengthScoreAvg ?? school.strength_score_avg ?? 0,
    datAvg: school.datAvg ?? school.dat_avg ?? 0,
    avgGpa: school.avgGPA ?? school.avg_gpa ?? 0,
    acceptanceRate: school.acceptanceRate ?? school.acceptance_rate ?? undefined,
    isAcceptanceRate: school.isAcceptanceRate ?? school.is_acceptance_rate ?? undefined,
    oosAcceptanceRate: school.oosAcceptanceRate ?? school.oos_acceptance_rate ?? undefined,
    ccCredits: school.ccCredits ?? school.cc_credits ?? true,
    tuition: school.tuition ?? undefined,
    notes: typeof school.notes === "string" ? school.notes : undefined,
    inStateEnrollment: school.inStateEnrollment ?? school.in_state_enrollment ?? undefined,
    outOfStateEnrollment: school.outOfStateEnrollment ?? school.out_of_state_enrollment ?? undefined,
    maleEnrollment: school.maleEnrollment ?? school.male_enrollment ?? undefined,
    femaleEnrollment: school.femaleEnrollment ?? school.female_enrollment ?? undefined,
    ethnicity: school.ethnicity ?? undefined,
    minDat5th: school.minDat5th ?? school.min_dat_5th ?? undefined,
    minCgpa5th: school.minCgpa5th ?? school.min_cgpa_5th ?? undefined,
  };
}
