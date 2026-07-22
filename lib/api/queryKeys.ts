/**
 * Centralised React Query keys. Use factory functions so keys stay
 * consistent across queries, mutations, and cache invalidations.
 */
export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  students: {
    all: () => ["students"] as const,
    detail: (id: string) => ["students", id] as const,
    datHistory: (id: string) => ["students", id, "dat-history"] as const,
    strengthHistory: (id: string) => ["students", id, "strength-history"] as const,
    strengthPercentile: (id: string) => ["students", id, "strength-percentile"] as const,
    notes: (id: string) => ["students", id, "notes"] as const,
    dexterity: (id: string) => ["students", id, "dexterity"] as const,
  },
  mentors: {
    all: () => ["mentors"] as const,
    detail: (id: string) => ["mentors", id] as const,
  },
  leads: {
    all: () => ["leads"] as const,
    detail: (id: string) => ["leads", id] as const,
  },
  setters: {
    all: () => ["setters"] as const,
    profile: () => ["setters", "profile"] as const,
  },
  dentists: {
    search: (params: Record<string, unknown>) => ["dentists", "search", params] as const,
  },
  notifications: {
    all: (unreadOnly?: boolean) => ["notifications", { unreadOnly }] as const,
    broadcasts: () => ["notifications", "broadcasts"] as const,
  },
  admin: {
    users: () => ["admin", "users"] as const,
    invitations: () => ["admin", "invitations"] as const,
    analytics: () => ["admin", "analytics"] as const,
  },
  lor: {
    requests: (status?: string, search?: string) => ["lor", "requests", { status, search }] as const,
    config: () => ["lor", "config"] as const,
  },
  meetings: {
    all: () => ["meetings"] as const,
    detail: (id: string) => ["meetings", id] as const,
    calendar: (start?: string, end?: string) => ["meetings", "calendar", { start, end }] as const,
  },
  staffTasks: {
    all: () => ["staffTasks"] as const,
    detail: (id: string) => ["staffTasks", id] as const,
  },
  workflows: {
    all: () => ["workflows"] as const,
  },
  surveys: {
    all: () => ["surveys"] as const,
    responses: () => ["surveys", "responses"] as const,
  },
  popups: {
    all: () => ["popups"] as const,
  },
  badges: {
    all: () => ["badges", "all"] as const,
  },
  resources: {
    all: () => ["resources"] as const,
  },
  experiences: {
    all: (studentId?: string) => ["experiences", { studentId }] as const,
    detail: (id: string) => ["experiences", id] as const,
  },
  documents: {
    all: (studentId?: string) => ["documents", { studentId }] as const,
    detail: (id: string) => ["documents", id] as const,
  },
  actionItems: {
    all: (studentId?: string) => ["actionItems", { studentId }] as const,
    detail: (id: string) => ["actionItems", id] as const,
  },
  optimizationPlans: {
    detail: (studentId?: string) => ["optimizationPlans", { studentId }] as const,
  },
  studentSchools: {
    all: (studentId?: string) => ["studentSchools", { studentId }] as const,
  },
  schoolCategories: {
    all: (studentId?: string) => ["schoolCategories", { studentId }] as const,
  },
  applications: {
    all: (studentId?: string) => ["applications", { studentId }] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
  milestones: {
    all: (studentId?: string) => ["milestones", { studentId }] as const,
  },
  researchCases: {
    all: (filters?: any) => ["researchCases", { filters }] as const,
  },
  courses: {
    all: () => ["courses"] as const,
    detail: (id: string) => ["courses", id] as const,
    submissions: (status?: string) => ["courses", "submissions", { status }] as const,
  },
  messages: {
    conversations: () => ["messages", "conversations"] as const,
  },
} as const;
