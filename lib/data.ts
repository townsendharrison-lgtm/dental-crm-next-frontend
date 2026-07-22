
import { Student, Mentor, SetterUser, ReadinessStatus, ActionItem, Resource, Message, Badge, Experience, ManualDexterity, StudentDocument, StudentNote, School, LetterOfRecommendationRequest, LOREmailConfig, Meeting, StaffTask, Survey, SystemNotification, SurveyResponse, OptimizationPlan, StudentAssignment, AutoReplySettings, ApplicationStatus, PlatformConfig, Lead, LeadEmailTemplate, SchoolSelectionProfile, ResearchCase } from './types';

export const MOCK_SCHOOL_SELECTIONS: SchoolSelectionProfile[] = [
  {
    id: 'ss-1',
    name: 'Alex Rivera',
    notes: 'GPA: 3.8, DAT: 24. Interested in research-heavy schools on the East Coast.',
    documents: [
      { name: 'Alex_Rivera_Transcript.pdf', url: '#', type: 'application/pdf' },
      { name: 'Alex_Rivera_Resume.pdf', url: '#', type: 'application/pdf' }
    ],
    analysis: {
      snapshot: "Alex is a highly competitive applicant with a stellar DAT score and strong GPA, making them a prime candidate for top-tier research institutions.",
      overallScore: 72,
      improvementLeverageScore: 85,
      kpis: {
        academics: 'Strong',
        experienceDepth: 'Developing',
        leadership: 'Moderate',
        shadowing: 'Strong'
      },
      roadmap: {
        phase1: ["Secure 20+ Shadowing Hours", "Finalize Personal Statement Draft", "Register for DAT Accelerator"],
        phase2: ["Complete Manual Dexterity Cert", "Submit AADSAS Application", "Prepare for Mock Interviews"],
        phase3: ["Secondary Application Completion", "Interview Preparation Workshops"],
        phase4: ["Final School Selection", "Deposit Submission"]
      },
      riskFactors: [
        {
          factor: "Clinical Exposure Depth",
          severity: "Medium",
          description: "While shadowing hours are good, they lack diversity in specialty exposure.",
          mitigation: "Aim for 15-20 hours with a specialist (Orthodontist or Oral Surgeon)."
        },
        {
          factor: "Manual Dexterity Evidence",
          severity: "Low",
          description: "Current evidence is primarily academic; lacks outside-the-classroom proof.",
          mitigation: "Document pottery or instrument playing more explicitly in the resume."
        }
      ],
      leverageActions: [
        {
          title: "DAT Score Maximization",
          description: "Your 24 AA is a massive leverage point. Highlight this in your primary application.",
          impact: "High"
        },
        {
          title: "Research Narrative",
          description: "Connect your 2 years of research to clinical curiosity in your personal statement.",
          impact: "High"
        },
        {
          title: "Early Submission",
          description: "Submit by June 15th to maximize rolling admissions advantage.",
          impact: "Moderate"
        }
      ],
      strengths: [
        "Exceptional DAT score (24) well above national averages",
        "Strong academic foundation with a 3.8 GPA",
        "Clear research interest and background"
      ],
      gaps: [
        "Needs more diverse clinical shadowing hours",
        "Personal statement could more explicitly link research to clinical goals",
        "Manual dexterity evidence is currently anecdotal"
      ],
      schoolList: [
        { name: "Harvard School of Dental Medicine", type: "Reach", reason: "Premier research institution matching applicant's high stats and interests." },
        { name: "Columbia University College of Dental Medicine", type: "Reach", reason: "Strong academic focus and Ivy League prestige." },
        { name: "University of Pennsylvania", type: "Target", reason: "Excellent balance of research and clinical excellence." },
        { name: "Boston University", type: "Target", reason: "Diverse patient population and strong clinical training." },
        { name: "Tufts University", type: "Safety", reason: "Large class size and strong reputation, highly likely acceptance given stats." }
      ]
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  }
];

export const MOCK_RESEARCH_CASES: ResearchCase[] = [
  {
    id: 'rc-1',
    student_name_anonymized: 'Alex Rivera',
    application_url: '#',
    accepted_schools: ['sch2', 'sch3'],
    rejected_schools: [],
    gpa: 3.8,
    dat_aa: 24,
    dat_ts: 23,
    shadowing_hours: 150,
    volunteering_hours: 200,
    research_hours: 150,
    personal_statement_themes: ['Research curiosity', 'Clinical service'],
    notes: 'Very strong candidate, research focus was key for UPenn.',
    cycle: '2024-2025',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'rc-2',
    student_name_anonymized: 'Jordan Smith',
    application_url: '#',
    accepted_schools: ['sch4', 'sch5'],
    rejected_schools: [],
    gpa: 3.6,
    dat_aa: 21,
    dat_ts: 20,
    shadowing_hours: 100,
    volunteering_hours: 300,
    research_hours: 0,
    personal_statement_themes: ['Community service', 'Patient empathy'],
    notes: 'Strong volunteering background made them a great fit for NYU.',
    cycle: '2024-2025',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const MOCK_PLATFORM_CONFIG: PlatformConfig = {
  acceptedMessage: "Congratulations! Your hard work has paid off. You're going to be a dentist!",
  interviewMessage: "Great job! An interview is a huge milestone. You've got this!",
  waitlistMessage: "You're still in the running! A waitlist is a 'not yet', not a 'no'. Stay positive!",
};

export const MOCK_AUTO_REPLY_SETTINGS: AutoReplySettings = {
  enabled: true,
  inactivityThresholdMinutes: 120,
  template: "Hi! I've received your message. I'm currently away but will get back to you personally as soon as I can. Thanks for your patience!",
  rateLimitMinutes: 1440, // 24 hours
};

export const MOCK_BADGES: Badge[] = [
  { id: 'b1', name: 'High Achiever', description: 'Maintain a Strength Score above 90', icon: 'Award', color: 'bg-amber-400/10 text-amber-400', benchmark_type: 'STRENGTH_SCORE', benchmark_value: 90, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'b2', name: 'DAT Master', description: 'Score 22 or higher on the DAT', icon: 'Zap', color: 'bg-indigo-400/10 text-indigo-400', benchmark_type: 'DAT', benchmark_value: 22, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'b3', name: 'Momentum Builder', description: 'Reach 50% application progress', icon: 'Rocket', color: 'bg-emerald-400/10 text-emerald-400', benchmark_type: 'PROGRESS', benchmark_value: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'b4', name: 'Task Crusher', description: 'Complete 10 action items', icon: 'CheckCircle', color: 'bg-rose-400/10 text-rose-400', benchmark_type: 'TASKS_COMPLETED', benchmark_value: 10, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const MOCK_RESOURCES: Resource[] = [
  { id: 'r1', title: 'Find a Dentist', url: 'https://www.ada.org/find-a-dentist', estimatedTime: '5m', category: 'Outreach', icon: 'Search' },
  { id: 'r2', title: 'DAT Accelerator', url: 'https://dataccelerator.com', estimatedTime: 'Ongoing', category: 'Study', icon: 'Zap' },
  { id: 'r3', title: 'Mentor Assistant', url: '#', estimatedTime: '10m', category: 'Support', icon: 'MessageCircle' },
  { id: 'r4', title: 'Personal Statement Help', url: '#', estimatedTime: '30m', category: 'Writing', icon: 'FileText' },
  { id: 'r5', title: 'Letter Vault', url: '#', estimatedTime: '15m', category: 'Documents', icon: 'Shield' },
  { id: 'r6', title: 'Casper Hub', url: '#', estimatedTime: '20m', category: 'Testing', icon: 'Target' },
  { id: 'r7', title: 'Interview Hub', url: '#', estimatedTime: '45m', category: 'Interview', icon: 'Users' },
  { id: 'r8', title: 'Competitive Alignment Index', url: '#', estimatedTime: '10m', category: 'Analytics', icon: 'BarChart' },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg1',
    conversation_id: 'conv1',
    sender_id: 's1',
    text: "Hey Dr. Watson, I just uploaded my updated personal statement. Can you take a look?",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
    is_read: false,
    read_by: []
  }
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    role: 'STUDENT',
    createdAt: '2023-09-01T00:00:00Z',
    mentorId: 'm1',
    readiness: ReadinessStatus.GREEN,
    lastMeetingDate: '2023-10-25',
    nextMeetingDate: '2023-11-05',
    missingDocsCount: 0,
    openActionItemsCount: 2,
    progress: 85,
    zipCode: '90210',
    timezone: 'America/Los_Angeles',
    strengthScore: 92,
    gpa: 3.92,
    avgResponseTime: 1.5,
    datScore: 23,
    datAA: 23,
    datTS: 22,
    isReapplicant: false,
    avatar: 'https://picsum.photos/seed/sarah/100/100',
    badges: [
      { badgeId: 'b1', earnedAt: '2023-10-01' },
      { badgeId: 'b2', earnedAt: '2023-10-15' },
      { badgeId: 'b3', earnedAt: '2023-10-20' }
    ],
    applicationCycle: '2024-2025',
    status: 'Applying',
    state: 'California',
    country: 'USA',
    ethnicity: 'Caucasian',
    gender: 'Female',
    age: 22,
    datVerified: true,
    undergradInstitution: 'UCLA',
    undergradDegree: 'B.S. Biology',
    undergradGradYear: '2023',
    postBac: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    masters: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    lorRequired: 4,
    lorExternalService: false,
    lastContactDate: '2026-03-10',
    applications: [
      { id: 'app1', studentId: 's1', schoolId: 'sch1', schoolName: 'Harvard School of Dental Medicine', appliedDate: '2025-06-15', interviewDate: '2025-09-20', status: ApplicationStatus.ACCEPTED, decisionDate: '2025-12-01' },
      { id: 'app2', studentId: 's1', schoolId: 'sch2', schoolName: 'UPenn School of Dental Medicine', appliedDate: '2025-06-16', interviewDate: '2025-10-05', status: ApplicationStatus.ACCEPTED, decisionDate: '2025-12-15' },
      { id: 'app3', studentId: 's1', schoolId: 'sch3', schoolName: 'UCLA School of Dentistry', appliedDate: '2025-06-20', status: ApplicationStatus.APPLIED }
    ]
  },
  {
    id: 's_unassigned',
    name: 'Test Unassigned Student',
    email: 'test.unassigned@example.com',
    role: 'STUDENT',
    createdAt: new Date().toISOString(),
    mentorId: undefined,
    readiness: ReadinessStatus.GREEN,
    lastMeetingDate: '',
    nextMeetingDate: '',
    missingDocsCount: 1,
    openActionItemsCount: 0,
    progress: 10,
    zipCode: '10001',
    timezone: 'America/New_York',
    strengthScore: 75,
    gpa: 3.5,
    avgResponseTime: 0,
    datScore: 20,
    datAA: 20,
    datTS: 20,
    isReapplicant: false,
    avatar: 'https://picsum.photos/seed/unassigned/100/100',
    badges: [],
    applicationCycle: '2024-2025',
    status: 'Preparing',
    state: 'New York',
    country: 'USA',
    ethnicity: 'Other',
    gender: 'Male',
    age: 23,
    datVerified: false,
    undergradInstitution: 'NYU',
    undergradDegree: 'B.S. Chemistry',
    undergradGradYear: '2024',
    postBac: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    masters: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    lorRequired: 3,
    lorExternalService: false,
    lastContactDate: '',
    applications: []
  },
  {
    id: 's2',
    name: 'Marcus Thorne',
    email: 'm.thorne@example.com',
    role: 'STUDENT',
    createdAt: '2023-10-01T00:00:00Z',
    mentorId: 'm1',
    readiness: ReadinessStatus.YELLOW,
    lastMeetingDate: '2023-10-15',
    lastContactDate: '2023-10-20',
    missingDocsCount: 2,
    openActionItemsCount: 5,
    progress: 40,
    zipCode: '10001',
    timezone: 'America/New_York',
    strengthScore: 78,
    gpa: 3.45,
    avgResponseTime: 4.2,
    datScore: 19,
    datAA: 19,
    datTS: 18,
    isReapplicant: true,
    avatar: 'https://picsum.photos/seed/marcus/100/100',
    badges: [],
    applicationCycle: '2024-2025',
    status: 'Preparing',
    state: 'New York',
    country: 'USA',
    ethnicity: 'African American',
    gender: 'Male',
    age: 24,
    datVerified: true,
    undergradInstitution: 'NYU',
    undergradDegree: 'B.A. Chemistry',
    undergradGradYear: '2021',
    postBac: { enabled: true, institution: 'Columbia', strengthScore: 3.8, degreeType: 'Post-Bac Certificate', year: '2022' },
    masters: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    lorRequired: 3,
    lorExternalService: true,
    applications: [
      { id: 'app4', studentId: 's2', schoolId: 'sch4', schoolName: 'NYU College of Dentistry', appliedDate: '2025-07-01', interviewDate: '2025-11-10', status: ApplicationStatus.INTERVIEWED }
    ]
  },
  {
    id: 's3',
    name: 'Elena Rodriguez',
    email: 'elena.r@example.com',
    role: 'STUDENT',
    createdAt: '2023-08-15T00:00:00Z',
    mentorId: 'm2',
    readiness: ReadinessStatus.RED,
    lastMeetingDate: '2023-09-30',
    lastContactDate: '2023-10-05',
    missingDocsCount: 4,
    openActionItemsCount: 8,
    progress: 15,
    zipCode: '33101',
    strengthScore: 45,
    gpa: 2.85,
    avgResponseTime: 12,
    datScore: 17,
    datAA: 17,
    datTS: 16,
    isReapplicant: false,
    avatar: 'https://picsum.photos/seed/elena/100/100',
    badges: [],
    applicationCycle: '2025-2026',
    status: 'Preparing',
    state: 'Florida',
    country: 'USA',
    ethnicity: 'Hispanic',
    gender: 'Female',
    age: 21,
    datVerified: false,
    undergradInstitution: 'University of Miami',
    undergradDegree: 'B.S. Psychology',
    undergradGradYear: '2024',
    postBac: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    masters: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    lorRequired: 4,
    lorExternalService: false,
  },
  {
    id: 's4',
    name: 'David Kim',
    email: 'david.k@example.com',
    role: 'STUDENT',
    createdAt: '2024-01-10T00:00:00Z',
    mentorId: 'm2',
    readiness: ReadinessStatus.YELLOW,
    lastMeetingDate: '2026-02-15',
    lastContactDate: '2026-03-01',
    missingDocsCount: 1,
    openActionItemsCount: 0,
    progress: 5,
    zipCode: '98101',
    timezone: 'America/Los_Angeles',
    strengthScore: 68,
    gpa: 3.2,
    avgResponseTime: 2.5,
    datScore: 20,
    datAA: 20,
    datTS: 19,
    isReapplicant: false,
    avatar: 'https://picsum.photos/seed/david/100/100',
    badges: [],
    applicationCycle: '2025-2026',
    status: 'Preparing',
    state: 'Washington',
    country: 'USA',
    ethnicity: 'Asian',
    gender: 'Male',
    age: 22,
    datVerified: false,
    undergradInstitution: 'University of Washington',
    undergradDegree: 'B.S. Biochemistry',
    undergradGradYear: '2024',
    postBac: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    masters: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    lorRequired: 3,
    lorExternalService: false,
  },
  {
    id: 's5',
    name: 'James Wilson',
    email: 'j.wilson@example.com',
    role: 'STUDENT',
    createdAt: '2023-11-15T00:00:00Z',
    mentorId: 'm1',
    readiness: ReadinessStatus.GREEN,
    lastMeetingDate: '2026-03-01',
    lastContactDate: '2026-03-15',
    missingDocsCount: 0,
    openActionItemsCount: 1,
    progress: 90,
    zipCode: '60601',
    strengthScore: 88,
    gpa: 3.75,
    avgResponseTime: 1.2,
    datScore: 22,
    datAA: 22,
    datTS: 21,
    isReapplicant: false,
    avatar: 'https://picsum.photos/seed/james/100/100',
    badges: [],
    applicationCycle: '2024-2025',
    status: 'Interviewing',
    state: 'Illinois',
    country: 'USA',
    ethnicity: 'Caucasian',
    gender: 'Male',
    age: 23,
    datVerified: true,
    undergradInstitution: 'Northwestern',
    undergradDegree: 'B.S. Biology',
    undergradGradYear: '2023',
    postBac: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    masters: { enabled: false, institution: '', strengthScore: 0, degreeType: '', year: '' },
    lorRequired: 4,
    lorExternalService: false,
    applications: [
      { id: 'app5', studentId: 's5', schoolId: 'sch1', schoolName: 'Harvard School of Dental Medicine', appliedDate: '2025-06-01', interviewDate: '2025-09-10', status: ApplicationStatus.INTERVIEWED },
      { id: 'app6', studentId: 's5', schoolId: 'sch3', schoolName: 'UCLA School of Dentistry', appliedDate: '2025-06-05', interviewDate: '2025-10-15', status: ApplicationStatus.ACCEPTED, decisionDate: '2025-12-05' }
    ]
  }
];

export const MOCK_MENTORS: Mentor[] = [
  {
    id: 'm1',
    name: 'Dr. Emily Watson',
    email: 'emily.w@dentalschoolguide.com',
    role: 'MENTOR',
    createdAt: '2023-01-01T00:00:00Z',
    studentIds: ['s1', 's2', 's5'],
    avgResponseTime: '3.5h',
    avgResponseTimeValue: 3.5,
    complianceScore: 98,
    avatar: 'https://picsum.photos/seed/emily/100/100',
    defaultAvailability: ['Mondays 4-6pm', 'Tuesdays 10am-12pm', 'Thursdays 2-4pm'],
    phone: '(555) 123-4567',
    school: 'Harvard School of Dental Medicine',
    graduationYear: '2018',
    notes: 'Exceptional mentor with high engagement. Specializes in clinical application prep.'
  },
  {
    id: 'm2',
    name: 'Dr. Alex Rivera',
    email: 'alex.r@dentalschoolguide.com',
    role: 'MENTOR',
    createdAt: '2023-01-01T00:00:00Z',
    studentIds: ['s3', 's4'],
    avgResponseTime: '22h',
    avgResponseTimeValue: 22,
    complianceScore: 65,
    avatar: 'https://picsum.photos/seed/alex/100/100',
    defaultAvailability: ['Wednesdays 9-11am', 'Fridays 3-5pm'],
    phone: '(555) 987-6543',
    school: 'UCLA School of Dentistry',
    graduationYear: '2020',
    notes: 'Currently balancing a heavy clinical load. Needs support with response times.'
  },
  {
    id: 'admin1',
    name: 'Dental School Guide Admin',
    email: 'admin@dentalschoolguide.com',
    role: 'ADMIN',
    createdAt: '2023-01-01T00:00:00Z',
    studentIds: [],
    avgResponseTime: 'Instant',
    avgResponseTimeValue: 0,
    complianceScore: 100,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    defaultAvailability: []
  }
];

export const MOCK_STUDENT_ASSIGNMENTS: StudentAssignment[] = [];

export const MOCK_ACTION_ITEMS: ActionItem[] = [
  { id: 'a1', studentId: 's1', task: 'Finalize Personal Statement Draft', dueDate: '2023-11-01', priority: 'HIGH', status: 'PENDING', resourceId: 'r1', category: 'Writing' },
  { id: 'a2', studentId: 's2', task: 'Book DAT Retake', dueDate: '2023-10-28', priority: 'HIGH', status: 'OVERDUE', category: 'Testing' },
  { id: 'a3', studentId: 's1', task: 'Review Shadowing Hours', dueDate: '2023-11-10', priority: 'MEDIUM', status: 'PENDING', category: 'Shadowing' },
];

export const MOCK_EXPERIENCES: Experience[] = [
  {
    id: 'e1',
    studentId: 's1',
    category: 'Shadowing',
    title: 'General Dentistry Shadowing',
    organization: 'Smile Dental Clinic',
    supervisorName: 'Dr. Sarah Smith',
    supervisorContact: 'sarah.smith@email.com',
    description: 'Shadowed general dentistry procedures including fillings, crowns, and root canals.',
    startDate: '2023-06-01',
    isOngoing: true,
    dentistType: 'General',
    sessions: [
      { id: 'sess1', date: '2023-06-05', duration: 4 },
      { id: 'sess2', date: '2023-06-12', duration: 4 },
      { id: 'sess3', date: '2023-06-19', duration: 4 },
      { id: 'sess4', date: '2023-06-26', duration: 4 },
    ]
  },
  {
    id: 'e2',
    studentId: 's1',
    category: 'Volunteering',
    title: 'Community Health Volunteer',
    organization: 'Local Free Clinic',
    supervisorName: 'John Doe',
    supervisorContact: 'john.doe@clinic.org',
    description: 'Assisted with patient intake and basic health screenings.',
    startDate: '2023-01-15',
    endDate: '2023-12-20',
    isOngoing: false,
    sessions: [
      { id: 'sess5', date: '2023-01-20', duration: 3 },
      { id: 'sess6', date: '2023-02-17', duration: 3 },
      { id: 'sess7', date: '2023-03-24', duration: 3 },
    ]
  },
  {
    id: 'e3',
    studentId: 's1',
    category: 'Shadowing',
    title: 'Orthodontics Shadowing',
    organization: 'Straight Smiles Ortho',
    supervisorName: 'Dr. Kevin Lee',
    supervisorContact: 'kevin.lee@ortho.com',
    description: 'Shadowed orthodontic consultations and adjustment appointments.',
    startDate: '2023-08-01',
    isOngoing: false,
    dentistType: 'Specialty',
    sessions: [
      { id: 'sess8', date: '2023-08-05', duration: 4 },
      { id: 'sess9', date: '2023-08-12', duration: 4 },
    ]
  },
  {
    id: 'e4',
    studentId: 's1',
    category: 'Dental Experience',
    title: 'Dental Assistant',
    organization: 'City Dental',
    supervisorName: 'Dr. Mike Ross',
    supervisorContact: 'mike@citydental.com',
    description: 'Assisted in chairside procedures and sterilized equipment.',
    startDate: '2023-05-01',
    isOngoing: true,
    sessions: [
      { id: 'sess10', date: '2023-05-10', duration: 8 },
      { id: 'sess11', date: '2023-05-17', duration: 8 },
    ]
  },
  {
    id: 'e5',
    studentId: 's1',
    category: 'Academic',
    title: 'Summer Dental Prep Program',
    organization: 'State University',
    supervisorName: 'Prof. Miller',
    supervisorContact: 'miller@stateu.edu',
    description: 'Intensive summer program covering dental school prerequisites.',
    startDate: '2023-07-01',
    endDate: '2023-07-31',
    isOngoing: false,
    sessions: [
      { id: 'sess12', date: '2023-07-05', duration: 40 },
    ]
  }
];

export const SCHOOL_DATABASE: School[] = [
  { 
    id: 'sch1', 
    name: 'Harvard School of Dental Medicine', 
    location: 'Boston, MA', 
    type: 'Reach', 
    strengthScoreAvg: 95, 
    datAvg: 24, 
    avgGPA: 3.92,
    acceptanceRate: 3.5,
    isAcceptanceRate: 4.2,
    oosAcceptanceRate: 3.1,
    ccCredits: false,
    tuition: '$68,000' 
  },
  { 
    id: 'sch2', 
    name: 'UPenn School of Dental Medicine', 
    location: 'Philadelphia, PA', 
    type: 'Reach', 
    strengthScoreAvg: 92, 
    datAvg: 23, 
    avgGPA: 3.85,
    acceptanceRate: 5.1,
    isAcceptanceRate: 6.2,
    oosAcceptanceRate: 4.5,
    ccCredits: true,
    tuition: '$72,000' 
  },
  { 
    id: 'sch3', 
    name: 'UCLA School of Dentistry', 
    location: 'Los Angeles, CA', 
    type: 'Target', 
    strengthScoreAvg: 88, 
    datAvg: 22, 
    avgGPA: 3.78,
    acceptanceRate: 4.8,
    isAcceptanceRate: 7.5,
    oosAcceptanceRate: 2.1,
    ccCredits: true,
    tuition: '$55,000' 
  },
  { 
    id: 'sch4', 
    name: 'NYU College of Dentistry', 
    location: 'New York, NY', 
    type: 'Target', 
    strengthScoreAvg: 85, 
    datAvg: 21, 
    avgGPA: 3.65,
    acceptanceRate: 12.4,
    isAcceptanceRate: 15.2,
    oosAcceptanceRate: 10.8,
    ccCredits: true,
    tuition: '$85,000' 
  },
  { 
    id: 'sch5', 
    name: 'Tufts University School of Dental Medicine', 
    location: 'Boston, MA', 
    type: 'Strong Fit', 
    strengthScoreAvg: 82, 
    datAvg: 20, 
    avgGPA: 3.58,
    acceptanceRate: 10.5,
    isAcceptanceRate: 12.1,
    oosAcceptanceRate: 9.2,
    ccCredits: true,
    tuition: '$78,000' 
  },
  { 
    id: 'sch6', 
    name: 'Boston University Henry M. Goldman School', 
    location: 'Boston, MA', 
    type: 'Strong Fit', 
    strengthScoreAvg: 80, 
    datAvg: 20, 
    avgGPA: 3.55,
    acceptanceRate: 11.2,
    isAcceptanceRate: 13.5,
    oosAcceptanceRate: 10.1,
    ccCredits: true,
    tuition: '$82,000' 
  },
  { 
    id: 'sch7', 
    name: 'A.T. Still University of Missouri', 
    location: 'Kirksville, MO', 
    type: 'Target', 
    strengthScoreAvg: 84, 
    datAvg: 19.3, 
    avgGPA: 3.56,
    acceptanceRate: 25.0,
    isAcceptanceRate: 21.0,
    oosAcceptanceRate: 79.0,
    ccCredits: true,
    tuition: '$62,000' 
  },
  { 
    id: 'sch8', 
    name: 'A.T. Still University of Arizona', 
    location: 'Mesa, AZ', 
    type: 'Target', 
    strengthScoreAvg: 86, 
    datAvg: 20.1, 
    avgGPA: 3.62,
    acceptanceRate: 2.68,
    isAcceptanceRate: 3.5,
    oosAcceptanceRate: 2.2,
    ccCredits: true,
    tuition: '$65,000' 
  },
];

export const MOCK_MANUAL_DEXTERITY: ManualDexterity[] = [
  { id: 'md1', studentId: 's1', activity: 'Oil Painting', description: 'Developing fine motor skills through detailed portrait painting.', startDate: '2020-01-01', isOngoing: true },
  { id: 'md2', studentId: 's1', activity: 'Jewelry Making', description: 'Working with small beads and wires to create intricate designs.', startDate: '2021-06-01', endDate: '2022-12-01', isOngoing: false },
];

export const MOCK_DOCUMENTS: StudentDocument[] = [
  { id: 'd1', studentId: 's1', title: 'Official Transcript - UCLA', type: 'Transcript', url: '#', status: 'Reviewed', uploadedAt: '2023-09-15' },
  { id: 'd2', studentId: 's1', title: 'Personal Statement Draft 3', type: 'Essay', url: '#', status: 'Pending Review', uploadedAt: '2023-10-20' },
  { id: 'd3', studentId: 's1', title: 'Dr. Smith LOR', type: 'Letter of Recommendation', url: '#', status: 'Reviewed', uploadedAt: '2023-10-05' },
];

export const MOCK_NOTES: StudentNote[] = [
  { id: 'n1', studentId: 's1', authorId: 'm1', authorName: 'Dr. Emily Watson', content: 'Sarah is an exceptionally strong candidate. Her research experience at UCLA gives her a unique edge.', tags: ['Strength', 'Academic'], timestamp: '2023-10-25T14:30:00Z' },
];

export const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'meet1',
    studentId: 's1',
    mentorId: 'm1',
    title: 'Sarah Jenkins - Strategy Call',
    date: '2026-05-24T14:00:00Z',
    duration: 45,
    completed: false,
    type: 'STUDENT_MEETING'
  },
  {
    id: 'meet2',
    studentId: 's2',
    mentorId: 'm1',
    title: 'Marcus Thorne - DAT Check-in',
    date: '2026-05-25T10:00:00Z',
    duration: 30,
    completed: false,
    type: 'STUDENT_MEETING'
  },
  {
    id: 'meet3',
    mentorId: 'm1',
    title: 'Mentor Training Session',
    date: '2026-05-26T15:00:00Z',
    duration: 60,
    completed: false,
    type: 'MANAGER_MEETING',
    isGlobal: true
  }
];

export const MOCK_LOR_REQUESTS: LetterOfRecommendationRequest[] = [
  {
    id: 'lor1',
    studentId: 's1',
    writerName: 'Dr. Robert Miller',
    writerEmail: 'r.miller@university.edu',
    dueDate: '2026-05-01',
    status: 'REQUESTED',
    requestedAt: '2026-02-15T10:00:00Z',
    accessCode: 'LOR-S1-RM-123'
  },
  {
    id: 'lor2',
    studentId: 's1',
    writerName: 'Prof. Alice Johnson',
    writerEmail: 'a.johnson@college.edu',
    dueDate: '2026-04-15',
    status: 'UPLOADED',
    requestedAt: '2026-01-10T09:00:00Z',
    uploadedAt: '2026-02-20T14:30:00Z',
    documentUrl: '#',
    accessCode: 'LOR-S1-AJ-456'
  }
];

export const MOCK_LOR_EMAIL_CONFIG: LOREmailConfig = {
  id: 'config1',
  design: {
    primaryColor: '#4F46E5',
    logoUrl: 'https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng',
  },
  content: {
    subject: 'Letter of Recommendation Request for {{student_name}}',
    body: 'Dear {{writer_name}},\n\n{{student_name}} has requested a letter of recommendation from you for their dental school application. We would be honored to have your support.',
    requirements: '1. Must be on official letterhead\n2. Must be signed\n3. Must include your name and the date.\n4. Should highlight clinical or academic potential',
    exampleLetter: 'To the Admissions Committee,\n\nI am writing to highly recommend...',
    writerReminderBody: 'Dear {{writer_name}},\n\nThis is a friendly reminder that the letter of recommendation you are writing for {{student_name}} is due on {{due_date}}.\n\nPlease upload your letter using the link below at your earliest convenience.',
    requesterReminderBody: 'Dear {{student_name}},\n\nThis is an update regarding your letter of recommendation request to {{writer_name}}. The letter is due on {{due_date}} and has not yet been uploaded.\n\nYou may want to follow up with your letter writer to ensure timely submission.',
  },
  reminderSchedule: [
    { days: -14, target: 'writer' },
    { days: -7, target: 'writer' },
    { days: -3, target: 'writer' },
    { days: 0, target: 'writer' },
    { days: 3, target: 'writer' },
    { days: 3, target: 'requester' },
    { days: 7, target: 'writer' },
    { days: 7, target: 'requester' },
  ]
};

export const MOCK_STAFF_TASKS: StaffTask[] = [
  {
    id: 'st1',
    assignedTo: 'm1',
    assignedBy: 'admin1',
    task: 'Review Sarah Jenkins Personal Statement',
    description: 'Please provide detailed feedback on the 3rd draft of Sarah\'s personal statement.',
    dueDate: '2026-03-15',
    priority: 'HIGH',
    status: 'PENDING',
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'st2',
    assignedTo: 'mm1',
    assignedBy: 'admin1',
    task: 'Compliance Audit for Q1',
    description: 'Complete the quarterly compliance audit for all mentors in the Western region.',
    dueDate: '2026-03-31',
    priority: 'MEDIUM',
    status: 'PENDING',
    createdAt: '2026-03-01T11:00:00Z'
  }
];

export const MOCK_SURVEYS: Survey[] = [
  {
    id: 'sur1',
    title: 'Mentor Satisfaction Survey Q1',
    description: 'We want to hear about your experience with your mentor so far.',
    targetRole: 'STUDENT',
    status: 'ACTIVE',
    createdAt: '2026-02-15T09:00:00Z',
    createdBy: 'admin1',
    questions: [
      { id: 'q1', type: 'RATING', question: 'How helpful has your mentor been?' },
      { id: 'q2', type: 'TEXT', question: 'What is one thing your mentor could improve?' }
    ]
  },
  {
    id: 'sur2',
    title: 'Platform Feedback',
    description: 'Help us improve the CRM platform.',
    targetRole: 'BOTH',
    status: 'ACTIVE',
    createdAt: '2026-02-20T10:00:00Z',
    createdBy: 'admin1',
    questions: [
      { id: 'q3', type: 'MULTIPLE_CHOICE', question: 'Which feature do you use most?', options: ['Dashboard', 'Inbox', 'Resources', 'Schedule'] },
      { id: 'q4', type: 'RATING', question: 'Rate the platform speed.' }
    ]
  }
];

export const MOCK_SURVEY_RESPONSES: SurveyResponse[] = [
  {
    id: 'res1',
    surveyId: 'sur1',
    userId: 's1',
    answers: { q1: 5, q2: 'Everything is great!' },
    submittedAt: '2026-02-16T14:00:00Z'
  }
];

export const MOCK_SYSTEM_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'sn1',
    title: 'Scheduled Maintenance',
    message: 'The platform will be down for maintenance on Sunday at 2 AM EST.',
    targetRole: 'BOTH',
    type: 'INFO',
    createdAt: '2026-03-01T08:00:00Z',
    createdBy: 'admin1',
    isReadBy: []
  }
];

