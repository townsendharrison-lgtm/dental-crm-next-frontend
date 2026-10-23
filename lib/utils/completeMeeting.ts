import { meetingsApi } from "@/lib/api/meetings";
import { actionItemsApi } from "@/lib/api/actionItems";
import type { CompleteMeetingData } from "@/components/mentor/CompleteMeetingForm";

function toDateIso(dateOnly: string): string {
  if (!dateOnly) return new Date().toISOString();
  if (dateOnly.includes("T")) return dateOnly;
  return `${dateOnly}T12:00:00.000Z`;
}

const REASON_LABELS: Record<string, string> = {
  UNCLEAR_INSTRUCTIONS: "Unclear instructions",
  TIME_MANAGEMENT: "Time management",
  AVOIDANCE: "Avoidance/lack of follow-through",
  ACADEMIC: "Academic issue",
  PERSONAL: "Personal issue",
  MENTOR_DELAY: "Mentor delay",
  OTHER: "Other",
};

function buildMentorNotes(data: CompleteMeetingData): string {
  const parts: string[] = [];
  parts.push(`Session type: ${data.meetingType}`);
  parts.push(`Previous commitments: ${data.commitmentsCompleted}`);
  if (data.commitmentsCompleted !== "ALL" && data.incompleteReason) {
    const reason = REASON_LABELS[data.incompleteReason] || data.incompleteReason;
    parts.push(
      `Reason for incomplete commitments: ${reason}${
        data.incompleteReason === "OTHER" && data.incompleteReasonDetail
          ? ` — ${data.incompleteReasonDetail}`
          : ""
      }`,
    );
  }
  parts.push("Verified summary and action items: yes");
  parts.push("Updated school selection and timeline if needed: yes");
  const mentorItems = data.mentorActionItems.filter((item) => item.task.trim());
  if (mentorItems.length > 0) {
    parts.push(
      `Mentor action items:\n${mentorItems
        .map((item) => {
          const extras = [
            item.dueDate ? `due ${item.dueDate}` : "",
            item.priority || "",
            item.description?.trim() || "",
            item.resourceLink?.trim() || "",
          ].filter(Boolean);
          return `• ${item.task.trim()}${extras.length ? ` (${extras.join("; ")})` : ""}`;
        })
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
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
  const review = {
    officialSummary: data.officialSummary,
    commitmentsCompleted: data.commitmentsCompleted,
    incompleteReason: data.commitmentsCompleted === "ALL" ? null : data.incompleteReason || null,
    incompleteReasonDetail:
      data.commitmentsCompleted !== "ALL" && data.incompleteReason === "OTHER"
        ? data.incompleteReasonDetail || null
        : null,
    verifiedSummary: true,
    verifiedSchoolTimeline: true,
  };

  let id = meetingId;
  if (id) {
    await meetingsApi.update(id, {
      completed: true,
      summary: data.summaryMessage,
      duration: data.duration,
      title,
      mentorNotes,
      date: dateIso,
      ...review,
    });
  } else {
    const created = await meetingsApi.create({
      studentId,
      title,
      date: dateIso,
      duration: data.duration,
      summary: data.summaryMessage,
      mentorNotes,
      type: "STUDENT_MEETING",
    });
    id = created.id;
    await meetingsApi.update(id, { completed: true, ...review });
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

  return id;
}
