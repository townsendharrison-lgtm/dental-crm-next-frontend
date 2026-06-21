import { apiGet, apiPost } from "./client";
import type { AuthUser, SignInResponse } from "@/lib/types";

export const authApi = {
  signIn: (email: string, password: string) =>
    apiPost<SignInResponse>("/api/auth/signin", { email, password }),

  signOut: () => apiPost<{ message: string }>("/api/auth/signout"),

  me: () => apiGet<AuthUser>("/api/auth/me"),

  resetPassword: (email: string) =>
    apiPost<{ message: string }>("/api/auth/reset-password", { email }),

  updatePassword: (password: string, accessToken: string) =>
    apiPost<{ message: string }>("/api/auth/update-password", { password, accessToken }),

  completeInvitation: (accessToken: string, name: string, password: string) =>
    apiPost<{
      message: string;
      autoSignIn: boolean;
      token?: string;
      refreshToken?: string;
      user?: AuthUser;
    }>("/api/auth/complete-invitation", { accessToken, name, password }),
};