export const MOCK_OPTIMIZATION_PLANS: OptimizationPlan[] = [
  {
    id: 'op1',
    studentId: 's1',
    overallScore: 72,
    improvementLeverageScore: 85,
    riskFactors: [
      {
        factor: 'Low Shadowing Hours',
        severity: 'High',
        description: 'Current shadowing hours are below the competitive threshold for target schools.',
        mitigation: 'Schedule 20+ additional hours with a general dentist and 10+ with a specialist.'
      },
      {
        factor: 'Limited Leadership',
        severity: 'Medium',
        description: 'Few leadership roles in extracurricular activities.',
        mitigation: 'Apply for a committee chair position in the Pre-Dental Society.'
      }
    ],
    expertTips: [
      "To gain longer shadowing go back to the first dentist you shadowed to look like you have been shadowing the dentist for a really long period of time.",
      "Focus your personal statement on a single, impactful patient interaction rather than a list of achievements.",
      "When shadowing, ask for a copy of the day's schedule to better understand the flow of a clinical day."
    ],
    leverageActions: [
      {
        title: 'Improve DAT Score',
        description: 'A 22+ score would offset the current Strength Score.',
        impact: 'High'
      },
      {
        title: 'Increase Volunteering',
        description: 'Essential for mission-driven schools.',
        impact: 'Moderate'
      },
      {
        title: 'Leadership Role',
        description: 'Good to have, but secondary to academics right now.',
        impact: 'Lower'
      }
    ],
    kpis: {
      academics: 'Strong',
      experienceDepth: 'Developing',
      leadership: 'Weak',
      shadowing: 'Moderate'
    },
    roadmap: {
      phase1: ['Secure 20+ Shadowing Hours', 'Finalize Personal Statement Draft', 'Register for DAT Accelerator'],
      phase2: ['Complete Manual Dexterity Cert', 'Submit AADSAS Application', 'Prepare for Mock Interviews'],
      phase3: ['Secondary Application Completion', 'Interview Preparation Workshops'],
      phase4: ['Final School Selection', 'Acceptance Management']
    },
    categories: {
      volunteering: {
        status: 'Developing',
        actionPlan: 'Focus on consistent monthly engagement with a single non-profit to demonstrate long-term commitment. Aim for 100+ total hours.',
        recommended: ['Community Health Initiative', 'Local Food Bank Coordinator'],
        cta: 'Enroll',
        mentorNotes: 'Student shows high aptitude but needs to articulate the \'why\' behind their volunteering experiences more clearly in interviews.',
        targetGoal: { value: 100, unit: 'Hours' },
        subGoals: [
          { id: 'vg1', label: 'Volunteering Hours', target: 100, unit: 'Hours' },
          { id: 'vg2', label: 'Organizations', target: 2, unit: 'Orgs' }
        ]
      },
      shadowing: {
        status: 'Moderate',
        actionPlan: 'Diversify shadowing experiences by seeking out specialists (Orthodontics, Endodontics) to broaden clinical perspective.',
        recommended: ['Shadowing Log Template', 'Specialist Outreach Guide'],
        cta: 'Open',
        mentorNotes: 'Needs to reach out to at least 2 specialists by end of month.',
        subGoals: [
          { id: 'sg1', label: 'Shadowing Hours', target: 100, unit: 'Hours' },
          { id: 'sg2', label: 'General Dentists', target: 3, unit: 'Dentists' },
          { id: 'sg3', label: 'Specialty Dentists', target: 2, unit: 'Dentists' },
          { id: 'sg4', label: 'Number of Offices', target: 5, unit: 'Offices' }
        ]
      },
      research: {
        status: 'Strong',
        actionPlan: 'Maintain current trajectory. Ensure the PI can provide a strong letter of recommendation highlighting analytical skills.',
        recommended: ['Research Symposium Registration', 'Grant Writing Workshop'],
        cta: 'View',
        mentorNotes: 'Excellent progress here. The publication will be a major asset.',
        targetGoal: { value: 200, unit: 'Hours' },
        subGoals: [
          { id: 'rg1', label: 'Research Hours', target: 200, unit: 'Hours' }
        ]
      },
      academic: {
        status: 'Needs Improvement',
        actionPlan: 'Apply for summer enrichment programs or post-bac workshops to strengthen academic profile and networking.',
        recommended: ['Summer Dental Prep Program', 'DAT Prep Course'],
        cta: 'Enroll',
        mentorNotes: 'This is the weakest area. Must prioritize program applications.',
        targetGoal: { value: 100, unit: 'Hours' },
        subGoals: [
          { id: 'ag1', label: 'Academic Hours', target: 100, unit: 'Hours' },
          { id: 'ag2', label: 'Experiences', target: 2, unit: 'Exp' }
        ]
      },
      dental: {
        status: 'Developing',
        actionPlan: 'Continue clinical work. Focus on patient interaction and understanding practice management software.',
        recommended: ['Clinical Skills Workshop', 'Dental Assistant Certification'],
        cta: 'Open',
        mentorNotes: 'Good hands-on experience. Keep logging those assistant hours.',
        subGoals: [
          { id: 'dg1', label: 'Dental Hours', target: 150, unit: 'Hours' },
          { id: 'dg2', label: 'Experiences', target: 3, unit: 'Exp' }
        ]
      },
      employment: {
        status: 'Strong',
        actionPlan: 'Highlight transferable skills such as leadership, time management, and professional responsibility in personal statement.',
        recommended: ['Resume Optimization Tool', 'LinkedIn Profile Review'],
        cta: 'View',
        mentorNotes: 'Work history is very consistent. Use this to show maturity.'
      }
    },
    manualDexterity: {
      status: 'Developing',
      description: 'Manual dexterity is a critical component of the dental application. Focus on fine motor skill development through hands-on activities.',
      recommendations: ['Simulation Lab Certification', 'Weekly Wax Carving Practice', 'Jewelry Making or Painting']
    },
    lastUpdated: '2026-03-02T16:00:00Z'
  }
];

