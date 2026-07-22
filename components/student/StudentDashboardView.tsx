"use client";

import React from "react";
import { toast } from "sonner";
import type {
  Student,
  Badge,
  ActionItem,
  Resource,
  SystemNotification,
  Survey,
  Meeting,
  Application,
  PlatformConfig,
} from "@/lib/types";
import {
  Rocket,
  Target,
  Calendar,
  ArrowRight,
  Award,
  ExternalLink,
  MessageCircle,
  Clock,
  FileText,
  Video,
  Send,
  AlertCircle,
  Info,
  ClipboardList,
  Sparkles,
  Play,
  CheckSquare,
  CheckCircle,
} from "lucide-react";
import { MOCK_MENTORS } from "@/lib/data";
import ApplicationTracker from "./ApplicationTracker";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea, FormField } from "@/components/ui/Form";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { renderBadgeIcon } from "@/lib/utils/badgeIcons";
import { parseLocalDate } from "@/lib/utils/dateUtils";

interface StudentDashboardProps {
  student: Student;
  badges: Badge[];
  actionItems: ActionItem[];
  resources: Resource[];
  notifications: SystemNotification[];
  surveys: Survey[];
  onSendMessage: (
    text: string,
    receiverId: string,
    receiverIds?: string[],
    groupName?: string,
    threadId?: string,
  ) => void;
  onNavigate: (tab: string) => void;
  onToggleActionItem: (itemId: string) => void;
  onTakeSurvey: (id: string) => void;
  onUpdateApplications: (apps: Application[]) => void;
  nextMeeting?: Meeting;
  platformConfig: PlatformConfig;
  strengthPercentile?: {
    strengthScore: number;
    cohortSize: number;
    percentile: number | null;
    aheadOf: number | null;
  } | null;
}

function itemDueDate(item: ActionItem) {
  return item.due_date || item.dueDate || "";
}

