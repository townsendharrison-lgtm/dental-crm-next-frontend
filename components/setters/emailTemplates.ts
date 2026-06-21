import type { LeadEmailTemplate } from "@/lib/types";

/** Default automated email templates (client-side, mirrors old frontend). */
export const DEFAULT_EMAIL_TEMPLATES: LeadEmailTemplate[] = [
  {
    id: "tmpl-strategy-24h",
    meetingType: "Strategy Session",
    triggerType: "24h_before",
    subject: "Your Strategy Session is tomorrow",
    body: "Hi {{lead_name}},\n\nThis is a reminder that your {{meeting_type}} is scheduled for {{meeting_time}}. We're looking forward to speaking with you!",
    enabled: true,
    sendTimeOffsetHours: -24,
  },
  {
    id: "tmpl-strategy-1h",
    meetingType: "Strategy Session",
    triggerType: "1h_before",
    subject: "Starting soon: your Strategy Session",
    body: "Hi {{lead_name}},\n\nYour {{meeting_type}} starts in about an hour ({{meeting_time}}). See you soon!",
    enabled: true,
    sendTimeOffsetHours: -1,
  },
  {
    id: "tmpl-followup-1d",
    meetingType: "Follow-up",
    triggerType: "1d_after",
    subject: "Following up on our conversation",
    body: "Hi {{lead_name}},\n\nThanks for joining your {{meeting_type}}. Let us know if you have any questions!",
    enabled: true,
    sendTimeOffsetHours: 24,
  },
  {
    id: "tmpl-followup-3d",
    meetingType: "Follow-up",
    triggerType: "3d_after",
    subject: "Checking in",
    body: "Hi {{lead_name}},\n\nJust checking in after your {{meeting_type}}. We'd love to help you take the next step.",
    enabled: true,
    sendTimeOffsetHours: 72,
  },
];
