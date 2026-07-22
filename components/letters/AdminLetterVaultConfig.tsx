"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { LOREmailConfig } from "@/lib/types";
import { useUpdateLorConfig, useSendLorTestEmail } from "@/lib/hooks/useLor";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";
import {
  Settings,
  Mail,
  Palette,
  FileText,
  Save,
  Clock,
  Plus,
  X,
  Eye,
  Image as ImageIcon,
  Send,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

interface AdminLetterVaultConfigProps {
  config: LOREmailConfig;
  onSave?: (config: LOREmailConfig) => void;
}

export const AdminLetterVaultConfig: React.FC<AdminLetterVaultConfigProps> = ({ config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<LOREmailConfig>({
    ...config,
    reminderSchedule: Array.isArray(config.reminderSchedule) ? config.reminderSchedule : [],
  });
  const [activeTab, setActiveTab] = useState<"design" | "content" | "reminders">("design");
  const [newReminder, setNewReminder] = useState<string>("");
  const [newReminderTarget, setNewReminderTarget] = useState<"writer" | "requester">("writer");
  const [testEmail, setTestEmail] = useState("");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Sync prop changes to state
  useEffect(() => {
    if (config) {
      setLocalConfig({
        ...config,
        reminderSchedule: Array.isArray(config.reminderSchedule) ? config.reminderSchedule : [],
      });
    }
  }, [config]);

  // Preview date — 14 days out
  const previewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }, []);

  const updateConfigMutation = useUpdateLorConfig();
  const sendTestEmailMutation = useSendLorTestEmail();

  const handleSave = async () => {
    try {
      await updateConfigMutation.mutateAsync({
        design: localConfig.design,
        content: localConfig.content,
        reminderSchedule: localConfig.reminderSchedule,
      });
      toast.success("Configuration changes saved successfully!");
      if (onSave) onSave(localConfig);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save configuration.");
    }
  };

  usePageHeaderAction({
    label: updateConfigMutation.isPending ? "Saving…" : "Save changes",
    icon: <Save className="w-4 h-4" />,
    onClick: handleSave,
    disabled: updateConfigMutation.isPending,
  });

  const handleSendTest = async () => {
    if (!testEmail) return;
    try {
      const res = await sendTestEmailMutation.mutateAsync(testEmail);
      if (res.success) {
        toast.success(res.message || "Test email sent!");
      } else {
        toast.error(res.message || "Failed to send test email.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test email.");
    }
  };

  const handleCopyVar = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedVar(key);
      toast.success(`Copied ${key} variable`);
      setTimeout(() => setCopiedVar(null), 1500);
    } catch {
      toast.error("Failed to copy variable.");
    }
  };

  const addReminder = () => {
    const val = parseInt(newReminder);
    if (!isNaN(val)) {
      const schedule = Array.isArray(localConfig.reminderSchedule) ? localConfig.reminderSchedule : [];
      const exists = schedule.some((r: any) => r.days === val && r.target === newReminderTarget);
      if (!exists) {
        setLocalConfig({
          ...localConfig,
          reminderSchedule: [...schedule, { days: val, target: newReminderTarget }].sort(
            (a, b) => a.days - b.days || (a.target === "writer" ? -1 : 1)
          ),
        });
        setNewReminder("");
      }
    }
  };

  const removeReminder = (days: number, target: string) => {
    const schedule = Array.isArray(localConfig.reminderSchedule) ? localConfig.reminderSchedule : [];
    setLocalConfig({
      ...localConfig,
      reminderSchedule: schedule.filter((r: any) => !(r.days === days && r.target === target)),
    });
  };

  const normalizedSchedule = useMemo(() => {
    return (Array.isArray(localConfig.reminderSchedule) ? localConfig.reminderSchedule : []).map(
      (entry: any) => {
        if (typeof entry === "number") return { days: entry, target: "writer" as const };
        return { days: entry.days ?? 0, target: entry.target || "writer" };
      }
    );
  }, [localConfig.reminderSchedule]);

  const tabs: Array<{ id: "design" | "content" | "reminders"; label: string; icon: React.ElementType }> = [
    { id: "design", label: "Design", icon: Palette },
    { id: "content", label: "Content", icon: FileText },
    { id: "reminders", label: "Reminders", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Title & description shown only on mobile */}
      <div className="lg:hidden">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-400" />
          Letter Vault Configuration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize the email design, content, and automated reminder schedule for letter requests.
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max sm:min-w-0 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-5 gap-6 lg:items-start">
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "design" && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 text-[9px]">
                    <Palette className="w-4 h-4 text-indigo-400" /> Primary Brand Color
                  </label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="color"
                      value={localConfig.design?.primaryColor || "#4f46e5"}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          design: { ...localConfig.design, primaryColor: e.target.value },
                        })
                      }
                      className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localConfig.design?.primaryColor || "#4f46e5"}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          design: { ...localConfig.design, primaryColor: e.target.value },
                        })
                      }
                      className="flex-1 font-mono bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 text-[9px]">
                    <ImageIcon className="w-4 h-4 text-indigo-400" /> Logo URL
                  </label>
                  <Input
                    type="text"
                    value={localConfig.design?.logoUrl || ""}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        design: { ...localConfig.design, logoUrl: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === "content" && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                  Email Subject Line
                </label>
                <Input
                  type="text"
                  value={localConfig.content?.subject || ""}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      content: { ...localConfig.content, subject: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                  Email Body Content
                </label>
                <Textarea
                  value={localConfig.content?.body || ""}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      content: { ...localConfig.content, body: e.target.value },
                    })
                  }
                  className="h-48 resize-none bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                  Letter Requirements
                </label>
                <Textarea
                  value={localConfig.content?.requirements || ""}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      content: { ...localConfig.content, requirements: e.target.value },
                    })
                  }
                  className="h-48 resize-none bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-800">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-indigo-400" /> Email Button Links
                </h4>
                <p className="text-sm text-slate-500">
                  These buttons appear in the email alongside the main &quot;Upload Letter&quot; button. Leave blank to hide.
                </p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Requirements PDF URL
                    </label>
                    <Input
                      type="url"
                      value={localConfig.content?.requirementsPdfUrl || ""}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          content: { ...localConfig.content, requirementsPdfUrl: e.target.value },
                        })
                      }
                      className="bg-slate-950 border-slate-800"
                      placeholder="https://example.com/requirements.pdf"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Example Letter PDF URL
                    </label>
                    <Input
                      type="url"
                      value={localConfig.content?.exampleLetterPdfUrl || ""}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          content: { ...localConfig.content, exampleLetterPdfUrl: e.target.value },
                        })
                      }
                      className="bg-slate-950 border-slate-800"
                      placeholder="https://example.com/example-letter.pdf"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "reminders" && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Automated Reminder Schedule</h3>
                <p className="text-sm text-slate-400">
                  Set when automated emails should be sent relative to the due date. Choose whether each reminder goes
                  to the <span className="text-indigo-400 font-bold">letter writer</span> or the{" "}
                  <span className="text-amber-400 font-bold">student (requester)</span>.
                </p>

                <div className="space-y-2">
                  {normalizedSchedule.map((entry, idx) => (
                    <div
                      key={`${entry.days}-${entry.target}-${idx}`}
                      className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl group hover:border-slate-700 transition-colors"
                    >
                      <span
                        className={`text-sm font-bold min-w-[160px] ${entry.days < 0
                          ? "text-amber-400"
                          : entry.days === 0
                            ? "text-indigo-400"
                            : "text-rose-400"
                          }`}
                      >
                        {entry.days === 0
                          ? "Due Date"
                          : `${Math.abs(entry.days)} Days ${entry.days < 0 ? "Before" : "After"}`}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border ${entry.target === "writer"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                      >
                        → {entry.target === "writer" ? "Letter Writer" : "Student"}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={() => removeReminder(entry.days, entry.target)}
                        className="p-1.5 hover:bg-slate-800 rounded-full text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {normalizedSchedule.length === 0 && (
                    <div className="p-8 text-center text-slate-500 bg-slate-950 border border-dashed border-slate-800 rounded-xl">
                      <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No reminders configured. Add one below.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      value={newReminder}
                      onChange={(e) => setNewReminder(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addReminder()}
                      placeholder="Days (e.g. -7, 0, 3)"
                      className="w-full sm:w-36 bg-slate-900 border border-slate-800"
                    />
                    <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                      <button
                        onClick={() => setNewReminderTarget("writer")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${newReminderTarget === "writer"
                          ? "bg-indigo-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-white"
                          }`}
                      >
                        Writer
                      </button>
                      <button
                        onClick={() => setNewReminderTarget("requester")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${newReminderTarget === "requester"
                          ? "bg-amber-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-white"
                          }`}
                      >
                        Student
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={addReminder}
                    disabled={!newReminder.trim() || isNaN(parseInt(newReminder))}
                    leftIcon={<Plus className="w-5 h-5" />}
                    className="cursor-pointer text-sm font-bold"
                  >
                    Add Reminder
                  </Button>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-800">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" /> Reminder Email Templates
                </h3>
                <p className="text-sm text-slate-400">
                  Select a preset draft or write your own. Use template variables like{" "}
                  <code className="text-indigo-400">{"{{writer_name}}"}</code>,{" "}
                  <code className="text-indigo-400">{"{{student_name}}"}</code>,{" "}
                  <code className="text-indigo-400">{"{{due_date}}"}</code>.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Writer reminder template */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500" />
                        <label className="text-sm font-bold text-slate-300">Writer Reminder Email</label>
                      </div>
                    </div>
                    <Select
                      onChange={(e) => {
                        if (e.target.value) {
                          setLocalConfig({
                            ...localConfig,
                            content: { ...localConfig.content, writerReminderBody: e.target.value },
                          });
                        }
                      }}
                      value=""
                      className="bg-slate-950 border-slate-800 text-xs text-slate-400 cursor-pointer h-10"
                    >
                      <option value="" disabled>📋 Load a preset draft…</option>
                      <option value={`Dear {{writer_name}},\n\nThis is a friendly reminder that the letter of recommendation you are writing for {{student_name}} is due on {{due_date}}.\n\nPlease upload your letter using the link below at your earliest convenience.\n\nThank you for your support!`}>
                        Friendly Reminder
                      </option>
                      <option value={`Dear {{writer_name}},\n\nWe wanted to follow up regarding the letter of recommendation for {{student_name}}. The deadline is {{due_date}}, and we have not yet received your submission.\n\nYour letter is a critical part of the student's application package. Please upload it as soon as possible using the secure link provided.\n\nThank you for your time and dedication.`}>
                        Formal Follow-Up
                      </option>
                      <option value={`Dear {{writer_name}},\n\nThis is an urgent reminder that the letter of recommendation for {{student_name}} is past due. The original deadline was {{due_date}}.\n\nThe student's application timeline depends on receiving your letter. Please submit it immediately using the upload link.\n\nIf you are unable to complete the letter, please reply to let us know so we can make alternative arrangements.\n\nThank you.`}>
                        Urgent / Overdue
                      </option>
                    </Select>
                    <Textarea
                      value={localConfig.content?.writerReminderBody || ""}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          content: { ...localConfig.content, writerReminderBody: e.target.value },
                        })
                      }
                      placeholder="Dear {{writer_name}},&#10;&#10;This is a reminder that the letter for {{student_name}} is due on {{due_date}}..."
                      className="h-44 resize-none bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  {/* Student reminder template */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <label className="text-sm font-bold text-slate-300">Student Reminder Email</label>
                      </div>
                    </div>
                    <Select
                      onChange={(e) => {
                        if (e.target.value) {
                          setLocalConfig({
                            ...localConfig,
                            content: { ...localConfig.content, requesterReminderBody: e.target.value },
                          });
                        }
                      }}
                      value=""
                      className="bg-slate-950 border-slate-800 text-xs text-slate-400 cursor-pointer h-10 focus-visible:ring-amber-500"
                    >
                      <option value="" disabled>📋 Load a preset draft…</option>
                      <option value={`Dear {{student_name}},\n\nThis is an update regarding your letter of recommendation from {{writer_name}}. The letter is due on {{due_date}} and has not yet been uploaded.\n\nWe are continuing to follow up with your letter writer. No action is needed from you at this time.\n\nWe'll notify you as soon as the letter is received.`}>
                        Status Update (No Action Needed)
                      </option>
                      <option value={`Dear {{student_name}},\n\nWe wanted to let you know that the letter of recommendation from {{writer_name}} has not been received yet. The deadline is {{due_date}}.\n\nYou may want to reach out to your letter writer directly to check on the status. You can share this deadline with them as a reminder.\n\nPlease let us know if you have any questions.`}>
                        Gentle Nudge to Follow Up
                      </option>
                      <option value={`Dear {{student_name}},\n\nThe letter of recommendation from {{writer_name}} is now overdue. The original deadline was {{due_date}}.\n\nWe strongly recommend contacting your letter writer directly to ensure timely submission. If the letter cannot be obtained, please consider arranging an alternative writer.\n\nPlease contact us if you need assistance.`}>
                        Overdue — Action Required
                      </option>
                    </Select>
                    <Textarea
                      value={localConfig.content?.requesterReminderBody || ""}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          content: { ...localConfig.content, requesterReminderBody: e.target.value },
                        })
                      }
                      placeholder="Dear {{student_name}},&#10;&#10;This is an update regarding your letter from {{writer_name}}. The letter is due on {{due_date}} and has not yet been uploaded..."
                      className="h-44 resize-none bg-slate-950 border-slate-800 text-xs focus-visible:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            <section className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-xl p-6">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" /> Template Variables
              </h3>
              <div className="space-y-1.5">
                {[
                  { key: "{{student_name}}", desc: "Student's name" },
                  { key: "{{writer_name}}", desc: "Writer's name" },
                  { key: "{{due_date}}", desc: "Due date" },
                  { key: "{{upload_link}}", desc: "Upload URL" },
                  { key: "{{access_code}}", desc: "Access ID" },
                ].map((v) => (
                  <div
                    key={v.key}
                    className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg group hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-[13px] text-indigo-400 font-bold">{v.key}</code>
                      <span className="text-[11px] text-slate-500 ml-2">{v.desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyVar(v.key)}
                      className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ml-2 transition-colors flex items-center gap-1 cursor-pointer ${copiedVar === v.key ? "text-emerald-400" : "text-slate-600 hover:text-indigo-400"
                        }`}
                    >
                      {copiedVar === v.key ? "Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-xl p-6 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" /> Send Test Email
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Preview in a real inbox. Test emails are marked as previews and won&apos;t create requests.
              </p>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-slate-950 border-slate-800"
              />
              <Button
                onClick={handleSendTest}
                isLoading={sendTestEmailMutation.isPending}
                disabled={!testEmail}
                leftIcon={<Send className="w-4 h-4" />}
                className="w-full bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 text-white text-sm font-bold cursor-pointer"
              >
                Send Test
              </Button>
            </section>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2 lg:sticky lg:top-4">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-hidden">
            <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" /> Live Preview
            </h3>

            <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#0f172a]">
              <div
                className="p-5 text-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${localConfig.design?.primaryColor || "#4f46e5"
                    }, ${localConfig.design?.primaryColor || "#4f46e5"}cc)`,
                }}
              >
                {localConfig.design?.logoUrl ? (
                  <img
                    src={localConfig.design.logoUrl}
                    alt="Logo"
                    className="h-5 object-contain mx-auto mb-2"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-[12px] font-bold mb-2">🦷 Dental School Guide</div>
                )}
                <h4 className="font-bold text-sm leading-snug">
                  {(localConfig.content?.subject || "")
                    .replace(/\{\{student_name\}\}/g, "Sarah Jenkins")
                    .replace(/\{\{writer_name\}\}/g, "Dr. Miller")
                    .replace(/\{\{due_date\}\}/g, previewDate)}
                </h4>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-sans">
                  {(localConfig.content?.body || "")
                    .replace(/\{\{student_name\}\}/g, "Sarah Jenkins")
                    .replace(/\{\{writer_name\}\}/g, "Dr. Miller")
                    .replace(/\{\{due_date\}\}/g, previewDate)
                    .replace(/\{\{upload_link\}\}/g, "#")
                    .replace(/\{\{access_code\}\}/g, "LOR-SA-DM-1234")}
                </div>

                {localConfig.content?.requirements && (
                  <div className="p-3 rounded-lg border border-slate-700 bg-[#1e293b]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      📋 Requirements
                    </div>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {localConfig.content.requirements}
                    </div>
                  </div>
                )}

                <div className="text-center pt-1">
                  <button
                    disabled
                    className="px-6 py-2 rounded-lg text-white font-bold text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${localConfig.design?.primaryColor || "#4f46e5"
                        }, ${localConfig.design?.primaryColor || "#4f46e5"}cc)`,
                    }}
                  >
                    📤 Upload Your Letter
                  </button>
                </div>

                {(localConfig.content?.requirementsPdfUrl || localConfig.content?.exampleLetterPdfUrl) && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {localConfig.content.requirementsPdfUrl && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold text-slate-400 border border-slate-700 bg-[#1e293b]">
                        📄 Requirements
                      </span>
                    )}
                    {localConfig.content.exampleLetterPdfUrl && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold text-slate-400 border border-slate-700 bg-[#1e293b]">
                        📝 Example
                      </span>
                    )}
                  </div>
                )}

                <div className="text-center p-2 rounded-lg border border-slate-700 bg-[#1e293b]">
                  <span className="text-[10px] text-slate-500">
                    Due: <strong className="text-slate-400">{previewDate}</strong> · Code:{" "}
                    <strong className="text-slate-400">LOR-SA-DM-1234</strong>
                  </span>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-slate-800 text-center">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                  Powered by Dental School Guide
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminLetterVaultConfig;
