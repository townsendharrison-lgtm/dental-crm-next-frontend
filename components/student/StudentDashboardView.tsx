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
  CalendarClock,
  Bell,
  Plus,
  X,
  Globe,
  Trash2,
} from "lucide-react";
import { formatMeetingLocal, parseLocalDate } from "@/lib/utils/dateUtils";
import { MeetingTimeWithHint } from "@/components/ui/TimezoneHint";
import { useMentor } from "@/lib/hooks/useMentors";
import ApplicationTracker from "./ApplicationTracker";
import ApplicationReadinessPanel from "./ApplicationReadinessPanel";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea, FormField, Input } from "@/components/ui/Form";
import { DatePicker } from "@/components/ui/DatePicker";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { renderBadgeIcon } from "@/lib/utils/badgeIcons";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useStudentCredentials } from "@/lib/hooks/useStudentNotesDexterity";
import { buildApplicationReadiness } from "@/lib/utils/applicationReadiness";

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
  ) => void | Promise<void>;
  onNavigate: (tab: string) => void;
  /** Open a recent-update notification (dismiss + deep-link). */
  onOpenNotification?: (notif: SystemNotification) => void;
  onToggleActionItem: (itemId: string) => void;
  onAddActionItem?: (task: string, dueDate: string) => void;
  onDeleteActionItem?: (itemId: string) => void;
  onTakeSurvey: (id: string) => void;
  onUpdateApplications: (apps: Application[]) => void;
  /** Next 1:1 / mentorship meeting — never replaced by webinars */
  nextMeeting?: Meeting;
  /** Optional GLOBAL webinar / group session (shown separately when present) */
  upcomingWebinar?: Meeting;
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

function itemCreatedAt(item: ActionItem) {
  return item.created_at || "";
}

function sortChecklistTasks(items: ActionItem[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(itemCreatedAt(a)).getTime();
    const bTime = new Date(itemCreatedAt(b)).getTime();
    const aValid = Number.isFinite(aTime) ? aTime : 0;
    const bValid = Number.isFinite(bTime) ? bTime : 0;
    return bValid - aValid;
  });
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

