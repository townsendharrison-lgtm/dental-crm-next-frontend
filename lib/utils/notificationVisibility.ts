import type { SystemNotification, UserRole } from "@/lib/types";

const MENTOR_NOTIF_TTL_MS = 48 * 60 * 60 * 1000;

function notifCreatedAtMs(n: SystemNotification): number {
  const raw =
    n.created_at ||
    (n as { createdAt?: string }).createdAt ||
    "";
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function isNewLeadNotification(n: Pick<SystemNotification, "category" | "title" | "message">) {
  const category = String(n.category || "").toUpperCase();
  if (category === "NEW_LEAD") return true;
  const blob = `${n.title || ""} ${n.message || ""}`.toLowerCase();
  return /\bnew lead\b/.test(blob) || blob.includes("added as a new lead");
}

/** Lead alerts are admin-only (not mentors / mentor managers / students / setters). */
export function canSeeNewLeadNotifications(role?: UserRole | string | null) {
  return String(role || "").toUpperCase() === "ADMIN";
}

/** Mentor dashboard / mentor bell: drop notifications older than 48 hours. */
export function isWithinMentorNotificationTtl(n: SystemNotification, now = Date.now()) {
  const created = notifCreatedAtMs(n);
  if (!created) return true;
  return now - created <= MENTOR_NOTIF_TTL_MS;
}

export function filterNotificationsForRole(
  notifications: SystemNotification[],
  role?: UserRole | string | null,
) {
  const r = String(role || "").toUpperCase();
  const now = Date.now();

  return notifications.filter((n) => {
    if (!canSeeNewLeadNotifications(r) && isNewLeadNotification(n)) return false;
    if (r === "MENTOR" && !isWithinMentorNotificationTtl(n, now)) return false;
    return true;
  });
}