export const MOCK_POPUP_ADVERTISEMENTS: any[] = [
  {
    id: 'popup-1',
    title: 'Summer Bootcamp 2026',
    message: 'Join our exclusive Summer Bootcamp to supercharge your dental school application! Limited spots available.',
    imageUrl: 'https://picsum.photos/seed/bootcamp/800/400',
    ctaText: 'Learn More',
    ctaUrl: 'https://example.com/bootcamp',
    backgroundColor: '#4f46e5',
    textColor: '#ffffff',
    targetRole: 'STUDENT',
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-06-01T00:00:00Z',
    isActive: true,
    createdAt: '2026-02-15T10:00:00Z',
    createdBy: 'admin1',
    dismissedBy: []
  }
];

export const MOCK_WORKFLOWS: any[] = [
  {
    id: 'wf-1',
    name: 'First Acceptance Celebration',
    trigger: 'FIRST_ACCEPTANCE',
    isActive: true,
    createdAt: '2026-03-01T10:00:00Z',
    steps: [
      {
        id: 'step-1-1',
        type: 'SEND_MESSAGE',
        delayHours: 0,
        messageTemplate: 'CONGRATULATIONS [Mentee Name]!!! I just saw you got accepted to [School]! This is such an incredible achievement. All your hard work has paid off. Let me know when you have a moment to chat about next steps!',
        isFollowUp: false
      }
    ]
  },
  {
    id: 'wf-2',
    name: 'Application Submitted Check-in',
    trigger: 'APPLICATION_SUBMITTED',
    isActive: true,
    createdAt: '2026-03-01T10:00:00Z',
    steps: [
      {
        id: 'step-2-1',
        type: 'SEND_MESSAGE',
        delayHours: 0,
        messageTemplate: 'Great job submitting your application to [School], [Mentee Name]! One more step closer to your goal. I\'ll be keeping an eye out for updates with you!',
        isFollowUp: false
      }
    ]
  }
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'lead1',
    setterId: 'setter1',
    name: 'John Doe',
    phone: '555-0101',
    email: 'john@example.com',
    source: 'Facebook',
    contacted: false,
    showedUp: true,
    isPaid: true,
    createdAt: '2026-03-01T10:00:00Z',
    notes: 'Very interested in mentorship.',
    adminNotes: 'High intent lead, follow up if payment fails.',
    purchasedItems: ['mentorship'],
    purchaseTotal: 1500,
    meetings: [
      {
        id: 'meet-lead1-1',
        leadId: 'lead1',
        type: 'Strategy Session',
        startTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days from now
        status: 'Scheduled',
        emailsSent: []
      }
    ]
  },
  {
    id: 'lead2',
    setterId: 'setter1',
    name: 'Jane Smith',
    phone: '555-0102',
    email: 'jane@example.com',
    source: 'Instagram',
    contacted: false,
    showedUp: false,
    isPaid: false,
    createdAt: '2026-03-05T14:30:00Z',
    notes: 'Did not show up to the call.',
    meetings: []
  },
  ...Array.from({ length: 47 }, (_, i) => ({
    id: `lead-mock-${i + 3}`,
    setterId: 'setter1',
    name: `Test Lead ${i + 3}`,
    phone: `555-0${103 + i}`,
    email: `test${i + 3}@example.com`,
    source: 'Facebook' as const,
    contacted: false,
    showedUp: i % 3 === 0 ? true : (i % 3 === 1 ? false : null),
    isPaid: false,
    createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Mock lead for testing milestones.',
    meetings: []
  })),
  {
    id: 'lead3',
    setterId: 'setter2',
    name: 'Mike Johnson',
    phone: '555-0103',
    email: 'mike@example.com',
    source: 'Other',
    contacted: false,
    showedUp: true,
    isPaid: true,
    createdAt: '2026-03-10T09:15:00Z',
    notes: 'Needs help with school selection.',
    purchasedItems: ['school selection', 'essay editing'],
    purchaseTotal: 800,
    meetings: []
  },
  {
    id: 'lead4',
    setterId: 'setter2',
    name: 'Alice Brown',
    phone: '555-0104',
    email: 'alice@example.com',
    source: 'Facebook',
    contacted: false,
    showedUp: true,
    isPaid: true,
    createdAt: '2026-03-12T11:00:00Z',
    notes: 'Interested in shadowing.',
    purchasedItems: ['virtual shadowing'],
    purchaseTotal: 200,
    meetings: []
  }
];

