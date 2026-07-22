"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Clock,
  Target,
  Award,
  Smartphone,
  Download,
  AlertCircle,
  Menu,
  Check,
  CheckCheck,
  MessageCircle,
  Calendar,
  Users,
  Info,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useUIStore } from "@/lib/stores/uiStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { getAccessToken } from "@/lib/auth/cookies";
import { supabaseClient } from "@/lib/utils/supabase";
import {
  initializeFirebase,
  requestNotificationPermission,
  onForegroundMessage,
} from "@/lib/utils/firebase";
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useClearAllNotifications,
} from "@/lib/hooks/useNotifications";
import type { SystemNotification } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const LOGO_URL =
  "https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng";

function notifCreatedAt(n: SystemNotification) {
  return n.created_at || (n as { createdAt?: string }).createdAt || "";
}

function formatNotifTime(raw: string) {
  if (!raw) return "";
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(raw).toLocaleDateString([], { month: "short", day: "numeric" });
}

function cleanNotifTitle(title: string) {
  return title.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+/u, "").trim() || title;
}

function notifVisual(notif: SystemNotification) {
  const category = (notif.category || "").toUpperCase();
  const title = `${notif.title || ""} ${notif.message || ""}`.toLowerCase();
  const type = (notif.type || "").toUpperCase();

  if (category === "NEW_LEAD" || title.includes("lead")) {
    return { icon: Target, tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  }
  if (category === "BADGE" || title.includes("badge")) {
    return { icon: Award, tone: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  }
  if (category.includes("MEETING") || title.includes("meeting")) {
    return { icon: Calendar, tone: "bg-violet-500/10 text-violet-400 border-violet-500/20" };
  }
  if (category.includes("MESSAGE") || title.includes("message")) {
    return { icon: MessageCircle, tone: "bg-sky-500/10 text-sky-400 border-sky-500/20" };
  }
  if (category === "ASSIGNMENT" || title.includes("assign")) {
    return { icon: Users, tone: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" };
  }
  if (title.includes("welcome")) {
    return { icon: Sparkles, tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  }
  if (type === "URGENT") {
    return { icon: AlertCircle, tone: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  }
  if (type === "WARNING") {
    return { icon: AlertCircle, tone: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  }
  return { icon: Info, tone: "bg-slate-800 text-slate-300 border-slate-700" };
}

function NotificationBell() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const { role } = useRole();
  const token = getAccessToken();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | "unsupported" | "pending"
  >("pending");
  const [isStandalone, setIsStandalone] = useState(false);

  const { data: notifications = [], isLoading } = useNotifications(false, !!user);

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const clearAllMutation = useClearAllNotifications();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    const list = [...notifications].sort((a, b) => {
      const unreadDelta = Number(!a.is_read) - Number(!b.is_read);
      if (unreadDelta !== 0) return -unreadDelta;
      return new Date(notifCreatedAt(b)).getTime() - new Date(notifCreatedAt(a)).getTime();
    });
    if (filter === "unread") return list.filter((n) => !n.is_read);
    return list;
  }, [notifications, filter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifPermission(
        "Notification" in window ? Notification.permission : "unsupported",
      );
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    }
  }, []);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", clickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", clickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !token) return;

    supabaseClient.realtime.setAuth(token);

    const channel = supabaseClient
      .channel(`notifications-realtime-next-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as SystemNotification;
          toast.info(newNotif.title, {
            description: newNotif.message?.substring(0, 120),
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id, token, queryClient]);

  useEffect(() => {
    const initialized = initializeFirebase();
    if (!initialized) return;

    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "Dental CRM";
      const body = payload.notification?.body || payload.data?.body || "You have a new update";
      toast.info(title, {
        description: body.substring(0, 120),
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [queryClient]);

  const handleEnablePush = async () => {
    if (!token) return;
    const initialized = initializeFirebase();
    if (!initialized) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }
    const fcmToken = await requestNotificationPermission(token);
    if (fcmToken) {
      setNotifPermission("granted");
      toast.success("Push notifications active!");
    } else {
      setNotifPermission(Notification.permission);
      if (Notification.permission === "denied") {
        toast.error("Notifications blocked", {
          description: "Please enable notifications in your browser settings.",
        });
      }
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read"),
    });
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    if (!window.confirm("Clear all notifications? This cannot be undone.")) return;
    clearAllMutation.mutate(undefined, {
      onSuccess: () => toast.success("Notifications cleared"),
    });
  };

  const handleNotificationClick = (notif: SystemNotification) => {
    if (!notif.is_read) {
      markAsReadMutation.mutate(notif.id);
    }

    const category = (notif.category || "").toUpperCase();
    setIsOpen(false);

    if (category === "ASSIGNMENT" && (role === "MENTOR" || role === "MENTOR_MANAGER")) {
      router.push("/mentor/students");
      return;
    }
    if (category === "MEETING" && notif.related_id) {
      const id = encodeURIComponent(notif.related_id);
      const href =
        role === "ADMIN"
          ? `/admin/schedule?meetingId=${id}`
          : role === "MENTOR_MANAGER"
            ? `/mentor-manager/schedule?meetingId=${id}`
            : role === "MENTOR"
              ? `/mentor/schedule?meetingId=${id}`
              : role === "STUDENT"
                ? `/student/momentum?meetingId=${id}`
                : null;
      if (href) {
        router.push(href);
        return;
      }
    }
    if (category === "NEW_MESSAGE") {
      const href =
        role === "STUDENT"
          ? notif.related_id
            ? `/student/messages/${notif.related_id}`
            : "/student/messages"
          : role === "MENTOR"
            ? notif.related_id
              ? `/mentor/messages/${notif.related_id}`
              : "/mentor/messages"
            : role === "MENTOR_MANAGER"
              ? notif.related_id
                ? `/mentor-manager/messages/${notif.related_id}`
                : "/mentor-manager/messages"
              : notif.related_id
                ? `/admin/messages/${notif.related_id}`
                : "/admin/messages";
      router.push(href);
    }
  };

  const isAdmin = role === "ADMIN";
  const showInstallPrompt =
    !isStandalone &&
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "relative cursor-pointer rounded-xl border p-2.5 transition-all",
          isOpen
            ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
        )}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-950 bg-rose-500 px-1">
            <span className="text-[9px] font-black leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-[100] mt-2 w-[min(24rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                    : "You're up to date"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {markAllAsReadMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Mark read</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0 || clearAllMutation.isPending}
                  title="Clear all"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {clearAllMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-3 flex gap-1 rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
              {(["all", "unread"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                    filter === key
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  {key === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
                </button>
              ))}
            </div>
          </div>

          {/* Admin setup (compact) */}
          {isAdmin && (notifPermission !== "unsupported" || showInstallPrompt) && (
            <div className="space-y-2 border-b border-slate-800 bg-slate-950/30 px-3 py-2.5">
              {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-left transition-colors hover:bg-emerald-500/10"
                >
                  <Bell className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-white">
                      Enable push alerts
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {notifPermission === "denied"
                        ? "Blocked in browser settings"
                        : "Get live lead notifications"}
                    </span>
                  </span>
                </button>
              )}
              {notifPermission === "granted" && (
                <div className="flex items-center gap-2 px-1 text-[11px] text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Push notifications active
                </div>
              )}
              {showInstallPrompt && (
                <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2">
                  <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white">Install CRM app</p>
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      {/iPhone|iPad|iPod/i.test(navigator.userAgent)
                        ? 'Share → "Add to Home Screen"'
                        : 'Menu → "Add to Home Screen"'}
                    </p>
                  </div>
                  <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                </div>
              )}
            </div>
          )}

          {/* List */}
          <div className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : visibleNotifications.length > 0 ? (
              <ul className="divide-y divide-slate-800/80">
                {visibleNotifications.map((notif) => {
                  const isUnread = !notif.is_read;
                  const visual = notifVisual(notif);
                  const Icon = visual.icon;
                  const when = formatNotifTime(notifCreatedAt(notif));
                  const title = cleanNotifTitle(notif.title || "Notification");
                  const message = (notif.message || "").trim();

                  return (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3.5 text-left transition-colors",
                          isUnread
                            ? "bg-indigo-500/[0.06] hover:bg-indigo-500/10"
                            : "hover:bg-slate-800/50",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                            visual.tone,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p
                              className={cn(
                                "min-w-0 flex-1 text-[13px] leading-snug",
                                isUnread
                                  ? "font-semibold text-white"
                                  : "font-medium text-slate-200",
                              )}
                            >
                              {title}
                            </p>
                            {isUnread && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                            )}
                          </div>
                          {message && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                              {message}
                            </p>
                          )}
                          {when && (
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
                              <Clock className="h-2.5 w-2.5" />
                              {when}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-300">
                  {filter === "unread" ? "No unread notifications" : "You're all caught up"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {filter === "unread"
                    ? "Switch to All to see earlier updates."
                    : "New alerts will show up here."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderActionButton({ compact = false }: { compact?: boolean }) {
  const action = useUIStore((s) => s.pageHeaderAction);
  if (!action) return null;

  const isSecondary = action.variant === "secondary";
  const disabled = !!action.disabled;

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={disabled}
      className={
        compact
          ? `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isSecondary
                ? "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            }`
          : `inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isSecondary
                ? "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            }`
      }
    >
      {action.icon}
      <span className={compact ? "max-w-[9rem] truncate" : undefined}>{action.label}</span>
    </button>
  );
}

