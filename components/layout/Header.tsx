"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Clock, Target, Award, Smartphone, Download, AlertCircle, Menu, Check } from "lucide-react";
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

const LOGO_URL =
  "https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng";

function NotificationBell() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { role } = useRole();
  const token = getAccessToken();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported" | "pending">("pending");
  const [isStandalone, setIsStandalone] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useNotifications(false, !!user);

  // Mutations
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const clearAllMutation = useClearAllNotifications();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Initialize permission status & standalone detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifPermission("Notification" in window ? Notification.permission : "unsupported");
      const standalone = window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    }
  }, []);

  // Listen for click-outside to close the dropdown
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  // 1. Supabase Realtime subscription
  useEffect(() => {
    if (!user?.id || !token) return;

    // Set auth token for RLS compliance
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
          const newNotif = payload.new as any;
          toast.info(newNotif.title, {
            description: newNotif.message?.substring(0, 120),
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id, token, queryClient]);

  // 2. Firebase Foreground Listener
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
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast.success("Marked all as read"),
    });
  };

  const handleClearAll = () => {
    clearAllMutation.mutate(undefined, {
      onSuccess: () => toast.success("Cleared all notifications"),
    });
  };

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate(id);
    }
  };

  const isAdmin = role === "ADMIN";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative rounded-xl border p-2.5 transition-all cursor-pointer ${isOpen
          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 border border-slate-950 px-1">
            <span className="text-[9px] font-black text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[100] mt-3 w-[calc(100vw-2rem)] sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
          <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
            <h4 className="font-bold text-white">Notifications</h4>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest cursor-pointer"
                >
                  Read All
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* FCM setup and PWA app installer */}
          {isAdmin && (
            <div className="border-b border-slate-800 bg-slate-950/20 divide-y divide-slate-800/50">
              {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                <button
                  onClick={handleEnablePush}
                  className="w-full p-4 flex items-center gap-3 hover:bg-slate-800/30 transition-colors text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">Enable Push Notifications</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {notifPermission === "denied"
                        ? "Blocked — enable in address bar or settings"
                        : "Tap to get live alerts on incoming leads"}
                    </p>
                  </div>
                  {notifPermission !== "denied" && (
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                  )}
                </button>
              )}
              {notifPermission === "granted" && (
                <div className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-400">Push Notifications Active</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">You'll receive lead push alerts</p>
                  </div>
                </div>
              )}

              {/* Install App prompt for mobile browser visitors */}
              {!isStandalone &&
                typeof window !== "undefined" &&
                /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Install CRM App</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                        {/iPhone|iPad|iPod/i.test(navigator.userAgent)
                          ? 'Tap Share ⎋ → "Add to Home Screen" for push alerts'
                          : 'Tap ⋮ Menu → "Add to Home Screen"'}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  </div>
                )}
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const isUnread = !notif.is_read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif.id, notif.is_read)}
                    className={`p-4 hover:bg-slate-800/40 transition-colors flex gap-3 cursor-pointer ${isUnread ? "bg-indigo-950/10 border-l-2 border-l-indigo-500 pl-3.5" : ""
                      }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.category === "NEW_LEAD"
                        ? "bg-emerald-600/20 text-emerald-400"
                        : notif.category === "BADGE"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-indigo-600/20 text-indigo-400"
                        }`}
                    >
                      {notif.category === "NEW_LEAD" ? (
                        <Target className="w-4 h-4" />
                      ) : notif.category === "BADGE" ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">{notif.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed whitespace-pre-line">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(notif.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile top bar — fixed, matches the old app's header. */
export function MobileHeader() {
  const openMobile = useUIStore((s) => s.openMobileSidebar);

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-lg lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={openMobile}
          className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
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
      <NotificationBell />
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
    description: "Select dental schools based on filters and preferences.",
  },
  "/admin/courses": {
    title: "Courses",
    description: "Manage shadowing curriculum, videos, and exams.",
  },
  "/admin/analytics": {
    title: "Platform Analytics",
    description: "Comprehensive platform control and analytical insights.",
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
  "/admin/settings": {
    title: "Rules Engine",
    description: "Manage global platform constraints and preferences.",
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
    description: "Explore curriculum, DAT prep, and shadowing logs.",
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
    <div className="hidden lg:block sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md pt-3 pb-1">
      <div className="mx-auto max-w-7xl flex items-center justify-between py-3">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">{details.title}</h1>
          {details.description && (
            <p className="text-sm text-slate-400 font-medium leading-normal">{details.description}</p>
          )}
        </div>
        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