export const DEFAULT_EMAIL_TEMPLATES: LeadEmailTemplate[] = [
  {
    id: 'strategy-24h-before',
    meetingType: 'Strategy Session',
    triggerType: '24h_before',
    subject: 'Reminder: Your Strategy Session is in 24 hours!',
    body: 'Hi {{lead_name}},\n\nJust a reminder that our Strategy Session is scheduled for tomorrow at {{meeting_time}}.\n\nLooking forward to it!',
    enabled: true,
    sendTimeOffsetHours: -24
  },
  {
    id: 'strategy-1h-before',
    meetingType: 'Strategy Session',
    triggerType: '1h_before',
    subject: 'Starting soon: Your Strategy Session in 1 hour!',
    body: 'Hi {{lead_name}},\n\nOur Strategy Session starts in just one hour at {{meeting_time}}.\n\nSee you soon!',
    enabled: true,
    sendTimeOffsetHours: -1
  },
  {
    id: 'strategy-1d-after',
    meetingType: 'Strategy Session',
    triggerType: '1d_after',
    subject: 'How was our Strategy Session?',
    body: 'Hi {{lead_name}},\n\nIt was great chatting yesterday! I wanted to follow up and see if you had any additional questions.\n\nBest regards!',
    enabled: true,
    sendTimeOffsetHours: 24
  },
  {
    id: 'strategy-3d-after',
    meetingType: 'Strategy Session',
    triggerType: '3d_after',
    subject: 'Next steps from our Strategy Session',
    body: 'Hi {{lead_name}},\n\nJust checking in again to see how you are doing with the next steps we discussed.\n\nLet me know if you need anything!',
    enabled: true,
    sendTimeOffsetHours: 72
  }
];

export const MOCK_SETTERS: SetterUser[] = [
  {
    id: 'setter1',
    name: 'Sam Setter',
    email: 'sam@dsg.com',
    role: 'SETTER',
    createdAt: '2024-01-01T00:00:00Z',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
    weeklyLeadGoal: 100,
    monthlyLeadGoal: 400
  },
  {
    id: 'setter2',
    name: 'Sarah Setter',
    email: 'sarah@dsg.com',
    role: 'SETTER',
    createdAt: '2024-02-01T00:00:00Z',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    weeklyLeadGoal: 150,
    monthlyLeadGoal: 600
  }
];
