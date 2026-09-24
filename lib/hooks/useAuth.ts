"use client";

import { useCallback } from "react";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  USER_KEY,
  clearAuthStorage,
  persistTokens,
} from "@/lib/auth/cookies";
import { canAccess } from "@/lib/auth/roles";
import { syncUserTimezone } from "@/lib/auth/syncTimezone";
import type { AuthUser, UserRole } from "@/lib/types";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const reset = useAuthStore((s) => s.reset);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await authApi.signIn(email, password);
        persistTokens(res.token, res.refreshToken);
        const synced = await syncUserTimezone(res.user);
        localStorage.setItem(USER_KEY, JSON.stringify(synced));
        setUser(synced);
        return { success: true as const, user: synced };
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
    try {
      const { useUIStore } = await import("@/lib/stores/uiStore");
      useUIStore.getState().setPreviewRole(null);
    } catch {
      // ignore
    }
    try {
      const { clearAppQueryCache } = await import("@/lib/providers/QueryProvider");
      clearAppQueryCache();
    } catch {
      // ignore
    }
    clearAuthStorage();
    reset();
    // Hard navigate so proxy + PWA shell pick up cleared cookies immediately.
    window.location.assign("/login");
  }, [reset]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authApi.resetPassword(email);
      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      return { success: false as const, error: message };
    }
  }, []);

  const updatePassword = useCallback(async (password: string, accessToken: string) => {
    try {
      await authApi.updatePassword(password, accessToken);
      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
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
    updatePassword,
    hasRole,
    can,
  };
}
