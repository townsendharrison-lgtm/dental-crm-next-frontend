import { apiGet, apiPut, apiDelete } from "./client";
import type { SetterUser, UserRole } from "@/lib/types";

/** Raw user shape returned by the backend (snake_case goals). */
interface RawUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  weekly_lead_goal?: number;
  monthly_lead_goal?: number;
}

function mapUser(u: RawUser): SetterUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    weeklyLeadGoal: u.weekly_lead_goal,
    monthlyLeadGoal: u.monthly_lead_goal,
  };
}

export interface SetterGoalInput {
  weeklyLeadGoal?: number;
  monthlyLeadGoal?: number;
}

export const usersApi = {
  /** Admin / Mentor Manager: list all setters. */
  listSetters: async (): Promise<SetterUser[]> => {
    const users = await apiGet<RawUser[]>("/api/users/role/SETTER");
    return (users ?? []).map(mapUser);
  },

  /** Current user's profile (used by SETTER to see their own goals). */
  profile: async (): Promise<SetterUser> => {
    const user = await apiGet<RawUser>("/api/users/profile");
    return mapUser(user);
  },

  /** Update a setter's lead goals. Admins edit any setter; others edit self. */
  updateGoal: async (
    setterId: string,
    updates: SetterGoalInput,
    isAdmin: boolean,
  ): Promise<void> => {
    const endpoint = isAdmin ? `/api/admin/users/${setterId}` : "/api/users/profile";
    await apiPut(endpoint, updates);
  },

  /** Admin only: delete a setter (and their leads). */
  remove: (setterId: string): Promise<{ message: string }> =>
    apiDelete<{ message: string }>(`/api/admin/users/${setterId}`),
};
