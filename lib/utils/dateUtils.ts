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
  if (dateStr.includes("T")) return new Date(dateStr);
  // Date-only string: split and construct as local
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};
