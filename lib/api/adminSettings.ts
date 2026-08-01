import { apiGet, apiPut, apiPost } from "./client";
import type { AdminSettings, MeetingTypeConfig, PlatformConfig, TimelineCardColors } from "@/lib/types";
import { DEFAULT_TIMELINE_CARD_COLORS } from "@/lib/types";

export interface UpdateSettingsPayload {
  platformName?: string;
  supportEmail?: string;
  maintenanceMode?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyMessage?: string | null;
  autoReplyInactivityMinutes?: number;
  autoReplyRateLimitMinutes?: number;
  welcomeTemplateStudent?: string | null;
  welcomeTemplateMentor?: string | null;
  welcomeTemplateAssignment?: string | null;
  acceptedMessage?: string | null;
  interviewMessage?: string | null;
  waitlistMessage?: string | null;
  meetingTypes?: MeetingTypeConfig[];
  timelineCardColors?: TimelineCardColors;
}

export const DEFAULT_ASSIGNMENT_WELCOME = `Hi [Mentee Name],

Your mentor, [Mentor Name], is thrilled to be working with you! They look forward to helping you pursue your dream of becoming a dentist.

To get started, please use the link below to schedule a 30-minute meet-and-greet meeting:

[Meeting Times]

[Timezone]

Feel free to reach out if you have any questions—we are here to support you every step of the way!

Looking forward to your progress!`;

export const DEFAULT_MEETING_TYPES: MeetingTypeConfig[] = [
  {
    id: "introductory-call",
    label: "Introductory Call",
    summaryTemplate:
      "Hi {name}, it was great meeting you today! We covered your background and set some initial goals. I've assigned a few tasks to get us started. Looking forward to our next session!",
  },
  {
    id: "dat-strategy",
    label: "DAT Strategy & Planning",
    summaryTemplate:
      "Hi {name}, great work on our DAT strategy session today. We've identified your target scores and a study timeline. Make sure to check the resources I've attached to your new tasks.",
  },
  {
    id: "application-review",
    label: "Application Review",
    summaryTemplate:
      "Hi {name}, we made good progress on your application review. Focus on the sections we discussed, especially the experiences descriptions. I'll review your next draft soon.",
  },
  {
    id: "personal-statement",
    label: "Personal Statement Workshop",
    summaryTemplate:
      "Hi {name}, your personal statement is coming along well. Focus on the 'why dentistry' narrative we brainstormed. I'm looking forward to seeing the revised version.",
  },
  {
    id: "interview-prep",
    label: "Interview Preparation",
    summaryTemplate:
      "Hi {name}, you did well in our mock interview. Remember to keep your answers concise and focus on specific examples. Practice the 'Tell me about yourself' pitch we refined.",
  },
  {
    id: "post-interview",
    label: "Post-Interview Debrief",
    summaryTemplate:
      "Hi {name}, thanks for sharing how your interview went. It sounds like you handled the ethical questions well. Now we wait for the next steps!",
  },
  {
    id: "other",
    label: "Other",
    summaryTemplate:
      "Hi {name}, thanks for our meeting today. We discussed {notes}. I've updated your action items accordingly.",
  },
];

export function normalizeMeetingTypes(raw: unknown): MeetingTypeConfig[] {
  let list: unknown = raw;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return DEFAULT_MEETING_TYPES;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_MEETING_TYPES;

  const cleaned = list
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const label = String(r.label || "").trim();
      if (!label) return null;
      return {
        id: String(r.id || `type-${index + 1}`).trim() || `type-${index + 1}`,
        label,
        summaryTemplate: String(r.summaryTemplate ?? r.summary_template ?? "").trim(),
      } satisfies MeetingTypeConfig;
    })
    .filter((row): row is MeetingTypeConfig => !!row);

  return cleaned.length > 0 ? cleaned : DEFAULT_MEETING_TYPES;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  acceptedMessage: "Congratulations! Your hard work has paid off. You're going to be a dentist!",
  interviewMessage: "Great job! An interview is a huge milestone. You've got this!",
  waitlistMessage:
    "You're still in the running! A waitlist is a 'not yet', not a 'no'. Stay positive!",
  welcomeTemplateStudent:
    "Welcome {{student_name}} to Dental CRM! We are excited to help you prepare for your applications.",
  welcomeTemplateMentor:
    "Welcome Mentor {{mentor_name}} to Dental CRM! Thank you for helping guide our students.",
  welcomeTemplateAssignment: DEFAULT_ASSIGNMENT_WELCOME,
  meetingTypes: DEFAULT_MEETING_TYPES,
  timelineCardColors: DEFAULT_TIMELINE_CARD_COLORS,
};

export function normalizeTimelineCardColors(raw: unknown): TimelineCardColors {
  const base = { ...DEFAULT_TIMELINE_CARD_COLORS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as Array<keyof TimelineCardColors>) {
    const val = String(obj[key] || "").trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(val)) base[key] = val;
  }
  return base;
}

export function platformConfigFromSettings(settings?: AdminSettings | null): PlatformConfig {
  if (!settings) return DEFAULT_PLATFORM_CONFIG;
  return {
    acceptedMessage: settings.accepted_message || DEFAULT_PLATFORM_CONFIG.acceptedMessage,
    interviewMessage: settings.interview_message || DEFAULT_PLATFORM_CONFIG.interviewMessage,
    waitlistMessage: settings.waitlist_message || DEFAULT_PLATFORM_CONFIG.waitlistMessage,
    welcomeTemplateStudent:
      settings.welcome_template_student || DEFAULT_PLATFORM_CONFIG.welcomeTemplateStudent,
    welcomeTemplateMentor:
      settings.welcome_template_mentor || DEFAULT_PLATFORM_CONFIG.welcomeTemplateMentor,
    welcomeTemplateAssignment:
      settings.welcome_template_assignment || DEFAULT_PLATFORM_CONFIG.welcomeTemplateAssignment,
    meetingTypes: normalizeMeetingTypes(settings.meeting_types),
    timelineCardColors: normalizeTimelineCardColors(settings.timeline_card_colors),
  };
}

export const adminSettingsApi = {
  get: async (): Promise<AdminSettings> => {
    return await apiGet<AdminSettings>("/api/admin-settings");
  },

  update: async (payload: UpdateSettingsPayload): Promise<AdminSettings> => {
    return await apiPut<AdminSettings>("/api/admin-settings", payload);
  },

  resetProfileReminders: async (): Promise<{ success: boolean; resetCount: number; message: string }> => {
    return await apiPost<{ success: boolean; resetCount: number; message: string }>(
      "/api/admin-settings/reset-profile-reminders",
    );
  },
};