/** Mobile top bar — fixed, matches the old app's header. */
export function MobileHeader() {
  const openMobile = useUIStore((s) => s.openMobileSidebar);

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-lg lg:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={openMobile}
          className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="Logo"
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="truncate bg-gradient-to-r from-white to-slate-400 bg-clip-text text-sm font-black tracking-tight text-transparent">
            Dental School Guide
          </h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <HeaderActionButton compact />
        <NotificationBell />
      </div>
    </div>
  );
}

const ROUTE_DETAILS: Record<string, { title: string; description: string }> = {
  "/admin/overview": {
    title: "Platform Overview",
    description: "Dental School Guide Operational Control & Analytics.",
  },
  "/admin/setter-management": {
    title: "Setter Management",
    description: "Assign setter goals and manage outreach performance.",
  },
  "/admin/schedule": {
    title: "Schedule",
    description: "Manage upcoming strategy sessions and mentor-student meetings.",
  },
  "/admin/tasks": {
    title: "Tasks",
    description: "Track action items and pending tasks.",
  },
  "/admin/engagement": {
    title: "Engagement & Comms",
    description: "Monitor student engagement alerts and templates.",
  },
  "/admin/mentors": {
    title: "Mentor Operations",
    description: "Audit compliance, capacity workloads, and latency stats.",
  },
  "/admin/school-selection": {
    title: "School Selection",
    description: "Create strategic selection plans for students — manually or with AI.",
  },
  "/admin/courses": {
    title: "Courses",
    description: "Manage shadowing curriculum, videos, and exams.",
  },
  "/admin/analytics": {
    title: "Platform Analytics",
    description: "Live cohort funnels, school performance, and compliance signals.",
  },
  "/admin/research": {
    title: "Admissions Research",
    description: "Explore statistics and requirements for dental schools.",
  },
  "/admin/lor-config": {
    title: "LOR Config",
    description: "Configure letter of recommendation templates and reminders.",
  },
  "/admin/letter-portal": {
    title: "Letter Review",
    description: "Approve, decline, and inspect uploaded recommendation letters.",
  },
  "/admin/messages": {
    title: "Inbox",
    description: "Communicate with students, mentors, and administrators.",
  },
  "/admin/rules-engine": {
    title: "Rules Engine",
    description: "Platform rules, auto-replies, welcome templates, and status messages.",
  },
  "/admin/settings": {
    title: "Rules Engine",
    description: "Platform rules, auto-replies, welcome templates, and status messages.",
  },
  "/admin/users": {
    title: "User Management",
    description: "Invite new users and manage active workspace roles.",
  },
  "/mentor-manager/compliance-hub": {
    title: "Compliance Hub",
    description: "Monitor mentor compliance scores and latency.",
  },
  "/mentor-manager/schedule": {
    title: "Schedule",
    description: "Manage upcoming strategy sessions and meetings.",
  },
  "/mentor-manager/tasks": {
    title: "My Tasks",
    description: "Track your personal operational task list.",
  },
  "/mentor-manager/engagement": {
    title: "Engagement & Comms",
    description: "Monitor student engagement alerts and templates.",
  },
  "/mentor-manager/mentors": {
    title: "Mentor List",
    description: "View and manage active mentors.",
  },
  "/mentor-manager/messages": {
    title: "Inbox",
    description: "Communicate with users inside the app workspace.",
  },
  "/mentor-manager/analytics": {
    title: "Analytics",
    description: "Review reporting metrics and insights.",
  },
  "/mentor-manager/alerts": {
    title: "Active Nudges",
    description: "Trigger alert reminders and nudges for inactive users.",
  },
  "/mentor-manager/reporting": {
    title: "SLA Report",
    description: "Analyze service level agreement response times.",
  },
  "/mentor/command-center": {
    title: "Command Center",
    description: "Operate mentor tasks and review student actions.",
  },
  "/mentor/schedule": {
    title: "Schedule",
    description: "Manage student session appointments.",
  },
  "/mentor/tasks": {
    title: "My Tasks",
    description: "Review your pending action items.",
  },
  "/mentor/students": {
    title: "My Students",
    description: "Review profiles, readiness status, and meetings for assigned students.",
  },
  "/mentor/school-filter": {
    title: "School Filter",
    description: "Compare and filter dental school requirements.",
  },
  "/mentor/messages": {
    title: "Inbox",
    description: "Communicate with student applicants and manager.",
  },
  "/mentor/analytics": {
    title: "Analytics",
    description: "Review student metrics and activity rates.",
  },
  "/student/momentum": {
    title: "Momentum",
    description: "Track application velocity and tasks roadmap.",
  },
  "/student/hub": {
    title: "Central Hub",
    description: "Your dental school application command center.",
  },
  "/student/profile": {
    title: "Profile & Docs",
    description: "Manage personal statements, letters, and requirements.",
  },
  "/student/resources": {
    title: "Resources",
    description: "Admin-curated tools and guides for your application journey.",
  },
  "/student/messages": {
    title: "Inbox",
    description: "Message your mentor or letter writers.",
  },
  "/student/letters/vault": {
    title: "Letter Vault",
    description: "Request and track recommendation letters securely.",
  },
  "/student/find-dentist": {
    title: "Find a Dentist",
    description: "Discover dentists near you and log shadowing opportunities.",
  },
  "/student/mentor-assistant": {
    title: "Mentor Assistant",
    description: "AI-powered guidance for dental school applications.",
  },
  "/mentor/mentor-assistant": {
    title: "Mentor Assistant",
    description: "AI-powered assistant for mentor operations and student guidance.",
  },
  "/mentor-manager/mentor-assistant": {
    title: "Mentor Assistant",
    description: "AI-powered insights and mentor management assistant.",
  },
  "/admin/mentor-assistant": {
    title: "Mentor Assistant",
    description: "AI-powered CRM controls and applicant monitoring assistant.",
  },
  "/admin/profile": {
    title: "Profile",
    description: "Manage your personal profile and account settings.",
  },
  "/mentor/profile": {
    title: "Profile",
    description: "Manage your personal profile and account settings.",
  },
  "/mentor-manager/profile": {
    title: "Profile",
    description: "Manage your personal profile and account settings.",
  },
  "/setter/profile": {
    title: "Profile",
    description: "Manage your personal profile and account settings.",
  },
  "/letter-writer/profile": {
    title: "Profile",
    description: "Manage your personal profile and account settings.",
  },
  "/admin/resources": {
    title: "Resources",
    description: "Explore dental school admissions guidelines and preparation files.",
  },
  "/mentor/resources": {
    title: "Resources",
    description: "Explore dental school admissions guidelines and preparation files.",
  },
  "/setter/setter-management": {
    title: "Setter Management",
    description: "Assign setter goals and manage outreach performance.",
  },
  "/letter-writer/letter-portal": {
    title: "Letter Portal",
    description: "Upload and review recommendation letters.",
  },
};

