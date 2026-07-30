import { usersApi } from "@/lib/api/users";
import { studentsApi } from "@/lib/api/students";
import { USER_KEY } from "@/lib/auth/cookies";
import { getBrowserTimezone } from "@/lib/utils/dateUtils";
import type { AuthUser } from "@/lib/types";

/**
 * Capture the device's exact IANA timezone and persist it for the session user.
 * Refreshes on every login / auth bootstrap so travel/DST zone changes stay accurate.
 */
export async function syncUserTimezone(user: AuthUser): Promise<AuthUser> {
  const timezone = getBrowserTimezone();
  const next: AuthUser = { ...user, timezone };

  if (user.timezone === timezone) {
    return next;
  }

  try {
    await usersApi.updateProfile({ timezone });
  } catch {
    // Column may not exist yet; still keep client-side timezone for UI.
  }

  if (user.role === "STUDENT") {
    try {
      await studentsApi.update(user.id, { timezone });
    } catch {
      /* profile sync is best-effort */
    }
  }

  try {
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }

  return next;
}
