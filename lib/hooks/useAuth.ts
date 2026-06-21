"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  USER_KEY,
  clearAuthStorage,
  persistTokens,
} from "@/lib/auth/cookies";
import { canAccess } from "@/lib/auth/roles";
import type { AuthUser, UserRole } from "@/lib/types";

export function useAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const reset = useAuthStore((s) => s.reset);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await authApi.signIn(email, password);
        persistTokens(res.token, res.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setUser(res.user);
        return { success: true as const, user: res.user };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed.";
        return { success: false as const, error: message };
      }
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch {
      // ignore — clear local state regardless
    }
    clearAuthStorage();
    reset();
    router.replace("/login");
  }, [reset, router]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authApi.resetPassword(email);
      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      return { success: false as const, error: message };
    }
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  const can = useCallback(
    (pathname: string) => canAccess(user?.role, pathname),
    [user],
  );

  return {
    user: user as AuthUser | null,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    login,
    logout,
    resetPassword,
    hasRole,
    can,
  };
}
