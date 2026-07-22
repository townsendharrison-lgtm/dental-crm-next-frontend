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

export enum ReadinessStatus {
  GREEN = "GREEN",
  YELLOW = "YELLOW",
  RED = "RED",
}

export enum ApplicationStatus {
  INTERESTED = "Interested",
  APPLYING = "Applying",
  APPLIED = "Applied",
  INTERVIEWED = "Interviewed",
  ACCEPTED = "Accepted",
  WAITLISTED = "Waitlisted",
  REJECTED = "Rejected",
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
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

export interface PostBacOrMasters {
  enabled: boolean;
  institution: string;
  strengthScore: number;
  degreeType: string;
  year: string;
}

export interface StudentProfile {
  id: string;
  mentor_id?: string | null;
  readiness: "GREEN" | "YELLOW" | "RED";
  last_meeting_date?: string | null;
  next_meeting_date?: string | null;
  last_contact_date?: string | null;
  missing_docs_count: number;
  open_action_items_count: number;
  progress: number;
  zip_code?: string | null;
  strength_score: number;
  gpa?: number | null;
  avg_response_time: number;
  dat_score?: number | null;
  dat_aa?: number | null;
  dat_ts?: number | null;
  is_reapplicant: boolean;
  application_cycle?: string | null;
  status: "Preparing" | "Applying" | "Interviewing";
  state?: string | null;
  country?: string | null;
  ethnicity?: string | null;
  gender?: string | null;
  age?: number | null;
  dat_verified: boolean;
  gpa_verified?: boolean;
  undergrad_institution?: string | null;
  undergrad_degree?: string | null;
  undergrad_grad_year?: string | null;
  post_bac?: PostBacOrMasters | null;
  masters?: PostBacOrMasters | null;
  lor_required: number;
  lor_external_service: boolean;
  timezone?: string | null;
  last_profile_reminder_at?: string | null;
  school_categories?: SchoolCategory[] | null;
  month_colors?: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  profile?: StudentProfile | null;
  applications?: Application[];
  badges?: Array<{ badgeId: string; earnedAt: string }>;
  gpa?: number | null;
  strengthScore?: number;
  readiness?: ReadinessStatus;
  datScore?: number | null;
  datAA?: number | null;
  progress?: number;
  status?: string;
  timezone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  mentorId?: string;
  undergradInstitution?: string | null;
  state?: string | null;
  country?: string | null;
  lastContactDate?: string | null;
  lastMeetingDate?: string;
  nextMeetingDate?: string;
  missingDocsCount?: number;
  openActionItemsCount?: number;
  lorRequired?: number;
  selectedSchools?: School[];
  schoolCategories?: SchoolCategory[];
  monthColors?: Record<string, string>;
  avgResponseTime?: string | number;
  datTS?: number | null;
  zipCode?: string | null;
  isReapplicant?: boolean;
  applicationCycle?: string;
  ethnicity?: string | null;
  gender?: string | null;
  age?: number | null;
  datVerified?: boolean;
  gpaVerified?: boolean;
  undergradDegree?: string | null;
  undergradGradYear?: string | null;
  postBac?: PostBacOrMasters | boolean;
  masters?: PostBacOrMasters | boolean;
  lorExternalService?: boolean;
}

export interface MentorProfile {
  id: string;
  avg_response_time: string | number;
  avg_response_time_value: number;
  compliance_score: number;
  default_availability: string[];
  phone?: string | null;
  school?: string | null;
  graduation_year?: string | null;
  notes?: string | null;
  manager_score: number;
  created_at: string;
  updated_at: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  profile?: MentorProfile | null;
  studentIds?: string[];
  createdAt?: string;
  avgResponseTime?: string | number;
  avgResponseTimeValue?: number;
  complianceScore?: number;
  defaultAvailability?: string[];
  phone?: string | null;
  school?: string | null;
  graduationYear?: string | null;
  notes?: string | null;
  managerScore?: number;
}

export interface StudentAssignment {
  id: string;
  student_id: string;
  mentor_id?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "TRANSFERRED";
  assigned_at: string;
  accepted_at?: string | null;
  transferred_at?: string | null;
  available_times: string[];
  welcome_message?: string | null;
  created_at: string;
  studentId?: string;
  mentorId?: string;
  /** Populated on pending-assignment fetches for mentors */
  student?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role?: string;
  } | null;
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

export interface Conversation {
  id: string;
  name?: string | null;
  participant_ids: string[];
  is_group: boolean;
  created_at: string;
  updated_at: string;
  participants?: AuthUser[];
  lastMessage?: Message | null;
  unreadCount?: number;
  pinned_by?: string[];
  deleted_by?: string[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  read_by: string[];
  created_at: string;
  senderId?: string;
  timestamp?: string;
  receiverId?: string;
}

export type MeetingAudience =
  | "ADMIN_DIRECT"
  | "STUDENT"
  | "MENTORS"
  | "STAFF"
  | "GLOBAL";

export interface Meeting {
  id: string;
  student_id?: string | null;
  mentor_id?: string;
  title: string;
  date: string;
  timezone?: string;
  duration: number;
  summary?: string | null;
  notes?: string | null;
  mentor_notes?: string | null;
  type: "STUDENT_MEETING" | "MANAGER_MEETING" | "GENERAL";
  audience?: MeetingAudience | null;
  link?: string | null;
  completed: boolean;
  attendees?: string[];
  created_at?: string;
  updated_at?: string;
  mentor?: AuthUser | null;
  student?: AuthUser | null;
  resolvedAttendees?: AuthUser[];
  studentId?: string | null;
  mentorId?: string;
  isGlobal?: boolean;
  meetingType?: string;
  mentorActionItems?: string;
  nextMeetingScheduled?: boolean;
  nextMeetingType?: string;
  nextMeetingTimezone?: string;
  followedUpOnActionItems?: boolean;
  actionItemsCreated?: string[];
}

export interface ActionItem {
  id: string;
  student_id?: string;
  meeting_id?: string | null;
  task: string;
  due_date?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  description?: string | null;
  category?: string | null;
  resource_id?: string | null;
  resource_link?: string | null;
  created_at?: string;
  updated_at?: string;
  studentId?: string;
  dueDate?: string;
  resourceId?: string | null;
  resourceLink?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "MEETING" | "TASK_DUE" | "MANAGER_MEETING";
  mentorId?: string;
  studentId?: string;
  status?: string;
}

export interface StaffTask {
  id: string;
  assigned_to?: string;
  assigned_by?: string;
  task: string;
  description?: string | null;
  due_date?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  related_doc_id?: string | null;
  student_id?: string | null;
  created_at?: string;
  updated_at?: string;
  assignedTo?: string;
  assignedBy?: string;
  dueDate?: string;
  studentId?: string | null;
  studentName?: string;
  createdAt?: string;
  assignedToUser?: AuthUser | null;
  assignedByUser?: AuthUser | null;
  studentUser?: AuthUser | null;
}

export type DocumentType = "Transcript" | "Resume" | "Letter of Recommendation" | "Post-Bac Transcript" | "DAT Report" | "Essay" | "Other";

export interface StudentDocument {
  id: string;
  student_id?: string;
  title: string;
  type: DocumentType;
  url: string;
  status: "Pending Review" | "Reviewed" | "Needs Revision" | "Cancelled";
  comment?: string | null;
  private_note?: string | null;
  uploaded_at?: string;
  updated_at?: string;
  downloadUrl?: string | null;
  studentId?: string;
  uploadedAt?: string;
}

export type ExperienceCategory = "Volunteering" | "Research" | "Shadowing" | "Dental Experience" | "Employment" | "Academic";

export interface Experience {
  id: string;
  student_id?: string;
  category: ExperienceCategory;
  title: string;
  organization: string;
  supervisor_name?: string | null;
  supervisor_contact?: string | null;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_ongoing?: boolean;
  dentist_type?: "General" | "Specialty" | null;
  created_at?: string;
  updated_at?: string;
  sessions?: ExperienceSession[];
  studentId?: string;
  supervisorName?: string | null;
  supervisorContact?: string | null;
  startDate?: string;
  endDate?: string | null;
  isOngoing?: boolean;
  dentistType?: "General" | "Specialty" | null;
}

export interface ExperienceSession {
  id: string;
  experience_id?: string;
  date: string;
  duration: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  experienceId?: string;
}

export interface School {
  id: string;
  name: string;
  location: string;
  strength_score_avg?: number;
  dat_avg?: number;
  avg_gpa?: number;
  acceptance_rate?: number | null;
  is_acceptance_rate?: number | null;
  oos_acceptance_rate?: number | null;
  cc_credits?: boolean;
  tuition?: string | null;
  notes?: string | null;
  in_state_enrollment?: number | null;
  out_of_state_enrollment?: number | null;
  male_enrollment?: number | null;
  female_enrollment?: number | null;
  ethnicity?: Record<string, number> | null;
  min_dat_5th?: number | null;
  min_cgpa_5th?: number | null;
  created_at?: string;
  updated_at?: string;
  type?: string;
  strengthScoreAvg?: number;
  datAvg?: number;
  avgGPA?: number;
  acceptanceRate?: number | null;
  isAcceptanceRate?: number | null;
  oosAcceptanceRate?: number | null;
  ccCredits?: boolean;
  inStateEnrollment?: number | null;
  outOfStateEnrollment?: number | null;
  maleEnrollment?: number | null;
  femaleEnrollment?: number | null;
  minDat5th?: number | null;
  minCgpa5th?: number | null;
  /** Program length in years (from sheet “Length of School”) */
  lengthOfSchool?: string | number | null;
  /** Public vs private (hub `type` is used for Reach/Target category) */
  publicPrivate?: string | null;
  /** Accepts Canadian DAT scores */
  acceptsCanadianDat?: boolean | null;
  /** Accepts Canadian applicants */
  acceptsCanadians?: boolean | null;
  /** Link to student_schools row when loaded from API */
  selectionId?: string;
  /** Application / interest status from student_schools */
  selectionStatus?: string;
}

export interface StudentSchool {
  id: string;
  student_id: string;
  school_id: string;
  category: string;
  status: "Interested" | "Applying" | "Applied" | "Interviewed" | "Accepted" | "Waitlisted" | "Rejected";
  applied_date?: string | null;
  interview_date?: string | null;
  decision_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  school?: School;
}



export interface Application {
  id: string;
  student_id?: string;
  school_id?: string;
  status: ApplicationStatus;
  applied_date?: string | null;
  interview_date?: string | null;
  decision_date?: string | null;
  created_at?: string;
  updated_at?: string;
  school?: School;
  notes?: string | null;
  schoolName?: string;
  schoolId?: string;
  studentId?: string;
  appliedDate?: string | null;
  interviewDate?: string | null;
  decisionDate?: string | null;
}

export interface SurveyQuestion {
  id: string;
  type: "TEXT" | "MULTIPLE_CHOICE" | "RATING";
  questionText?: string;
  options?: string[];
  required?: boolean;
  question?: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string | null;
  questions: SurveyQuestion[];
  target_role?: "STUDENT" | "MENTOR" | "BOTH";
  is_active?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  targetRole?: "STUDENT" | "MENTOR" | "BOTH";
  status?: string;
  createdAt?: string;
  createdBy?: string | null;
  response_count?: number;
  responseCount?: number;
  last_response_at?: string | null;
  lastResponseAt?: string | null;
  has_responded?: boolean;
  hasResponded?: boolean;
}

export interface SurveyResponse {
  id: string;
  survey_id?: string;
  user_id?: string;
  answers: Array<{ questionId: string; answerText: string }> | Record<string, any>;
  submitted_at?: string;
  surveyId?: string;
  userId?: string;
  submittedAt?: string;
  user?: { id?: string; name?: string; email?: string; role?: string } | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  benchmark_type: "PROGRESS" | "STRENGTH_SCORE" | "DAT" | "TASKS_COMPLETED" | "MEETINGS_ATTENDED";
  benchmark_value: number;
  created_at: string;
  updated_at: string;
  benchmarkType?: "PROGRESS" | "STRENGTH_SCORE" | "DAT" | "TASKS_COMPLETED" | "MEETINGS_ATTENDED";
  benchmarkValue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface WorkflowStep {
  id: string;
  type: "SEND_MESSAGE";
  delayHours: number;
  messageTemplate: string;
  isFollowUp?: boolean;
  followUpAfterHours?: number;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: "FIRST_ACCEPTANCE" | "APPLICATION_SUBMITTED" | "INTERVIEW_RECEIVED";
  steps: WorkflowStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendingWorkflowAction {
  id: string;
  workflow_id: string;
  step_id: string;
  student_id: string;
  trigger_data: any;
  scheduled_for: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  workflow?: Workflow;
}

export interface PopupAdvertisement {
  id: string;
  title: string;
  message: string;
  image_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  target_role?: "STUDENT" | "MENTOR" | "ADMIN" | "MENTOR_MANAGER" | "BOTH";
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  created_by?: string | null;
  dismissed_by?: string[];
  created_at?: string;
  updated_at?: string;
  /** camelCase aliases (normalized by API client) */
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  targetRole?: "STUDENT" | "MENTOR" | "ADMIN" | "MENTOR_MANAGER" | "BOTH";
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  createdBy?: string | null;
  dismissedBy?: string[];
  createdAt?: string;
}

export interface KPIAssessment {
  academics?: "Strong" | "Moderate" | "Developing" | "Weak";
  experienceDepth?: "Strong" | "Moderate" | "Developing" | "Weak";
  leadership?: "Strong" | "Moderate" | "Developing" | "Weak";
  shadowing?: "Strong" | "Moderate" | "Developing" | "Weak";
  volunteering?: "Strong" | "Moderate" | "Developing" | "Weak";
  research?: "Strong" | "Moderate" | "Developing" | "Weak";
  personalStatement?: "Strong" | "Moderate" | "Developing" | "Weak";
  recommendations?: "Strong" | "Moderate" | "Developing" | "Weak";
}

export interface RoadmapPhases {
  phase1?: string[];
  phase2?: string[];
  phase3?: string[];
  phase4?: string[];
}

export interface RiskFactor {
  factor: string;
  severity: "High" | "Medium" | "Low";
  description: string;
  mitigation: string;
}

export interface LeverageAction {
  title: string;
  description: string;
  impact: "High" | "Moderate" | "Lower";
}

export interface SubGoal {
  id: string;
  label: string;
  target: number;
  unit: string;
}

export interface CategoryPlan {
  status?: string;
  actionPlan?: string;
  recommended?: string[];
  cta?: string;
  mentorNotes?: string;
  targetGoal?: { value: number; unit: string };
  subGoals?: SubGoal[];
}

export interface ManualDexterityPlan {
  status?: string;
  description?: string;
  recommendations?: string[];
}

export interface OptimizationPlan {
  id: string;
  student_id?: string;
  snapshot?: string;
  overall_score?: number;
  improvement_leverage_score?: number;
  kpis?: KPIAssessment;
  roadmap?: RoadmapPhases;
  risk_factors?: RiskFactor[];
  leverage_actions?: LeverageAction[];
  strengths?: string[];
  gaps?: string[];
  created_at?: string;
  updated_at?: string;
  categories?: Record<string, CategoryPlan>;
  manualDexterity?: ManualDexterityPlan;
  lastUpdated?: string;
  studentId?: string;
  overallScore?: number;
  improvementLeverageScore?: number;
  riskFactors?: RiskFactor[];
  leverageActions?: LeverageAction[];
  expertTips?: string[];
}

export interface AdminSettings {
  id: number;
  platform_name: string;
  support_email: string;
  maintenance_mode: boolean;
  auto_reply_enabled: boolean;
  auto_reply_message?: string | null;
  auto_reply_inactivity_minutes?: number;
  auto_reply_rate_limit_minutes?: number;
  welcome_template_student?: string | null;
  welcome_template_mentor?: string | null;
  accepted_message?: string | null;
  interview_message?: string | null;
  waitlist_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchCase {
  id: string;
  student_name_anonymized: string;
  gpa: number;
  dat_aa: number;
  dat_ts: number;
  major?: string | null;
  undergrad_institution?: string | null;
  shadowing_hours: number;
  volunteering_hours: number;
  research_hours: number;
  accepted_schools: string[];
  rejected_schools: string[];
  matriculated_school?: string | null;
  cycle: string;
  special_circumstances?: string | null;
  notes?: string | null;
  personal_statement_themes?: string[] | null;
  application_url?: string | null;
  created_at: string;
  updated_at: string;
  studentName?: string;
  totalShadowingHours?: number;
  totalVolunteeringHours?: number;
  researchExperience?: string | number;
  personalStatementThemes?: string[] | null;
  createdAt?: string;
  acceptedSchoolIds?: string[];
  datAA?: number;
  datTS?: number;
  applicationUrl?: string | null;
}

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CourseModuleType = "VIDEO" | "WORKSHEET" | "EXAM" | "CERTIFICATE";
export type CourseSubmissionType = "CERTIFICATE" | "WORKSHEET" | "DRAFT" | "EXAM";
export type CourseSubmissionStatus = "PENDING" | "APPROVED" | "NEEDS_REVISION" | "REJECTED";

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  type: CourseModuleType;
  content_url?: string | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  courseId?: string;
  contentUrl?: string | null;
  sortOrder?: number;
  isRequired?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: CourseStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  sortOrder?: number;
  modules?: CourseModule[];
}

export interface CourseSubmission {
  id: string;
  course_id: string;
  module_id?: string | null;
  student_id: string;
  type: CourseSubmissionType;
  title?: string | null;
  file_url?: string | null;
  notes?: string | null;
  status: CourseSubmissionStatus;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  courseId?: string;
  moduleId?: string | null;
  studentId?: string;
  fileUrl?: string | null;
  reviewerNotes?: string | null;
  reviewedAt?: string | null;
  student?: { id: string; name?: string; email?: string; avatar?: string } | null;
  course?: { id: string; title?: string } | null;
  module?: { id: string; title?: string; type?: string } | null;
}

export interface ManualDexterity {
  id: string;
  studentId: string;
  activity: string;
  description: string;
  startDate: string;
  endDate?: string;
  isOngoing: boolean;
}

export interface StudentNote {
  id: string;
  studentId: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: Array<'Risk' | 'Strength' | 'Academic' | 'Interview'>;
  timestamp: string;
  editHistory?: Array<{ content: string; timestamp: string }>;
}

export interface SchoolSelectionProfile {
  id: string;
  name: string;
  notes: string;
  documents: Array<{ name: string; url: string; type: string }>;
  analysis?: {
    snapshot: string;
    overallScore: number;
    improvementLeverageScore: number;
    kpis: {
      academics: 'Strong' | 'Moderate' | 'Developing' | 'Weak';
      experienceDepth: 'Strong' | 'Moderate' | 'Developing' | 'Weak';
      leadership: 'Strong' | 'Moderate' | 'Developing' | 'Weak';
      shadowing: 'Strong' | 'Moderate' | 'Developing' | 'Weak';
    };
    roadmap: {
      phase1: string[];
      phase2: string[];
      phase3: string[];
      phase4: string[];
    };
    riskFactors: Array<{
      factor: string;
      severity: 'High' | 'Medium' | 'Low';
      description: string;
      mitigation: string;
    }>;
    leverageActions: Array<{
      title: string;
      description: string;
      impact: 'High' | 'Moderate' | 'Lower';
    }>;
    strengths: string[];
    gaps: string[];
    schoolList: Array<{ name: string; type: 'Reach' | 'Target' | 'Safety'; reason: string }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  estimatedTime?: string;
  estimated_time?: string;
  category: string;
  icon: string;
  sortOrder?: number;
  sort_order?: number;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface PlatformConfig {
  acceptedMessage: string;
  interviewMessage: string;
  waitlistMessage: string;
}

export interface AutoReplySettings {
  enabled: boolean;
  inactivityThresholdMinutes: number;
  template: string;
  rateLimitMinutes: number;
}

export interface SystemNotification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  related_id?: string | null;
  is_read?: boolean;
  created_at?: string;
  created_by?: string | null;
  targetRole?: "STUDENT" | "MENTOR" | "BOTH";
  target_role?: "STUDENT" | "MENTOR" | "BOTH";
  createdAt?: string;
  createdBy?: string | null;
  isReadBy?: string[];
}

export interface SchoolCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ImprovementGoal {
  id: string;
  studentId: string;
  category: string;
  goal: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string;
}

export interface Milestone {
  id: string;
  studentId: string;
  title: string;
  month: string;
  isCustom: boolean;
  status: string;
  sortOrder?: number;
}

export interface MentorReminder {
  id: string;
  studentId: string;
  message: string;
}



