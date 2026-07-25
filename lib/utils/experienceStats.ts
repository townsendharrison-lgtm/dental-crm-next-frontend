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

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

/**
 * Timeline end label:
 * - End date wins (never "Current")
 * - Else Current if last session within 60 days
 * - Else last session date
 * - No sessions + no end date → Current
 */
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
  if (times.length > 0) {
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
    startMs != null && endMs != null ? weeksBetween(startMs, endMs) : 0;
  const totalWeeks = Math.max(
    sessions.length > 0 ? 1 : 0,
    distinctWeeks.size,
    spanWeeks,
  );
  const avgHoursPerWeek = totalWeeks > 0 ? totalHours / totalWeeks : 0;

  const startDate =
    startMs != null
      ? new Date(startMs)
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
 * Prefers total hours; otherwise avg × weeks. Spreads across weeks when weeks > 1
 * so Timeline / Avg Hrs/Wk / Weeks stay accurate.
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
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Spread weekly so stats (weeks / avg) stay correct. Cap spread count; beyond that
  // use start + end anchors so the date span still reflects the reported weeks.
  if (weeks && weeks > 1 && avg) {
    const base = parseLocalDate(start);
    const spreadCount = Math.min(weeks, 104);
    const perSession = round2(total! / spreadCount);

    if (weeks <= 104) {
      return Array.from({ length: weeks }, (_, i) => {
        const d = new Date(base);
        d.setDate(d.getDate() - i * 7);
        return {
          date: toYmd(d),
          duration: perSession,
          notes: note,
        };
      });
    }

    const end = new Date(base);
    end.setDate(end.getDate() - (weeks - 1) * 7);
    const half = round2(total! / 2);
    return [
      { date: toYmd(base), duration: half, notes: `${note} · ${weeks} weeks` },
      { date: toYmd(end), duration: round2(total! - half), notes: `${note} · ${weeks} weeks` },
    ];
  }

  return [
    {
      date: start,
      duration: round2(total || avg || 0),
      notes: weeks && weeks > 1 ? `${note} · ${weeks} weeks` : note,
    },
  ];
}