function notifVisual(notif: SystemNotification) {
  const title = `${notif.title || ""} ${notif.message || ""}`.toLowerCase();
  const category = (notif.category || "").toUpperCase();

  if (
    category.includes("MEETING") ||
    title.includes("meeting") ||
    title.includes("reschedule")
  ) {
    return {
      icon: CalendarClock,
      tone: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    };
  }
  if (
    category.includes("MESSAGE") ||
    title.includes("message") ||
    title.includes("inbox")
  ) {
    return {
      icon: MessageCircle,
      tone: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    };
  }
  if (title.includes("welcome") || title.includes("excited to help")) {
    return {
      icon: Sparkles,
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (notif.type === "URGENT") {
    return {
      icon: AlertCircle,
      tone: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    };
  }
  if (notif.type === "WARNING") {
    return {
      icon: Bell,
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }
  return {
    icon: Info,
    tone: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  };
}

function isInboxNotification(notif: SystemNotification) {
  const category = (notif.category || "").toUpperCase();
  const title = `${notif.title || ""} ${notif.message || ""}`.toLowerCase();
  return (
    category.includes("MESSAGE") ||
    title.includes("inbox") ||
    title.includes("message")
  );
}

function truncateNotifPreview(text: string, maxLen = 140) {
  const single = text.replace(/\s+/g, " ").trim();
  if (!single) return "";
  if (single.length <= maxLen) return single;
  return `${single.slice(0, maxLen).trimEnd()}…`;
}

function resolveNotifMessage(
  notif: SystemNotification,
  studentName: string,
  platformConfig: PlatformConfig,
) {
  const stored = (notif.message || "").trim();
  const title = `${notif.title || ""} ${stored}`.toLowerCase();
  const isWelcome = title.includes("welcome") || title.includes("excited to help");
  if (!isWelcome) return stored;

  const template = (
    platformConfig.welcomeTemplateStudent ||
    "Welcome {{student_name}} to Dental CRM! We are excited to help you prepare for your applications."
  ).trim();

  const full = template
    .replace(/\{\{\s*student_name\s*\}\}/g, studentName)
    .replace(/\{\{\s*name\s*\}\}/g, studentName)
    .trim();

  // Older welcome notifications were stored truncated at 80 chars — prefer the full template.
  if (!stored || stored.length < full.length || full.startsWith(stored)) {
    return full;
  }
  return stored;
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
  onOpenNotification,
  onToggleActionItem,
  onAddActionItem,
  onDeleteActionItem,
  onTakeSurvey,
  onUpdateApplications,
  nextMeeting,
  upcomingWebinar,
  platformConfig,
  strengthPercentile = null,
}) => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState("");
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDueDate, setNewTaskDueDate] = React.useState(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [selectedBadge, setSelectedBadge] = React.useState<{
    id?: string;
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    earnedAt?: string;
  } | null>(null);

  const resetAddTaskForm = () => {
    setIsAddingTask(false);
    setNewTaskTitle("");
    setNewTaskDueDate(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  };

  const handleSaveOwnTask = () => {
    if (!onAddActionItem || !newTaskTitle.trim() || !newTaskDueDate) return;
    const [y, m, d] = newTaskDueDate.split("-").map(Number);
    const due = new Date(y, m - 1, d, 12, 0, 0);
    onAddActionItem(newTaskTitle.trim(), due.toISOString());
    resetAddTaskForm();
  };

  const mentorId =
    student.mentorId ||
    student.profile?.mentor_id ||
    nextMeeting?.mentorId ||
    nextMeeting?.mentor_id ||
    "";
  const { data: mentor } = useMentor(mentorId);
  const nextTask = studentTasks.find((t) => t.status !== "COMPLETED") || studentTasks[0];

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

  const formatMeetingDate = (dateStr: string) => formatMeetingLocal(dateStr);

  const { data: readinessExperiences = [] } = useExperiences(student.id);
  const { data: readinessCredentials = [] } = useStudentCredentials(student.id);
  const { data: readinessLorRaw = [] } = useLorRequests();
  const readinessLor = React.useMemo(
    () => readinessLorRaw.filter((r) => r.studentId === student.id),
    [readinessLorRaw, student.id],
  );
  const readinessSummary = React.useMemo(
    () =>
      buildApplicationReadiness({
        student,
        experiences: readinessExperiences,
        lorRequests: readinessLor,
        credentials: readinessCredentials,
      }),
    [student, readinessExperiences, readinessLor, readinessCredentials],
  );

  /** Needs attention: only meetings starting within the next 24h (or up to 1h overdue). */
  const isWithinNext24Hours = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    if (Number.isNaN(t)) return false;
    const now = Date.now();
    return t >= now - 60 * 60 * 1000 && t <= now + 24 * 60 * 60 * 1000;
  };
  const attentionMeeting =
    nextMeeting && isWithinNext24Hours(nextMeeting.date) ? nextMeeting : undefined;
  const attentionWebinar =
    upcomingWebinar && isWithinNext24Hours(upcomingWebinar.date)
      ? upcomingWebinar
      : undefined;

  const openMeetingLink = (meeting?: Meeting, emptyMessage?: string) => {
    const link = meeting?.link;
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error(emptyMessage || "No meeting link yet. Ask your mentor to add one.");
  };

  const handleJoinMeeting = () => {
    openMeetingLink(nextMeeting);
  };

  const handleJoinWebinar = () => {
    openMeetingLink(upcomingWebinar, "No webinar link yet. Check back closer to the start time.");
  };

  const handleRescheduleClick = () => {
    if (!mentorId) {
      toast.error("No mentor assigned yet.");
      return;
    }
    setChatMessage(
      `Hi ${mentor?.name || "Mentor"}, I'm so sorry but I need to reschedule our meeting.`,
    );
    setIsChatOpen(true);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    if (!mentorId) {
      toast.error("No mentor assigned yet.");
      return;
    }
    try {
      await Promise.resolve(onSendMessage(chatMessage, mentorId));
      setIsChatOpen(false);
      setChatMessage("");
      toast.success("Message sent");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to send message";
      toast.error(message || "Failed to send message");
    }
  };

  const progress = readinessSummary.percent;
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
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return [...notifications]
      .filter((n) => {
        const created = new Date(notifCreatedAt(n)).getTime();
        return Number.isFinite(created) && created >= cutoff;
      })
      .sort((a, b) => {
        const aUnread = a.is_read ? 0 : 1;
        const bUnread = b.is_read ? 0 : 1;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(notifCreatedAt(b)).getTime() - new Date(notifCreatedAt(a)).getTime();
      })
      .slice(0, 5);
  }, [notifications]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
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

      {(attentionMeeting || attentionWebinar || surveys.length > 0) && (
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Needs attention
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attentionMeeting && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-500 bg-indigo-600 p-4 shadow-lg shadow-indigo-600/20 animate-in slide-in-from-top-4 duration-500">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-white">
                      Next Meeting: {attentionMeeting.title || "Mentorship Session"}
                    </h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">
                      <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
                        <MeetingTimeWithHint dateIso={attentionMeeting.date} />
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleJoinMeeting}
                  className="shrink-0 rounded-xl bg-white/10 p-2 text-white transition-all hover:bg-white/20"
                  aria-label="Join meeting"
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
              </div>
            )}
            {attentionWebinar && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-cyan-500/40 bg-cyan-950/50 p-4 shadow-lg shadow-cyan-950/30 animate-in slide-in-from-top-4 duration-500">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-200">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300/70">
                      Upcoming webinar
                    </p>
                    <h4 className="truncate text-sm font-bold text-white">
                      {attentionWebinar.title || "Webinar"}
                    </h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-100/80">
                      {formatMeetingDate(attentionWebinar.date)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleJoinWebinar}
                  className="shrink-0 rounded-xl bg-cyan-500/20 p-2 text-cyan-100 transition-all hover:bg-cyan-500/35"
                  aria-label="Join webinar"
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
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
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Recent updates
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Latest messages, meetings, and system notes
              </p>
            </div>
            {recentUpdates.some((n) => !n.is_read) && (
              <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                {recentUpdates.filter((n) => !n.is_read).length} new
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            {recentUpdates.map((notif, index) => {
              const visual = notifVisual(notif);
              const Icon = visual.icon;
              const when = formatRelativeTime(notifCreatedAt(notif));
              const title = cleanNotifTitle(notif.title);
              const fullMessage = resolveNotifMessage(
                notif,
                student.name,
                platformConfig,
              );
              const preview = truncateNotifPreview(fullMessage);
              const inbox = isInboxNotification(notif);
              const openInbox = inbox && Boolean(onOpenNotification);

              const rowClass = `flex w-full gap-3 px-4 py-4 text-left transition-colors ${
                index > 0 ? "border-t border-slate-800/80" : ""
              } ${
                !notif.is_read ? "bg-slate-900/70" : "hover:bg-slate-900/50"
              } ${openInbox ? "cursor-pointer hover:bg-slate-900/80" : ""}`;

              const body = (
                <>
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${visual.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="text-sm font-semibold text-white">{title}</h4>
                      {!notif.is_read && (
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                          New
                        </span>
                      )}
                      {when && (
                        <span className="text-[11px] text-slate-500 sm:ml-auto">
                          {when}
                        </span>
                      )}
                    </div>

                    {preview && (
                      <p className="mt-1.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-300">
                        {preview}
                      </p>
                    )}
                  </div>

                  {openInbox && (
                    <span
                      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300"
                      aria-hidden
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </>
              );

              if (openInbox) {
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => onOpenNotification?.(notif)}
                    className={rowClass}
                  >
                    {body}
                  </button>
                );
              }

              return (
                <div key={notif.id} className={rowClass}>
                  {body}
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

      <div className="grid items-stretch gap-6 md:grid-cols-3">
        <div className="flex h-full min-h-0 flex-col gap-6 md:col-span-2">
          <section className="shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Application Readiness</h3>
              <span className="text-2xl font-bold text-indigo-500">{progress}%</span>
            </div>
            <div className="mb-5 h-2 w-full overflow-hidden rounded-full border border-slate-800/30 bg-slate-950">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Strength Score",
                  value: student.strengthScore ?? student.profile?.strength_score ?? "—",
                  icon: <Target className="h-5 w-5 text-indigo-400" />,
                  tone: "bg-indigo-500/10 border-indigo-500/20",
                },
                {
                  label: "DAT",
                  value: student.datScore ?? student.profile?.dat_score ?? "—",
                  icon: <CheckCircle className="h-5 w-5 text-emerald-400" />,
                  tone: "bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  label: "Days Left",
                  value: daysLeft,
                  icon: <Calendar className="h-5 w-5 text-amber-400" />,
                  tone: "bg-amber-500/10 border-amber-500/20",
                },
                {
                  label: "Apps",
                  value: (student.lorRequired || 0) + 4,
                  icon: <FileText className="h-5 w-5 text-rose-400" />,
                  tone: "bg-rose-500/10 border-rose-500/20",
                },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center">
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full border ${stat.tone}`}
                  >
                    {stat.icon}
                  </div>
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 sm:items-stretch">
            <div className="flex h-full max-h-[280px] min-h-[180px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Award className="h-4 w-4 text-amber-400" /> Milestone Badges
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {earnedBadges.length} Earned
                </span>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 custom-scrollbar">
                {earnedBadges.map((badge) =>
                  badge ? (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => setSelectedBadge(badge)}
                      className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center transition-all hover:border-indigo-500/40"
                    >
                      <div
                        className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 transition-transform group-hover:scale-105 ${badge.color || ""}`}
                      >
                        {renderBadgeIcon(badge.icon, "w-5 h-5")}
                      </div>
                      <p className="mb-0.5 truncate text-xs font-semibold text-white">{badge.name}</p>
                      <p className="text-[9px] font-bold uppercase text-slate-500">
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
                  <div className="col-span-full flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center">
                    <p className="text-sm text-slate-500">No badges earned yet. Keep pushing!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-full max-h-[280px] min-h-[180px] flex-col overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-900 p-5">
              <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">
                    Global event
                  </p>
                  {upcomingWebinar ? (
                    <>
                      <h4 className="mt-1 truncate text-base font-bold text-white">
                        {upcomingWebinar.title || "Webinar"}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatMeetingDate(upcomingWebinar.date)}
                      </p>
                    </>
                  ) : (
                    <h4 className="mt-1 text-base font-bold text-white">No upcoming webinars</h4>
                  )}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                  <Globe className="h-5 w-5" />
                </div>
              </div>
              {upcomingWebinar ? (
                <button
                  type="button"
                  onClick={handleJoinWebinar}
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-600/30 py-3 text-sm font-bold text-cyan-50 transition-all hover:bg-cyan-600/50"
                >
                  <Play className="h-4 w-4 fill-current" /> Join webinar
                </button>
              ) : (
                <div className="mt-auto flex flex-1 items-end">
                  <p className="text-xs leading-relaxed text-slate-500">
                    Platform-wide sessions will show up here when scheduled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-full flex-1 flex-col rounded-[2rem] border border-indigo-500/20 bg-[#1E1B4B] p-6 shadow-2xl shadow-indigo-950/50 md:p-7">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/20">
                <Calendar className="h-6 w-6 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-bold leading-tight text-white">Next Meeting</h3>
                <p className="mt-0.5 truncate font-medium text-indigo-200/60">
                  With {mentor?.name || "Your Mentor"}
                </p>
              </div>
            </div>

            <div className="mb-5 flex flex-1 flex-col justify-center rounded-3xl border border-indigo-400/20 bg-[#2D2D7D]/40 p-5 text-center backdrop-blur-sm">
              {nextMeeting ? (
                <>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/60">
                    {new Date(nextMeeting.date).toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
                  </p>
                  <p className="flex items-center justify-center gap-2 text-xl font-black text-white md:text-2xl">
                    <MeetingTimeWithHint
                      dateIso={nextMeeting.date}
                      options={{
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      }}
                    />
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-300/40">
                    Your local time
                  </p>
                </>
              ) : (
                <p className="font-medium italic text-indigo-300/60">No meeting scheduled</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleJoinMeeting}
              disabled={!nextMeeting}
              className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-black text-indigo-900 shadow-lg shadow-white/10 transition-all hover:bg-indigo-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Video className="h-5 w-5" /> Join Meeting
            </button>
            <button
              type="button"
              onClick={handleRescheduleClick}
              disabled={!nextMeeting}
              className="w-full rounded-2xl border border-indigo-400/20 bg-indigo-600/50 py-3.5 font-black text-white transition-all hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reschedule
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <ApplicationReadinessPanel
          student={student}
          compact
          className="h-[520px] min-h-0"
        />

        <section
          id="active-checklist"
          className="flex h-[520px] min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900 p-5"
        >
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" /> Active Checklist
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {studentTasks.filter((t) => t.status === "COMPLETED").length} / {studentTasks.length}{" "}
                Done
              </span>
              {onAddActionItem && (
                <Button
                  type="button"
                  size="icon"
                  variant={isAddingTask ? "danger" : "secondary"}
                  className="h-8 w-8"
                  onClick={() => {
                    if (isAddingTask) resetAddTaskForm();
                    else setIsAddingTask(true);
                  }}
                  aria-label={isAddingTask ? "Cancel" : "Add task"}
                  title={isAddingTask ? "Cancel" : "Add task"}
                >
                  {isAddingTask ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          {isAddingTask && onAddActionItem && (
            <div className="mb-4 shrink-0 space-y-3 rounded-xl border border-indigo-500/30 bg-slate-950 p-3">
              <Input
                placeholder="Task title…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveOwnTask();
                  }
                }}
              />
              <DatePicker value={newTaskDueDate} onChange={setNewTaskDueDate} />
              <Button
                size="sm"
                className="w-full"
                disabled={!newTaskTitle.trim() || !newTaskDueDate}
                onClick={handleSaveOwnTask}
              >
                Add task
              </Button>
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
            {sortChecklistTasks(studentTasks).map((item) => (
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
                {onDeleteActionItem && (
                  <button
                    type="button"
                    onClick={() => onDeleteActionItem(item.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                    aria-label={`Delete task ${item.task}`}
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {studentTasks.length === 0 && !isAddingTask && (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-center">
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
        <h3 className="mb-4 text-base font-bold text-white">Resources</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
