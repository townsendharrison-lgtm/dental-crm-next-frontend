import type { ApplicationJourneyFlags, Student } from "@/lib/types";

export type ApplicationJourneyPhaseId = "phase1" | "phase2" | "phase3" | "phase4";

export interface ApplicationJourneyPhaseDef {
  id: ApplicationJourneyPhaseId;
  number: number;
  title: string;
  /** Short label for compact UI */
  shortTitle: string;
}

export const APPLICATION_JOURNEY_PHASES: ApplicationJourneyPhaseDef[] = [
  {
    id: "phase1",
    number: 1,
    title: "Intake & Custom Planning",
    shortTitle: "Intake & Custom Planning",
  },
  {
    id: "phase2",
    number: 2,
    title: "Preparation & Application Building",
    shortTitle: "Preparation & Building",
  },
  {
    id: "phase3",
    number: 3,
    title: "Primary & Secondary Application Execution",
    shortTitle: "Application Execution",
  },
  {
    id: "phase4",
    number: 4,
    title: "Waiting, Interviews, & Offers",
    shortTitle: "Waiting, Interviews, & Offers",
  },
];

export function normalizeApplicationJourneyFlags(
  raw: ApplicationJourneyFlags | Record<string, unknown> | null | undefined,
): ApplicationJourneyFlags {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    phase1: Boolean((src as ApplicationJourneyFlags).phase1),
    phase2: Boolean((src as ApplicationJourneyFlags).phase2),
    phase3: Boolean((src as ApplicationJourneyFlags).phase3),
    phase4: Boolean((src as ApplicationJourneyFlags).phase4),
  };
}

export function getApplicationJourneyFlags(student: Student): ApplicationJourneyFlags {
  return normalizeApplicationJourneyFlags(student.profile?.application_journey);
}

export function applicationJourneyProgress(flags: ApplicationJourneyFlags) {
  const phases = APPLICATION_JOURNEY_PHASES;
  const doneCount = phases.filter((p) => Boolean(flags[p.id])).length;
  const totalCount = phases.length;
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  return { doneCount, totalCount, percent };
}

export function toggleJourneyPhase(
  current: ApplicationJourneyFlags,
  phaseId: ApplicationJourneyPhaseId,
  value?: boolean,
): ApplicationJourneyFlags {
  const next = normalizeApplicationJourneyFlags(current);
  next[phaseId] = value ?? !next[phaseId];
  return next;
}

export function journeyPhaseLabel(phaseNum: number): string {
  const phase = APPLICATION_JOURNEY_PHASES.find((p) => p.number === phaseNum);
  if (!phase) return `Phase ${phaseNum}`;
  return `Phase ${phase.number}: ${phase.title}`;
}

/** Month offsets from student start for each journey phase (inclusive end). */
const PHASE_MONTH_RANGES = [
  { start: 0, end: 3 },
  { start: 4, end: 6 },
  { start: 7, end: 9 },
  { start: 10, end: 12 },
] as const;

/** Short month label for Momentum stepper, e.g. "Aug - Dec". */
export function journeyPhaseMonthRange(
  phaseNum: number,
  studentCreatedAt?: string | null,
): string {
  const range = PHASE_MONTH_RANGES[phaseNum - 1];
  if (!range) return "";

  const format = (date: Date) =>
    date.toLocaleString("en-US", { month: "short" });

  if (!studentCreatedAt) {
    return `Month ${range.start + 1}–${range.end}`;
  }

  const created = new Date(studentCreatedAt);
  if (Number.isNaN(created.getTime())) {
    return `Month ${range.start + 1}–${range.end}`;
  }

  const startDate = new Date(created);
  startDate.setMonth(created.getMonth() + range.start);

  const endDate = new Date(created);
  endDate.setMonth(created.getMonth() + range.end);

  return `${format(startDate)} - ${format(endDate)}`;
}

/** First incomplete phase is current; all before it are complete. */
export function getJourneyPhaseStatus(
  flags: ApplicationJourneyFlags,
  phaseId: ApplicationJourneyPhaseId,
): "complete" | "current" | "upcoming" {
  if (flags[phaseId]) return "complete";
  const firstOpen = APPLICATION_JOURNEY_PHASES.find((p) => !flags[p.id]);
  if (firstOpen?.id === phaseId) return "current";
  return "upcoming";
}