function formatDueDateOnly(raw: string) {
  if (!raw) return "";
  const d = parseLocalDate(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function notifCreatedAt(n: SystemNotification) {
  return n.created_at || n.createdAt || "";
}

function formatRelativeTime(raw: string) {
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

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  badges: allBadges,
  actionItems: studentTasks,
  resources,
  notifications,
  surveys,
  onSendMessage,
  onNavigate,
  onToggleActionItem,
  onTakeSurvey,
  onUpdateApplications,
  nextMeeting,
  platformConfig,
  strengthPercentile = null,
}) => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState("");
  const [selectedBadge, setSelectedBadge] = React.useState<{
    id?: string;
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    earnedAt?: string;
  } | null>(null);

  const mentorId = student.mentorId || student.profile?.mentor_id;
  const mentor = MOCK_MENTORS.find((m) => m.id === mentorId);
  const nextTask = studentTasks.find((t) => t.status !== "COMPLETED") || studentTasks[0];
  const timezone =
    student.timezone ||
    student.profile?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  usePageHeaderAction({
    label: "Mentor Assistant",
    icon: <Sparkles className="w-4 h-4" />,
    onClick: () => onNavigate("mentor-assistant"),
  });

  const targetDate = new Date("2026-06-01");
  const today = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const earnedBadges =
    (student.badges || [])
      .map((sb) => {
        const badge = allBadges.find((b) => b.id === sb.badgeId);
        return badge ? { ...badge, earnedAt: sb.earnedAt } : null;
      })
      .filter(Boolean) || [];

  const getPhaseRange = (phaseNum: number) => {
    const ranges = [
      { start: 0, end: 3 },
      { start: 4, end: 6 },
      { start: 7, end: 9 },
      { start: 10, end: 12 },
    ];
    const { start: startMonth, end: endMonth } = ranges[phaseNum - 1];
    const createdAt = student.createdAt || student.profile?.created_at;
    if (!createdAt) return `${startMonth}-${endMonth} months`;

    const createdDate = new Date(createdAt);
    const startDate = new Date(createdDate);
    startDate.setMonth(createdDate.getMonth() + startMonth);
    const endDate = new Date(createdDate);
    endDate.setMonth(createdDate.getMonth() + endMonth);
    const format = (date: Date) => date.toLocaleString("default", { month: "short" });
    return `${format(startDate)} - ${format(endDate)}`;
  };

  const formatMeetingDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone || undefined,
        timeZoneName: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const handleJoinMeeting = () => {
    const link = nextMeeting?.link;
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error("No meeting link yet. Ask your mentor to add one.");
  };

  const handleRescheduleClick = () => {
    setChatMessage(
      `Hi ${mentor?.name || "Mentor"}, I'm so sorry but I need to reschedule our meeting.`,
    );
    setIsChatOpen(true);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    if (!mentor) {
      toast.error("No mentor assigned yet.");
      return;
    }
    onSendMessage(chatMessage, mentor.id);
    setIsChatOpen(false);
    setChatMessage("");
    toast.success("Message sent");
  };

  const progress = student.progress ?? student.profile?.progress ?? 0;
  const strengthScore =
    strengthPercentile?.strengthScore ??
    student.strengthScore ??
    student.profile?.strength_score ??
    null;

  const rankStatement = React.useMemo(() => {
    const aheadOf = strengthPercentile?.aheadOf;
    const cohortSize = strengthPercentile?.cohortSize ?? 0;
    if (cohortSize > 1 && aheadOf != null) {
      if (aheadOf >= 50) {
        return `You're ahead of ${aheadOf}% of other applicants on strength score.`;
      }
      if (aheadOf > 0) {
        return `Strength score ranks above ${aheadOf}% of applicants — keep climbing.`;
      }
      return `Strength score is getting started vs ${cohortSize - 1} other applicants.`;
    }
    if (strengthScore != null) {
      return `Your current strength score is ${strengthScore}/100.`;
    }
    return "Complete your profile to see how you compare to other applicants.";
  }, [strengthPercentile, strengthScore]);

  const recentUpdates = React.useMemo(() => {
    return [...notifications]
      .sort((a, b) => {
        const aUnread = a.is_read ? 0 : 1;
        const bUnread = b.is_read ? 0 : 1;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(notifCreatedAt(b)).getTime() - new Date(notifCreatedAt(a)).getTime();
      })
      .slice(0, 5);
  }, [notifications]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">
            Keep it up, {student.name.split(" ")[0]}!
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
            <Award className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>{rankStatement}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<MessageCircle className="w-4 h-4 text-indigo-400" />}
          onClick={() => onNavigate("messages")}
        >
          Inbox
        </Button>
      </div>

      {(nextMeeting || surveys.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Needs attention
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {nextMeeting && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500 bg-indigo-600 p-4 shadow-lg shadow-indigo-600/20">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-100/70">
                      Next meeting
                    </p>
                    <h4 className="truncate text-sm font-semibold text-white">
                      {nextMeeting.title || "Mentorship Session"}
                    </h4>
                    <p className="text-xs text-indigo-100">
                      {formatMeetingDate(nextMeeting.date)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 border border-white/25 bg-white/15 text-white shadow-none hover:bg-white/25"
                  leftIcon={<Play className="h-3.5 w-3.5 fill-current" />}
                  onClick={handleJoinMeeting}
                >
                  Join
                </Button>
              </div>
            )}
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Feedback required
                    </p>
                    <h4 className="truncate text-sm font-semibold text-white">{survey.title}</h4>
                  </div>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => onTakeSurvey(survey.id)}>
                  Take Survey
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentUpdates.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Recent updates
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {recentUpdates.map((notif) => {
              const urgent = notif.type === "URGENT";
              const warning = notif.type === "WARNING";
              const when = formatRelativeTime(notifCreatedAt(notif));
              return (
                <div
                  key={notif.id}
                  className={`relative overflow-hidden rounded-xl border p-3.5 transition-colors ${
                    urgent
                      ? "border-rose-500/25 bg-rose-500/5"
                      : warning
                        ? "border-amber-500/25 bg-amber-500/5"
                        : !notif.is_read
                          ? "border-indigo-500/25 bg-indigo-500/5"
                          : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        urgent
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : warning
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                      }`}
                    >
                      {urgent ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : warning ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-snug text-white">
                          {cleanNotifTitle(notif.title)}
                        </h4>
                        {!notif.is_read && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                        {notif.message}
                      </p>
                      {when && (
                        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                          {when}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white md:p-8">
        <div className="relative z-10 max-w-2xl">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-indigo-100/60">
            What to work on right now
          </h3>
          {nextTask ? (
            <>
              <h4 className="mb-3 text-2xl font-bold leading-tight md:text-3xl">{nextTask.task}</h4>
              <p className="mb-5 text-sm leading-relaxed text-indigo-100/80 md:text-base">
                {nextTask.description?.trim() ||
                  "This is the most critical step for your application timing. Finishing this today keeps you on track for the priority deadline."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("active-checklist");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  Start Task
                  <ArrowRight className="h-4 w-4" />
                </button>
                {itemDueDate(nextTask) && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-950/40 px-3.5 py-2 text-xs text-indigo-100">
                    <Clock className="h-3.5 w-3.5" />
                    Due {formatDueDateOnly(itemDueDate(nextTask))}
                  </div>
                )}
                {nextTask.priority && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-950/40 px-3.5 py-2 text-xs uppercase tracking-wider text-indigo-100">
                    {nextTask.priority} priority
                  </div>
                )}
              </div>
            </>
          ) : (
            <h4 className="text-2xl font-bold md:text-3xl">You&apos;re all caught up!</h4>
          )}
        </div>
        <Rocket className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 text-white opacity-10" />
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Application Journey</h3>
              <span className="text-2xl font-bold text-indigo-500">{progress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full mb-5 overflow-hidden border border-slate-800/30">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Strength Score",
                  value: student.strengthScore ?? student.profile?.strength_score ?? "—",
                  icon: <Target className="w-5 h-5 text-indigo-400" />,
                  tone: "bg-indigo-500/10 border-indigo-500/20",
                },
                {
                  label: "DAT",
                  value: student.datScore ?? student.profile?.dat_score ?? "—",
                  icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
                  tone: "bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  label: "Days Left",
                  value: daysLeft,
                  icon: <Calendar className="w-5 h-5 text-amber-400" />,
                  tone: "bg-amber-500/10 border-amber-500/20",
                },
                {
                  label: "Apps",
                  value: (student.lorRequired || 0) + 4,
                  icon: <FileText className="w-5 h-5 text-rose-400" />,
                  tone: "bg-rose-500/10 border-rose-500/20",
                },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border ${stat.tone}`}
                  >
                    {stat.icon}
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Milestone Badges
              </h3>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {earnedBadges.length} Earned
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {earnedBadges.map((badge) =>
                badge ? (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge)}
                    className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-center group hover:border-indigo-500/40 transition-all cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform ${badge.color || ""}`}
                    >
                      {renderBadgeIcon(badge.icon, "w-5 h-5")}
                    </div>
                    <p className="text-xs font-semibold text-white mb-0.5 truncate">{badge.name}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">
                      Earned{" "}
                      {new Date(badge.earnedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </button>
                ) : null,
              )}
              {earnedBadges.length === 0 && (
                <div className="col-span-full py-6 text-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-500">No badges earned yet. Keep pushing!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4 border border-indigo-500/30">
              <Calendar className="w-5 h-5 text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-0.5">Next Meeting</h3>
            <p className="text-sm text-slate-400">With {mentor?.name || "Your Mentor"}</p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 text-center mb-4">
              {nextMeeting ? (
                <>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-300/60 mb-1">
                    {new Date(nextMeeting.date).toLocaleDateString("en-US", { weekday: "long" })}
                  </p>
                  <p className="text-lg font-bold text-white">
                    {new Date(nextMeeting.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    <span className="text-indigo-300/40 font-light mx-1">@</span>
                    {new Date(nextMeeting.date).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone || undefined,
                    })}
                  </p>
                  <p className="text-[10px] text-indigo-300/40 mt-1.5 uppercase font-bold tracking-wider truncate">
                    {timezone}
                  </p>
                </>
              ) : (
                <p className="text-indigo-300/60 text-sm italic">No meeting scheduled</p>
              )}
            </div>
          </div>

          <Button
            className="mb-2 w-full"
            leftIcon={<Video className="w-4 h-4" />}
            onClick={handleJoinMeeting}
            disabled={!nextMeeting}
          >
            Join Meeting
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleRescheduleClick}
            disabled={!nextMeeting}
          >
            Reschedule
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" /> Application Journey
          </h3>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-800" />
            <div className="space-y-8">
              {[
                { phase: "Phase 1", title: "Primary Prep", status: "completed", date: getPhaseRange(1) },
                { phase: "Phase 2", title: "DAT & Letters", status: "current", date: getPhaseRange(2) },
                { phase: "Phase 3", title: "Submission", status: "upcoming", date: getPhaseRange(3) },
                { phase: "Phase 4", title: "Interviews", status: "upcoming", date: getPhaseRange(4) },
              ].map((step) => (
                <div key={step.phase} className="relative pl-10">
                  <div
                    className={`absolute left-0 w-7 h-7 rounded-full border-4 flex items-center justify-center z-10 ${
                      step.status === "completed"
                        ? "bg-indigo-600 border-slate-900"
                        : step.status === "current"
                          ? "bg-slate-900 border-indigo-600"
                          : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          step.status === "current" ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                        step.status === "completed"
                          ? "text-indigo-400"
                          : step.status === "current"
                            ? "text-indigo-500"
                            : "text-slate-500"
                      }`}
                    >
                      {step.phase}
                    </p>
                    <h4
                      className={`text-sm font-bold mb-0.5 ${
                        step.status === "upcoming" ? "text-slate-500" : "text-white"
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-500">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="active-checklist" className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" /> Active Checklist
            </h3>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {studentTasks.filter((t) => t.status === "COMPLETED").length} / {studentTasks.length}{" "}
              Done
            </span>
          </div>
          <div className="space-y-2">
            {studentTasks.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  item.status === "COMPLETED"
                    ? "bg-slate-950/30 border-slate-800/50 opacity-60"
                    : "bg-slate-800/20 border-slate-700/50 hover:border-indigo-500/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleActionItem(item.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    item.status === "COMPLETED"
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-slate-700 hover:border-indigo-500"
                  }`}
                >
                  {item.status === "COMPLETED" && <CheckCircle className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      item.status === "COMPLETED" ? "text-slate-500 line-through" : "text-white"
                    }`}
                  >
                    {item.task}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {item.category}
                    </span>
                    {itemDueDate(item) && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-wider">
                          Due {formatDueDateOnly(itemDueDate(item))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {studentTasks.length === 0 && (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-sm">No active tasks. You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6">
        <ApplicationTracker
          studentId={student.id}
          platformConfig={platformConfig}
        />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
        <div className="relative z-10 flex flex-col md:flex-row gap-5 items-center">
          <div className="w-16 h-16 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
            <MessageCircle size={28} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">
              AI Support
            </h3>
            <h4 className="text-xl font-bold text-white mb-2">Mentor Assistant</h4>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl mb-4">
              Need quick advice? Ask for guidance on personal statements, interview prep, or DAT
              strategy.
            </p>
            <Button
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onNavigate("mentor-assistant")}
              className="mx-auto md:mx-0"
            >
              Ask a Question
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-white mb-3">Required Resources</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources.map((res) => (
            <button
              key={res.id}
              type="button"
              onClick={() => {
                if (res.url.startsWith("http")) {
                  window.open(res.url, "_blank", "noopener,noreferrer");
                } else {
                  onNavigate("resources");
                }
              }}
              className="bg-slate-900 border border-slate-800 p-4 rounded-xl group hover:border-indigo-500/40 transition-all text-left cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="px-2.5 py-0.5 bg-slate-800 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {res.category}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1.5 group-hover:text-indigo-400 transition-colors">
                {res.title}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3 h-3" /> {res.estimatedTime}
              </div>
            </button>
          ))}
        </div>
      </section>

      <Modal
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        title={`Message ${mentor?.name || "Mentor"}`}
        description="Rescheduling request"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setIsChatOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleSendMessage}
            >
              Send Message
            </Button>
          </div>
        }
      >
        <FormField label="Your Message">
          <Textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="min-h-[120px]"
            placeholder="Type your message here..."
          />
        </FormField>
      </Modal>

      <Modal
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        title={selectedBadge?.name || "Badge"}
        size="sm"
        footer={
          <Button className="w-full" onClick={() => setSelectedBadge(null)}>
            Awesome!
          </Button>
        }
      >
        {selectedBadge && (
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 ${selectedBadge.color || ""}`}
            >
              {renderBadgeIcon(selectedBadge.icon, "w-8 h-8")}
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              {selectedBadge.description}
            </p>
            {selectedBadge.earnedAt && (
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Achievement Date
                </p>
                <p className="text-sm font-semibold text-white">
                  {new Date(selectedBadge.earnedAt).toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentDashboard;
