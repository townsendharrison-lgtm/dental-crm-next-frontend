import { apiGet, apiPost } from "./client";
import type { AuthUser, SignInResponse, UserRole } from "@/lib/types";

export const authApi = {
  signIn: (email: string, password: string) =>
    apiPost<SignInResponse>("/api/auth/signin", { email, password }),

  signOut: () => apiPost<{ message: string }>("/api/auth/signout"),

  me: () => apiGet<AuthUser>("/api/auth/me"),

  resetPassword: (email: string) =>
    apiPost<{ message: string }>("/api/auth/reset-password", { email }),

  updatePassword: (password: string, accessToken: string) =>
    apiPost<{ message: string }>("/api/auth/update-password", { password, accessToken }),

  getInvitation: (token: string) =>
    apiGet<{ email: string; role: UserRole; invitedByName: string }>(
      `/api/auth/invitation?token=${encodeURIComponent(token)}`,
    ),

  completeInvitation: (accessToken: string, name: string, password: string) =>
    apiPost<InvitationResult>("/api/auth/complete-invitation", { accessToken, name, password }),

  completeInvitationByToken: (invitationToken: string, name: string, password: string) =>
    apiPost<InvitationResult>("/api/auth/complete-invitation", { invitationToken, name, password }),
};

type InvitationResult = {
  message: string;
  autoSignIn: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
};
