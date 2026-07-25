import type { ApplicantType, Student } from "@/lib/types";

/** Treat 0 / empty legacy `dat_score` as missing so AA/sectionals win. */
function isPresentScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Preferred DAT snapshot for roster/header cards.
 * Students usually update `dat_aa` (and sectionals); `dat_score` often stays 0.
 */
export function preferredDatScore(student?: Student | null): number | null {
  if (!student) return null;
  const p = student.profile;
  if (isPresentScore(student.datAA)) return student.datAA;
  if (isPresentScore(p?.dat_aa)) return p!.dat_aa!;
  if (isPresentScore(student.datScore)) return student.datScore;
  if (isPresentScore(p?.dat_score)) return p!.dat_score!;
  if (isPresentScore(student.datTS)) return student.datTS;
  if (isPresentScore(p?.dat_ts)) return p!.dat_ts!;
  return null;
}

export function applicantTypeLabel(student?: Student | null): string {
  if (!student) return "—";
  const type = (student.profile?.applicant_type || null) as ApplicantType | null;
  if (type === "REAPPLICANT") return "Re-applicant";
  if (type === "FIRST_TIME") return "First-time";
  if (student.isReapplicant ?? student.profile?.is_reapplicant) return "Re-applicant";
  return "—";
}
