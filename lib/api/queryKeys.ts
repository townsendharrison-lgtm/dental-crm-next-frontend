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
  },
  admin: {
    users: () => ["admin", "users"] as const,
    invitations: () => ["admin", "invitations"] as const,
  },
  lor: {
    requests: (status?: string, search?: string) => ["lor", "requests", { status, search }] as const,
    config: () => ["lor", "config"] as const,
  },
} as const;
