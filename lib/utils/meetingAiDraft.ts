import type { MeetingAiDraft } from "@/lib/types";

export function readMeetingAiDraft(raw: unknown): MeetingAiDraft | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as MeetingAiDraft;
}

export function dueDateFromDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + Math.min(90, Math.max(1, Math.round(days || 7))));
  return date.toISOString().split("T")[0];
}

/** 24-hour HH:mm from the notes parser → 12-hour time the picker uses. */
export function clockFrom24(time: string | undefined): { time: string; ampm: "AM" | "PM" } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || "").trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const ampm: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return { time: `${String(hour).padStart(2, "0")}:${match[2]}`, ampm };
}

export function matchSessionType(name: string | undefined, labels: string[]) {
  const other = labels.find((label) => label.toLowerCase() === "other") || "Other";
  const cleaned = (name || "").trim();
  if (!cleaned) return { type: labels[0] || other, custom: "" };
  const match = labels.find((label) => label.toLowerCase() === cleaned.toLowerCase());
  if (match && match.toLowerCase() !== "other") return { type: match, custom: "" };
  if (match) return { type: match, custom: "" };
  return { type: other, custom: cleaned };
}
