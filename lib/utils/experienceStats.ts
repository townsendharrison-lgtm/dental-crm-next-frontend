import type { Experience, ExperienceSession } from "@/lib/types";
import { parseLocalDate } from "@/lib/utils/dateUtils";

const DAY_MS = 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * DAY_MS;
const WEEK_MS = 7 * DAY_MS;

export type ExperienceDisplayStats = {
  totalHours: number;
  totalWeeks: number;
  avgHoursPerWeek: number;
  displayStartDate: string;
  displayEndDate: string;
  isCurrent: boolean;
  lastSessionDate: string | null;
};

function sessionDateMs(sessions: ExperienceSession[]): number[] {
  return sessions
    .map((s) => {
      try {
        return parseLocalDate(s.date).getTime();
      } catch {
        return NaN;
      }
    })
    .filter((t) => Number.isFinite(t));
}

function weeksBetween(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 1;
  const span = Math.abs(endMs - startMs);
  return Math.max(1, Math.round(span / WEEK_MS) || 1);
}

function numField(exp: Experience, camel: keyof Experience, snake: keyof Experience): number {
  const raw = exp[camel] ?? exp[snake];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Timeline end label:
 * - Explicit end date always wins (never "Current")
 * - Else "Current" only if a session was logged within the last 60 days
 * - Else last session date (when last session is older than 60 days)
 * - No sessions and no end date → "Current" when marked ongoing, else em dash
 */
export function experienceTimelineEnd(
  endDate: string | null | undefined,
  sessions: ExperienceSession[],
  opts?: { isOngoing?: boolean },
): { label: string; isCurrent: boolean; lastSessionDate: string | null } {
  const times = sessionDateMs(sessions);
  const lastMs = times.length > 0 ? Math.max(...times) : null;
  const lastSessionDate =
    lastMs != null ? new Date(lastMs).toLocaleDateString() : null;

  if (endDate) {
    try {
      return {
        label: parseLocalDate(endDate).toLocaleDateString(),
        isCurrent: false,
        lastSessionDate,
      };
    } catch {
      return { label: endDate, isCurrent: false, lastSessionDate };
    }
  }

  if (lastMs != null) {
    const age = Date.now() - lastMs;
    if (age <= SIXTY_DAYS_MS) {
      return { label: "Current", isCurrent: true, lastSessionDate };
    }
    return {
      label: new Date(lastMs).toLocaleDateString(),
      isCurrent: false,
      lastSessionDate,
    };
  }

  if (opts?.isOngoing) {
    return { label: "Current", isCurrent: true, lastSessionDate: null };
  }

  return { label: "—", isCurrent: false, lastSessionDate: null };
}

export function computeExperienceStats(exp: Experience): ExperienceDisplayStats {
  const sessions = exp.sessions || [];
  const priorHours = numField(exp, "priorHours", "prior_hours");
  const priorWeeks = Math.floor(numField(exp, "priorWeeks", "prior_weeks"));
  const sessionHours = sessions.reduce((sum, s) => sum + Number(s.duration || 0), 0);
  const totalHours = priorHours + sessionHours;

  const distinctWeeks = new Set<number>();
  sessions.forEach((s) => {
    try {
      const d = parseLocalDate(s.date);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
      distinctWeeks.add(weekStart.getTime());
    } catch {
      /* ignore bad dates */
    }
  });

  const startRaw = exp.startDate || exp.start_date || "";
  const endRaw = exp.endDate || exp.end_date || null;
  const times = sessionDateMs(sessions);

  let startMs: number | null = null;
  if (startRaw) {
    try {
      startMs = parseLocalDate(startRaw).getTime();
    } catch {
      startMs = null;
    }
  }
  if (priorWeeks === 0 && times.length > 0) {
    const minSession = Math.min(...times);
    startMs = startMs != null ? Math.min(startMs, minSession) : minSession;
  }

  let endMs: number | null = null;
  if (endRaw) {
    try {
      endMs = parseLocalDate(endRaw).getTime();
    } catch {
      endMs = null;
    }
  }
  if (endMs == null && times.length > 0) {
    endMs = Math.max(...times);
  }

  const spanWeeks =
    priorWeeks === 0 && startMs != null && endMs != null
      ? weeksBetween(startMs, endMs)
      : 0;

  let sessionWeeks = 0;
  if (sessions.length > 0) {
    if (priorWeeks > 0) {
      // Prior weeks are authoritative; each logged session week adds on top.
      sessionWeeks = Math.max(1, distinctWeeks.size);
    } else {
      sessionWeeks = Math.max(1, distinctWeeks.size, spanWeeks);
    }
  }

  const totalWeeks =
    priorWeeks + sessionWeeks > 0
      ? priorWeeks + sessionWeeks
      : totalHours > 0
        ? 1
        : 0;
  const avgHoursPerWeek = totalWeeks > 0 ? totalHours / totalWeeks : 0;

  const startDate =
    startMs != null
      ? new Date(startMs)
      : startRaw
        ? parseLocalDate(startRaw)
        : new Date();

  const isOngoingFlag = exp.isOngoing ?? exp.is_ongoing;
  const isOngoing = isOngoingFlag != null ? !!isOngoingFlag : !endRaw;
  const timeline = experienceTimelineEnd(endRaw, sessions, {
    isOngoing: !endRaw && isOngoing,
  });

  return {
    totalHours,
    totalWeeks: totalWeeks || 0,
    avgHoursPerWeek,
    displayStartDate: startDate.toLocaleDateString(),
    displayEndDate: timeline.label,
    isCurrent: timeline.isCurrent,
    lastSessionDate: timeline.lastSessionDate,
  };
}

/**
 * Resolve optional prior-hours form fields into stored totals (no session rows).
 * Prefers total hours; otherwise avg × weeks. Infers the missing value when possible.
 */
export function resolvePriorHoursInput(opts: {
  totalHours?: number | null;
  avgHrsPerWeek?: number | null;
  weeks?: number | null;
}): { priorHours: number; priorWeeks: number } {
  let total = opts.totalHours && opts.totalHours > 0 ? opts.totalHours : null;
  let avg = opts.avgHrsPerWeek && opts.avgHrsPerWeek > 0 ? opts.avgHrsPerWeek : null;
  let weeks =
    opts.weeks && opts.weeks > 0 ? Math.min(520, Math.floor(opts.weeks)) : null;

  if (!total && avg && weeks) total = avg * weeks;
  if (!avg && total && weeks) avg = total / weeks;
  if (!weeks && total && avg) weeks = Math.max(1, Math.round(total / avg));

  if (!total) {
    return { priorHours: 0, priorWeeks: 0 };
  }

  return {
    priorHours: Math.round(total * 100) / 100,
    priorWeeks: weeks || 0,
  };
}
