"use client";

import { useEffect, useRef } from "react";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  USER_KEY,
  clearAuthStorage,
  getAccessToken,
  persistTokens,
} from "@/lib/auth/cookies";
import { syncUserTimezone } from "@/lib/auth/syncTimezone";
import type { AuthUser } from "@/lib/types";

/**
 * Bootstraps auth state on first mount:
 *  1. Optimistically hydrate the user from localStorage.
 *  2. Validate the session against the backend (`/api/auth/me`).
 *  3. Capture & persist the device IANA timezone.
 *  4. Re-mirror the access token into the cookie so the proxy stays in sync.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const token = getAccessToken();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    // Re-sync cookie from localStorage (e.g. after a refresh).
    persistTokens(token);

    // Optimistic hydrate.
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached) as AuthUser);
      } catch {
        /* ignore */
      }
    }

    // Validate with backend, then sync exact device timezone.
    authApi
      .me()
      .then(async (u) => {
        const raw = u as AuthUser & { timezone?: string };
        const user: AuthUser = {
          id: raw.id,
          email: raw.email,
          name: raw.name,
          role: raw.role,
          avatar: raw.avatar,
          timezone: raw.timezone,
        };
        const synced = await syncUserTimezone(user);
        localStorage.setItem(USER_KEY, JSON.stringify(synced));
        setUser(synced);
      })
      .catch(() => {
        clearAuthStorage();
        setUser(null);
      });
  }, [setUser, setStatus]);

  return <>{children}</>;
}
