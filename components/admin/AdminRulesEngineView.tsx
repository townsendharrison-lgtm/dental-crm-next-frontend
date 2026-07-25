"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  MessageSquare,
  Sparkles,
  Shield,
  Save,
  Mail,
  Clock,
  AlertCircle,
  Loader2,
  Megaphone,
  Wrench,
  Calendar,
  Target,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminSettingsApi,
  DEFAULT_MEETING_TYPES,
  normalizeMeetingTypes,
} from "@/lib/api/adminSettings";
import type { AdminSettings, MeetingTypeConfig } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import AdminBenchmarksPanel from "@/components/admin/AdminBenchmarksPanel";

type RulesTab =
  | "platform"
  | "auto-reply"
  | "welcome"
  | "status"
  | "meetings"
  | "benchmarks"
  | "tools";

const RULES_TABS: RulesTab[] = [
  "platform",
  "auto-reply",
  "welcome",
  "status",
  "meetings",
  "benchmarks",
  "tools",
];

function newMeetingTypeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `type-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Toggle({
  checked,
  onChange,
  activeClass = "bg-indigo-600",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer",
        checked ? activeClass : "bg-slate-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminRulesEngineView() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<RulesTab>(
    RULES_TABS.includes(initialTab as RulesTab) ? (initialTab as RulesTab) : "platform",
  );

  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [inactivityMinutes, setInactivityMinutes] = useState(120);
  const [rateLimitMinutes, setRateLimitMinutes] = useState(1440);
  const [welcomeTemplateStudent, setWelcomeTemplateStudent] = useState("");
  const [welcomeTemplateMentor, setWelcomeTemplateMentor] = useState("");
  const [welcomeTemplateAssignment, setWelcomeTemplateAssignment] = useState("");
  const [acceptedMessage, setAcceptedMessage] = useState("");
  const [interviewMessage, setInterviewMessage] = useState("");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeConfig[]>(DEFAULT_MEETING_TYPES);

  useEffect(() => {
    const next = searchParams.get("tab");
    if (RULES_TABS.includes(next as RulesTab)) {
      setTab(next as RulesTab);
    }
  }, [searchParams]);

  const applySettings = (data: AdminSettings) => {
    setSettings(data);
    setPlatformName(data.platform_name || "");
    setSupportEmail(data.support_email || "");
    setMaintenanceMode(!!data.maintenance_mode);
    setAutoReplyEnabled(!!data.auto_reply_enabled);
    setAutoReplyMessage(data.auto_reply_message || "");
    setInactivityMinutes(data.auto_reply_inactivity_minutes ?? 120);
    setRateLimitMinutes(data.auto_reply_rate_limit_minutes ?? 1440);
    setWelcomeTemplateStudent(data.welcome_template_student || "");
    setWelcomeTemplateMentor(data.welcome_template_mentor || "");
    setWelcomeTemplateAssignment(data.welcome_template_assignment || "");
    setAcceptedMessage(data.accepted_message || "");
    setInterviewMessage(data.interview_message || "");
    setWaitlistMessage(data.waitlist_message || "");
    setMeetingTypes(normalizeMeetingTypes(data.meeting_types));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const data = await adminSettingsApi.get();
        applySettings(data);
      } catch (err) {
        console.error("Failed to load rules:", err);
        toast.error("Could not load rules engine settings.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const savedMeetingTypesKey = useMemo(
    () => JSON.stringify(normalizeMeetingTypes(settings?.meeting_types)),
    [settings?.meeting_types],
  );
  const meetingTypesKey = useMemo(() => JSON.stringify(meetingTypes), [meetingTypes]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      platformName !== (settings.platform_name || "") ||
      supportEmail !== (settings.support_email || "") ||
      maintenanceMode !== !!settings.maintenance_mode ||
      autoReplyEnabled !== !!settings.auto_reply_enabled ||
      autoReplyMessage !== (settings.auto_reply_message || "") ||
      inactivityMinutes !== (settings.auto_reply_inactivity_minutes ?? 120) ||
      rateLimitMinutes !== (settings.auto_reply_rate_limit_minutes ?? 1440) ||
      welcomeTemplateStudent !== (settings.welcome_template_student || "") ||
      welcomeTemplateMentor !== (settings.welcome_template_mentor || "") ||
      welcomeTemplateAssignment !== (settings.welcome_template_assignment || "") ||
      acceptedMessage !== (settings.accepted_message || "") ||
      interviewMessage !== (settings.interview_message || "") ||
      waitlistMessage !== (settings.waitlist_message || "") ||
      meetingTypesKey !== savedMeetingTypesKey
    );
  }, [
    settings,
    platformName,
    supportEmail,
    maintenanceMode,
    autoReplyEnabled,
    autoReplyMessage,
    inactivityMinutes,
    rateLimitMinutes,
    welcomeTemplateStudent,
    welcomeTemplateMentor,
    welcomeTemplateAssignment,
    acceptedMessage,
    interviewMessage,
    waitlistMessage,
    meetingTypesKey,
    savedMeetingTypesKey,
  ]);

  const handleSave = async () => {
    if (!isDirty || saving) return;
    const cleanedTypes = meetingTypes
      .map((row) => ({
        id: row.id || newMeetingTypeId(),
        label: row.label.trim(),
        summaryTemplate: row.summaryTemplate.trim(),
      }))
      .filter((row) => row.label);
    if (cleanedTypes.length === 0) {
      toast.error("Add at least one meeting type before saving.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adminSettingsApi.update({
        platformName,
        supportEmail,
        maintenanceMode,
        autoReplyEnabled,
        autoReplyMessage,
        autoReplyInactivityMinutes: inactivityMinutes,
        autoReplyRateLimitMinutes: rateLimitMinutes,
        welcomeTemplateStudent,
        welcomeTemplateMentor,
        welcomeTemplateAssignment,
        acceptedMessage,
        interviewMessage,
        waitlistMessage,
        meetingTypes: cleanedTypes,
      });
      applySettings(updated);
      toast.success("Rules saved.");
    } catch (err: unknown) {
      console.error("Save rules error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save rules.");
    } finally {
      setSaving(false);
    }
  };

  usePageHeaderAction({
    label: saving ? "Saving…" : "Save changes",
    icon: <Save className="w-4 h-4" />,
    onClick: handleSave,
    disabled: tab === "benchmarks" || !isDirty || saving,
  });

  const handleResetReminders = async () => {
    if (resetting) return;
    if (
      !confirm(
        "Reset the 5-day profile reminder tracker for all students and send completion notifications?",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const result = await adminSettingsApi.resetProfileReminders();
      toast.success(result.message || "Profile reminder timers reset.");
    } catch (err: unknown) {
      console.error("Reset reminders error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to reset reminders.");
    } finally {
      setResetting(false);
    }
  };

  const tabs: { id: RulesTab; label: string; icon: React.ElementType }[] = [
    { id: "platform", label: "Platform", icon: Settings },
    { id: "auto-reply", label: "Auto-Reply", icon: MessageSquare },
    { id: "welcome", label: "Welcome", icon: Sparkles },
    { id: "status", label: "Status Messages", icon: Megaphone },
    { id: "meetings", label: "Meeting Types", icon: Calendar },
    { id: "benchmarks", label: "Benchmarks", icon: Target },
    { id: "tools", label: "Dev Tools", icon: Wrench },
  ];

  const updateMeetingType = (id: string, patch: Partial<MeetingTypeConfig>) => {
    setMeetingTypes((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const removeMeetingType = (id: string) => {
    setMeetingTypes((prev) => {
      if (prev.length <= 1) {
        toast.error("Keep at least one meeting type.");
        return prev;
      }
      return prev.filter((row) => row.id !== id);
    });
  };

  const addMeetingType = () => {
    setMeetingTypes((prev) => [
      ...prev,
      {
        id: newMeetingTypeId(),
        label: "New meeting type",
        summaryTemplate: "Hi {name}, thanks for our meeting today.",
      },
    ]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Loading rules…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-sm text-slate-400">Rules could not be loaded.</p>
        <Button className="mt-4" variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max sm:min-w-0 items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          {tabs.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "platform" && (
        <SectionCard
          icon={Settings}
          iconClass="bg-indigo-600/15 text-indigo-400"
          title="Platform settings"
          subtitle="Identity and operational mode"
        >
          <FormField label="Platform name">
            <Input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Dental CRM"
            />
          </FormField>

          <FormField label="Support email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="pl-9"
                placeholder="support@example.com"
              />
            </div>
          </FormField>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Maintenance mode</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Blocks write API calls for non-admin users while the platform is under maintenance.
              </p>
            </div>
            <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} activeClass="bg-amber-500" />
          </div>
        </SectionCard>
      )}

      {tab === "auto-reply" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            icon={MessageSquare}
            iconClass="bg-emerald-600/15 text-emerald-400"
            title="Auto-reply automation"
            subtitle="Rule-based mentor acknowledgements"
          >
            <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Enable auto-reply</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Automatically acknowledge student DMs when mentors are inactive.
                </p>
              </div>
              <Toggle checked={autoReplyEnabled} onChange={setAutoReplyEnabled} />
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  Inactivity threshold
                </div>
                <span className="text-sm font-semibold text-white">{inactivityMinutes} min</span>
              </div>
              <input
                type="range"
                min={15}
                max={480}
                step={15}
                value={inactivityMinutes}
                disabled={!autoReplyEnabled}
                onChange={(e) => setInactivityMinutes(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-slate-600 uppercase tracking-wide">
                <span>15 min</span>
                <span>8 hours</span>
              </div>
              <p className="text-xs text-slate-500">
                Only auto-reply if the mentor has not sent a message within this window.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Shield className="w-3.5 h-3.5" />
                  Rate limiting
                </div>
                <span className="text-sm font-semibold text-white">
                  {Math.round(rateLimitMinutes / 60)} hr
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={2880}
                step={60}
                value={rateLimitMinutes}
                disabled={!autoReplyEnabled}
                onChange={(e) => setRateLimitMinutes(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-slate-600 uppercase tracking-wide">
                <span>1 hour</span>
                <span>48 hours</span>
              </div>
              <p className="text-xs text-slate-500">
                Maximum one matching auto-reply per conversation inside this window.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={Save}
            iconClass="bg-indigo-600/15 text-indigo-400"
            title="Message template"
            subtitle="Text sent as the auto-reply"
          >
            <Textarea
              value={autoReplyMessage}
              onChange={(e) => setAutoReplyMessage(e.target.value)}
              className="min-h-[220px] resize-y"
              disabled={!autoReplyEnabled}
              placeholder="Thanks for your message — an advisor will get back to you shortly."
            />
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Sent automatically from the advisor&apos;s account when a student messages and the
                inactivity / rate-limit rules above are met.
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "welcome" && (
        <div className="space-y-6">
          <SectionCard
            icon={Sparkles}
            iconClass="bg-violet-600/15 text-violet-400"
            title="Platform welcome templates"
            subtitle="First inbox message from admin when a student or mentor signs up"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Student signup welcome">
                <Textarea
                  value={welcomeTemplateStudent}
                  onChange={(e) => setWelcomeTemplateStudent(e.target.value)}
                  className="min-h-[180px] resize-y"
                  placeholder="Welcome {{student_name}}…"
                />
              </FormField>
              <FormField label="Mentor signup welcome">
                <Textarea
                  value={welcomeTemplateMentor}
                  onChange={(e) => setWelcomeTemplateMentor(e.target.value)}
                  className="min-h-[180px] resize-y"
                  placeholder="Welcome {{mentor_name}}…"
                />
              </FormField>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Placeholders: <code className="text-slate-300">{"{{student_name}}"}</code>,{" "}
                <code className="text-slate-300">{"{{mentor_name}}"}</code>,{" "}
                <code className="text-slate-300">{"{{name}}"}</code>
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={Sparkles}
            iconClass="bg-indigo-600/15 text-indigo-400"
            title="Mentor → student assignment welcome"
            subtitle="Preset DM sent from the mentor when they accept a student assignment. Mentors can edit this text in the Accept modal before sending."
          >
            <FormField label="Assignment welcome message">
              <Textarea
                value={welcomeTemplateAssignment}
                onChange={(e) => setWelcomeTemplateAssignment(e.target.value)}
                className="min-h-[240px] resize-y"
                placeholder="Hi [Mentee Name],…"
              />
            </FormField>
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Placeholders: <code className="text-slate-300">[Mentee Name]</code>,{" "}
                <code className="text-slate-300">[Mentor Name]</code>,{" "}
                <code className="text-slate-300">[Meeting Times]</code>,{" "}
                <code className="text-slate-300">[Timezone]</code>
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "status" && (
        <SectionCard
          icon={Megaphone}
          iconClass="bg-emerald-600/15 text-emerald-400"
          title="Application status messages"
          subtitle="Shown to students when application status changes"
        >
          <FormField label="Accepted status message">
            <Textarea
              value={acceptedMessage}
              onChange={(e) => setAcceptedMessage(e.target.value)}
              className="min-h-[100px] resize-y"
              placeholder="Congratulations on your acceptance…"
            />
          </FormField>
          <FormField label="Interviewed status message">
            <Textarea
              value={interviewMessage}
              onChange={(e) => setInterviewMessage(e.target.value)}
              className="min-h-[100px] resize-y"
              placeholder="You've secured an interview…"
            />
          </FormField>
          <FormField label="Waitlisted status message">
            <Textarea
              value={waitlistMessage}
              onChange={(e) => setWaitlistMessage(e.target.value)}
              className="min-h-[100px] resize-y"
              placeholder="You're still in the running…"
            />
          </FormField>
        </SectionCard>
      )}

      {tab === "meetings" && (
        <SectionCard
          icon={Calendar}
          iconClass="bg-indigo-600/15 text-indigo-400"
          title="Meeting types & summary presets"
          subtitle="Options mentors see when completing a session, plus the DM preset for each type"
        >
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Placeholders: <code className="text-slate-300">{"{name}"}</code> (student first name),{" "}
              <code className="text-slate-300">{"{notes}"}</code> (meeting notes). Student action
              items are appended automatically when the mentor completes the meeting. Keep a type
              labeled <code className="text-slate-300">Other</code> if you want the free-text custom
              type field.
            </p>
          </div>

          <div className="space-y-4">
            {meetingTypes.map((row, index) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeMeetingType(row.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
                <FormField label="Meeting type label">
                  <Input
                    value={row.label}
                    onChange={(e) => updateMeetingType(row.id, { label: e.target.value })}
                    placeholder="DAT Strategy & Planning"
                  />
                </FormField>
                <FormField label="Summary message preset">
                  <Textarea
                    value={row.summaryTemplate}
                    onChange={(e) =>
                      updateMeetingType(row.id, { summaryTemplate: e.target.value })
                    }
                    className="min-h-[120px] resize-y"
                    placeholder="Hi {name}, great work on our session today…"
                  />
                </FormField>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={addMeetingType}
          >
            Add meeting type
          </Button>
        </SectionCard>
      )}

      {tab === "benchmarks" && <AdminBenchmarksPanel />}

      {tab === "tools" && (
        <SectionCard
          icon={Wrench}
          iconClass="bg-amber-600/15 text-amber-400"
          title="Developer testing tools"
          subtitle="Verify reminder and automation behaviors"
        >
          <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <h4 className="text-sm font-medium text-white">Profile reminder simulation</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Clears the 5-day incomplete-profile reminder tracker for all students and sends a fresh completion
                notification so you can verify the reminder flow.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleResetReminders}
              disabled={resetting}
              isLoading={resetting}
              className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              Simulate 5-day gap
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
