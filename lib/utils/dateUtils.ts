/**
 * Parses a date string as a LOCAL date to avoid timezone-shift bugs.
 *
 * When the database stores a date-only value like "2026-05-24" and you pass it
 * to `new Date("2026-05-24")`, the JS engine interprets it as midnight **UTC**.
 * For users in timezones behind UTC (e.g. US Eastern = UTC-5), that becomes
 * 2026-05-23 19:00 local time — i.e. the **previous day**.
 *
 * This helper splits the string and constructs the Date using the local-time
 * constructor (`new Date(year, monthIndex, day)`) which avoids the shift.
 *
 * If the string already contains a time component ("T"), it is treated as a
 * full ISO timestamp and parsed normally.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // If the string contains a time component, parse normally
  if (dateStr.includes('T')) return new Date(dateStr);
  // Date-only string: split and construct as local
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * True when a meeting is still upcoming.
 * Date-only values stay "upcoming" through the end of that local calendar day
 * so timezone UTC shifts don't hide today's sessions.
 */
export function isUpcomingMeetingDate(dateStr?: string | null, now = new Date()): boolean {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (!dateStr.includes("T")) {
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() >= now.getTime();
  }
  return d.getTime() >= now.getTime();
}

/** Resolve a student's preferred IANA timezone (profile → browser fallback). */
export function resolveStudentTimezone(student?: {
  timezone?: string | null;
  profile?: { timezone?: string | null } | null;
}): string {
  return (
    student?.timezone ||
    student?.profile?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC"
  );
}

/** Format an ISO / date string in a specific IANA timezone. */
export function formatInTimezone(
  dateStr: string,
  timeZone?: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string {
  if (!dateStr) return "—";
  const date = dateStr.includes("T") ? new Date(dateStr) : parseLocalDate(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  try {
    return date.toLocaleString("en-US", {
      ...options,
      timeZone: timeZone || undefined,
    });
  } catch {
    return date.toLocaleString("en-US", options);
  }
}

/**
 * Convert a wall-clock date + 24h time in an IANA zone to a UTC ISO string.
 * Example: ("2026-07-22", "14:30", "America/New_York") → ISO instant.
 */
export function zonedDateTimeToUtcIso(
  dateOnly: string,
  time24: string,
  timeZone: string,
): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const [hours, minutes] = time24.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const partsOf = (ms: number) => {
    const parts = formatter.formatToParts(new Date(ms));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value || "0");
    return {
      year: get("year"),
      month: get("month"),
      day: get("day"),
      hour: get("hour") % 24,
      minute: get("minute"),
      second: get("second"),
    };
  };

  const shown = partsOf(utcGuess);
  const shownAsUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
    shown.second,
  );
  const desiredAsUtc = Date.UTC(year, month - 1, day, hours, minutes, 0);
  return new Date(utcGuess + (desiredAsUtc - shownAsUtc)).toISOString();
}
