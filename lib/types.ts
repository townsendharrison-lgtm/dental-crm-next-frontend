/**
 * Shared application types for the Dental CRM frontend.
 * Mirrors the backend contract (see backend/src/types).
 */

export const VALID_ROLES = [
  "ADMIN",
  "MENTOR_MANAGER",
  "MENTOR",
  "STUDENT",
  "LETTER_WRITER",
  "SETTER",
] as const;

export type UserRole = (typeof VALID_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface SignInResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

/** Standard error shape returned by the backend. */
export interface ApiError {
  error: string;
  status?: number;
}

// --- Lead Management / Setter Dashboard -------------------------------------

export type LeadMeetingType = "Strategy Session" | "Follow-up";

export interface LeadMeeting {
  id: string;
  leadId: string;
  type: LeadMeetingType;
  startTime: string; // ISO string
  timezone?: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  emailsSent: string[]; // trigger keys like '24h_before'
}

export interface Lead {
  id: string;
  setterId: string;
  name: string;
  phone: string;
  email: string;
  source: "Facebook" | "Instagram" | "Reddit" | "Other" | string;
  contacted: boolean;
  showedUp: boolean | null;
  isPaid: boolean;
  createdAt: string;
  notes?: string;
  adminNotes?: string;
  purchasedItems?: string[];
  purchaseTotal?: number;
  meetings?: LeadMeeting[];
}

export interface LeadEmailTemplate {
  id: string;
  meetingType: LeadMeetingType;
  triggerType: "24h_before" | "1h_before" | "1d_after" | "3d_after";
  subject: string;
  body: string;
  enabled: boolean;
  sendTimeOffsetHours: number; // negative for before, positive for after
}

export interface EmailSettings {
  templates: LeadEmailTemplate[];
  gmailConnected: boolean;
  gmailEmail?: string;
}

/** A setter user, extending the base user with lead goals. */
export interface SetterUser extends AuthUser {
  weeklyLeadGoal?: number;
  monthlyLeadGoal?: number;
}

// --- Admin User Management --------------------------------------------------

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  invited_by_name: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | string;
  created_at: string;
  expires_at: string;
}

// --- LOR System Types --------------------------------------------------------

export interface LetterOfRecommendationRequest {
  id: string;
  studentId?: string;
  studentName?: string;
  writerName: string;
  writerEmail: string;
  dueDate: string;
  status: "REQUESTED" | "UPLOADED" | "REVIEWED" | "DECLINED";
  requestedAt: string;
  uploadedAt?: string;
  reviewedAt?: string;
  declineReason?: string;
  documentUrl?: string;
  accessCode: string;
}

export interface ReminderScheduleEntry {
  days: number;
  target: "writer" | "requester";
}

export interface LOREmailConfig {
  id: string;
  design: {
    primaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
  };
  content: {
    subject: string;
    body: string;
    requirements: string;
    exampleLetter: string;
    requirementsPdfUrl?: string;
    exampleLetterPdfUrl?: string;
    writerReminderBody?: string;
    requesterReminderBody?: string;
  };
  reminderSchedule: ReminderScheduleEntry[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface ShadowStats {
  allowedPercentage: number;
  avgRating: number;
  totalReports: number;
}

export interface Dentist {
  npi: string;
  name: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  specialty: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
  distanceFromUser?: number;
  shadowStats?: ShadowStats;
}

export interface ShadowReport {
  id: string;
  npi: string;
  allowed: boolean;
  rating: number;
  timestamp: string;
  ipHash?: string;
}


