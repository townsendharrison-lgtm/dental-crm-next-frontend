import type { Experience, ExperienceSession } from "@/lib/types";
import { parseLocalDate } from "@/lib/utils/dateUtils";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

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

/** Timeline end label: end date wins; else Current if last session < 60d; else last session date. */
export function experienceTimelineEnd(
  endDate: string | null | undefined,
  sessions: ExperienceSession[],
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

  // No sessions and no end date — treat as current
  return { label: "Current", isCurrent: true, lastSessionDate: null };
}

export function computeExperienceStats(exp: Experience): ExperienceDisplayStats {
  const sessions = exp.sessions || [];
  const totalHours = sessions.reduce((sum, s) => sum + Number(s.duration || 0), 0);

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
  const totalWeeks = Math.max(sessions.length > 0 ? 1 : 0, distinctWeeks.size) || (totalHours > 0 ? 1 : 0);
  const avgHoursPerWeek = totalWeeks > 0 ? totalHours / totalWeeks : 0;

  const startRaw = exp.startDate || exp.start_date || "";
  const endRaw = exp.endDate || exp.end_date || null;
  const times = sessionDateMs(sessions);
  const startDate =
    times.length > 0
      ? new Date(Math.min(...times))
      : startRaw
        ? parseLocalDate(startRaw)
        : new Date();

  const timeline = experienceTimelineEnd(endRaw, sessions);

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
 * Build synthetic prior sessions from quick-add fields.
 * Prefers total hours; otherwise avg × weeks. Spreads across weeks when weeks > 1.
 */
export function buildPriorHourSessions(opts: {
  startDate: string;
  totalHours?: number | null;
  avgHrsPerWeek?: number | null;
  weeks?: number | null;
}): Array<{ date: string; duration: number; notes: string }> {
  const start = opts.startDate;
  let total = opts.totalHours && opts.totalHours > 0 ? opts.totalHours : null;
  let avg = opts.avgHrsPerWeek && opts.avgHrsPerWeek > 0 ? opts.avgHrsPerWeek : null;
  let weeks =
    opts.weeks && opts.weeks > 0 ? Math.min(520, Math.floor(opts.weeks)) : null;

  if (!total && avg && weeks) total = avg * weeks;
  if (!avg && total && weeks) avg = total / weeks;
  if (!weeks && total && avg) weeks = Math.max(1, Math.round(total / avg));

  if (!total && !avg) return [];

  const note = "Prior hours (quick add)";
  const duration = Math.round((total || avg || 0) * 100) / 100;

  // Spread across weeks only for a manageable count; otherwise one bulk session
  if (weeks && weeks > 1 && weeks <= 26 && avg) {
    const base = parseLocalDate(start);
    return Array.from({ length: weeks }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - i * 7);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return {
        date: `${y}-${m}-${day}`,
        duration: Math.round(avg! * 100) / 100,
        notes: note,
      };
    });
  }

  return [
    {
      date: start,
      duration,
      notes: weeks && weeks > 1 ? `${note} · ${weeks} weeks` : note,
    },
  ];
}
