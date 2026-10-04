import { formatInTimezone, parseLocalDate } from "@/lib/utils/dateUtils";

export interface SummaryActionItem {
  task: string;
  dueDate?: string;
}

function formatDue(raw?: string) {
  if (!raw) return "";
  const date = parseLocalDate(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Bold lines the student inbox renders from **markers**. */
export function formatActionItemsBlock(items: SummaryActionItem[]) {
  const lines = items
    .filter((item) => item.task.trim())
    .map((item) => {
      const due = formatDue(item.dueDate);
      const label = due ? `${item.task.trim()} (Due: ${due})` : item.task.trim();
      return `**• ${label}**`;
    });
  return lines.join("\n");
}

export function formatNextMeetingForTimezone(iso: string, timeZone: string) {
  if (!iso) return "";
  return formatInTimezone(iso, timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Fill a meeting-type summary.
 * `{actionItems}` and `{nextMeeting}` are placed where the admin put them.
 * Next-meeting time is shown in the student's timezone.
 * `{notes}` includes that next meeting when one was scheduled.
 */
export function fillMeetingSummaryTemplate(options: {
  template: string;
  studentFirstName: string;
  notes?: string;
  actionItems?: SummaryActionItem[];
  nextMeetingLabel?: string;
}) {
  const template = options.template || "";
  const hasAction = /\{actionItems\}/i.test(template);
  const hasNotes = /\{notes\}/i.test(template);
  const hasNext = /\{nextMeeting\}/i.test(template);

  const actionBlock = formatActionItemsBlock(options.actionItems || []);
  const nextLine = options.nextMeetingLabel
    ? `Next meeting: ${options.nextMeetingLabel} (your local time).`
    : "";
  const notesBody = (options.notes || "").trim() || "our discussion";
  const notesWithMeeting =
    nextLine && !hasNext ? `${notesBody}\n${nextLine}` : notesBody;

  let text = template
    .replace(/\{name\}/gi, options.studentFirstName || "there")
    .replace(/\{notes\}/gi, notesWithMeeting)
    .replace(/\{nextMeeting\}/gi, nextLine)
    .replace(/\{actionItems\}/gi, actionBlock);

  if (!hasAction && actionBlock) {
    text = `${text.trim()}\n\nYour action items:\n${actionBlock}`;
  }
  if (!hasNotes && !hasNext && nextLine) {
    text = `${text.trim()}\n\n${nextLine}`;
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}
