/** Default meet-and-greet / suggest-time chips when mentor has no saved presets. */
export const FALLBACK_MEETING_TIME_PRESETS = [
  "Monday 10:00 AM",
  "Monday 2:00 PM",
  "Tuesday 10:00 AM",
  "Wednesday 2:00 PM",
  "Thursday 10:00 AM",
  "Friday 1:00 PM",
];

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type ParsedMeetingPreset = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM 12h clock digits for TimePicker
  ampm: "AM" | "PM";
};

/**
 * Parse labels like "Monday 10:00 AM" or "Friday at 1pm" into the next
 * occurrence from today (or today if that weekday+time is still ahead).
 */
export function parseMeetingPresetToNextOccurrence(
  label: string,
  from = new Date(),
): ParsedMeetingPreset | null {
  const raw = label.trim();
  if (!raw) return null;

  const weekdayMatch = raw.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  const timeMatch = raw.match(
    /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)/i,
  );
  if (!weekdayMatch || !timeMatch) return null;

  const targetDow = WEEKDAYS[weekdayMatch[1].toLowerCase()];
  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2] || "0", 10);
  const ampmRaw = timeMatch[3].replace(/\./g, "").toUpperCase();
  const ampm: "AM" | "PM" = ampmRaw.startsWith("P") ? "PM" : "AM";

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  let hour24 = hour % 12;
  if (ampm === "PM") hour24 += 12;

  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  const todayDow = cursor.getDay();
  let daysAhead = (targetDow - todayDow + 7) % 7;
  const candidate = new Date(cursor);
  candidate.setDate(cursor.getDate() + daysAhead);
  candidate.setHours(hour24, minute, 0, 0);
  if (candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  }

  const y = candidate.getFullYear();
  const m = String(candidate.getMonth() + 1).padStart(2, "0");
  const d = String(candidate.getDate()).padStart(2, "0");
  const displayH = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return {
    date: `${y}-${m}-${d}`,
    time: `${String(displayH).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    ampm,
  };
}

export function resolveMeetingTimePresets(saved?: string[] | null): string[] {
  const cleaned = (saved || []).map((s) => s.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...FALLBACK_MEETING_TIME_PRESETS];
}
