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
 *
 * Critical: if the user signs in while `/me` is still in flight with an expired
 * token, ignore that late failure so we do not wipe the fresh session (common in
 * standalone PWAs where users land on /login with a stale token).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const tokenAtStart = getAccessToken();
    if (!tokenAtStart) {
      setStatus("unauthenticated");
      return;
    }

    // Re-sync cookie from localStorage (e.g. after a refresh / PWA cold start).
    persistTokens(tokenAtStart);

    // Optimistic hydrate.
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached) as AuthUser);
      } catch {
        /* ignore */
      }
    }

    let cancelled = false;
    authApi
      .me()
      .then(async (u) => {
        if (cancelled) return;
        // A newer login replaced the token while /me was running — keep it.
        const current = getAccessToken();
        if (current && current !== tokenAtStart) return;

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
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(synced));
        setUser(synced);
      })
      .catch(() => {
        if (cancelled) return;
        // Login may have succeeded with a new token while this request failed.
        const current = getAccessToken();
        if (current && current !== tokenAtStart) return;
        clearAuthStorage();
        setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser, setStatus]);

  return <>{children}</>;
}
