import { meetingsApi } from "@/lib/api/meetings";
import { actionItemsApi } from "@/lib/api/actionItems";
import { messagesApi } from "@/lib/api/messages";
import type { CompleteMeetingData } from "@/components/mentor/CompleteMeetingForm";

function toDateIso(dateOnly: string): string {
  if (!dateOnly) return new Date().toISOString();
  if (dateOnly.includes("T")) return dateOnly;
  return `${dateOnly}T12:00:00.000Z`;
}

function buildMentorNotes(data: CompleteMeetingData): string {
  const parts: string[] = [];
  parts.push(`Session type: ${data.meetingType}`);
  parts.push(`Followed up on past action items: ${data.followedUpOnActionItems}`);
  const mentorItems = data.mentorActionItems.filter((item) => item.trim());
  if (mentorItems.length > 0) {
    parts.push(`Mentor action items:\n${mentorItems.map((item) => `• ${item}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

async function sendSummaryToStudent(studentId: string, summaryMessage: string) {
  const text = summaryMessage.trim();
  if (!text) return;
  const conv = await messagesApi.create({ participantIds: [studentId] });
  await messagesApi.sendMessage(conv.id, text);
}

/** Persist a completed mentorship meeting + student action items + optional follow-up. */
export async function persistMeetingCompletion(
  studentId: string,
  meetingId: string | undefined,
  data: CompleteMeetingData,
): Promise<string> {
  const mentorNotes = buildMentorNotes(data);
  const dateIso = toDateIso(data.meetingDate);
  const title = data.meetingType || "Mentorship Meeting";

  let id = meetingId;
  if (id) {
    await meetingsApi.update(id, {
      completed: true,
      notes: data.notes,
      summary: data.summaryMessage,
      duration: data.duration,
      title,
      mentorNotes,
      date: dateIso,
    });
  } else {
    const created = await meetingsApi.create({
      studentId,
      title,
      date: dateIso,
      duration: data.duration,
      notes: data.notes,
      summary: data.summaryMessage,
      mentorNotes,
      type: "STUDENT_MEETING",
    });
    id = created.id;
    await meetingsApi.update(id, { completed: true });
  }

  await Promise.all(
    data.studentActionItems.map((item) =>
      actionItemsApi.create({
        studentId,
        meetingId: id,
        task: item.task,
        dueDate: toDateIso(item.dueDate),
        priority: item.priority,
        description: item.description,
        resourceLink: item.resourceLink,
      }),
    ),
  );

  if (data.nextStep === "SCHEDULE" && data.nextMeetingDate) {
    await meetingsApi.create({
      studentId,
      title: data.nextMeetingType || "Follow-up Meeting",
      date: data.nextMeetingDate,
      timezone: data.nextMeetingTimezone,
      type: "STUDENT_MEETING",
    });
  }

  try {
    await sendSummaryToStudent(studentId, data.summaryMessage);
  } catch (err) {
    console.error("Failed to send meeting summary message to student:", err);
  }

  return id;
}