function getHeaderDetails(pathname: string) {
  if (ROUTE_DETAILS[pathname]) {
    return ROUTE_DETAILS[pathname];
  }
  if (pathname.match(/^\/admin\/messages\/[^/]+/)) {
    return ROUTE_DETAILS["/admin/messages"];
  }
  if (pathname.match(/^\/mentor-manager\/messages\/[^/]+/)) {
    return ROUTE_DETAILS["/mentor-manager/messages"];
  }
  if (pathname.match(/^\/mentor\/messages\/[^/]+/)) {
    return ROUTE_DETAILS["/mentor/messages"];
  }
  if (pathname.match(/^\/student\/messages\/[^/]+/)) {
    return ROUTE_DETAILS["/student/messages"];
  }
  if (pathname === "/admin/setter-management/all" || pathname === "/setter/setter-management/all") {
    return {
      title: "All Setters",
      description: "Manage and review performance of all outreach setters.",
    };
  }
  if (pathname.startsWith("/admin/setter-management/") || pathname.startsWith("/setter/setter-management/")) {
    return {
      title: "Setter Details",
      description: "View individual setter leads and performance metrics.",
    };
  }
  if (
    pathname.match(/^\/admin\/mentors\/[^/]+\/students/) ||
    pathname.match(/^\/mentor-manager\/mentors\/[^/]+\/students/)
  ) {
    return {
      title: "Students",
      description: "Roster and readiness for this mentor.",
    };
  }
  if (
    pathname.match(/^\/admin\/mentors\/[^/]+\/audit/) ||
    pathname.match(/^\/mentor-manager\/mentors\/[^/]+\/audit/)
  ) {
    return {
      title: "Audit",
      description: "Performance and compliance for this mentor.",
    };
  }
  if (
    pathname.match(/^\/admin\/mentors\/[^/]+\/profile/) ||
    pathname.match(/^\/mentor-manager\/mentors\/[^/]+\/profile/)
  ) {
    return {
      title: "Profile",
      description: "Mentor details and management meetings.",
    };
  }
  for (const route of Object.keys(ROUTE_DETAILS)) {
    if (pathname.startsWith(route + "/")) {
      return ROUTE_DETAILS[route];
    }
  }
  const segments = pathname.split("/").filter(Boolean);
  const rawSegment = ["admin", "student", "mentor", "mentor-manager", "setter", "letter-writer"].includes(segments[0])
    ? segments[1]
    : segments[0];

  const title = rawSegment
    ? rawSegment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Dental School Guide";

  return {
    title,
    description: "Dental School Guide Operational CRM Workspace.",
  };
}

/** Desktop floating notification bell — top-right, matches old app. */
export function DesktopHeaderActions() {
  return null;
}

/** Desktop Global Header bar with dynamic title, description, and notifications */
export function GlobalHeader() {
  const pathname = usePathname();
  const details = getHeaderDetails(pathname);

  return (
    <div className="hidden lg:block sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md pt-2">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 py-2.5 border-b border-slate-800/80 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white leading-tight">{details.title}</h1>
          {details.description && (
            <p className="text-sm text-slate-400 font-medium leading-normal mt-0.5">{details.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <HeaderActionButton />
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
