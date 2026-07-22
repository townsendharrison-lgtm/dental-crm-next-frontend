"use client";

import React, { useState } from "react";
import {
  Plus,
  Send,
  BarChart3,
  AlertCircle,
  Info,
  Users,
  MessageSquare,
  Trash2,
  Clock,
  X,
} from "lucide-react";
import type {
  UserRole,
  Survey,
  SystemNotification,
  SurveyResponse,
  SurveyQuestion,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import SurveyInsightsModal from "./SurveyInsightsModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface SurveyManagementViewProps {
  role: UserRole;
  currentUserId: string;
  surveys: Survey[];
  notifications: SystemNotification[];
  responses: SurveyResponse[];
  onAddSurvey: (survey: Partial<Survey>) => void;
  onAddNotification: (notification: Partial<SystemNotification>) => void;
  onDeleteSurvey: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  hideHeader?: boolean;
}

function surveyTargetLabel(s: Survey) {
  const target = s.targetRole || s.target_role || "BOTH";
  if (target === "BOTH") return "Everyone";
  if (target === "STUDENT") return "Students";
  if (target === "MENTOR") return "Mentors";
  return target;
}

function surveyStatus(s: Survey) {
  if (s.status) return s.status;
  return s.is_active === false ? "INACTIVE" : "ACTIVE";
}

function notifTargetLabel(n: SystemNotification) {
  const target = n.targetRole || n.target_role || "BOTH";
  if (target === "BOTH") return "Everyone";
  if (target === "STUDENT") return "Students";
  if (target === "MENTOR") return "Mentors";
  return target;
}

function notifCreatedAt(n: SystemNotification) {
  return n.createdAt || n.created_at || "";
}

function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const SurveyManagementView: React.FC<SurveyManagementViewProps> = ({
  currentUserId,
  surveys,
  notifications,
  responses: _responses,
  onAddSurvey,
  onAddNotification,
  onDeleteSurvey,
  onDeleteNotification,
  hideHeader = false,
}) => {
  void _responses;
  const [activeTab, setActiveTab] = useState<"SURVEYS" | "NOTIFICATIONS">("SURVEYS");
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [insightsSurvey, setInsightsSurvey] = useState<Survey | null>(null);

  const [newSurvey, setNewSurvey] = useState<Partial<Survey>>({
    title: "",
    description: "",
    targetRole: "BOTH",
    questions: [{ id: "q1", type: "RATING", question: "Overall satisfaction?" }],
  });

  const [newNotif, setNewNotif] = useState<Partial<SystemNotification>>({
    title: "",
    message: "",
    targetRole: "BOTH",
    type: "INFO",
  });

  const handleAddQuestion = () => {
    const id = `q-${Date.now()}`;
    setNewSurvey((prev) => ({
      ...prev,
      questions: [...(prev.questions || []), { id, type: "TEXT", question: "" }],
    }));
  };

  const handleUpdateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: prev.questions?.map((q) => {
        if (q.id !== id) return q;
        const next = { ...q, ...updates };
        // When switching to multiple choice, seed default answer options
        if (updates.type === "MULTIPLE_CHOICE" && (!next.options || next.options.length === 0)) {
          next.options = ["Option 1", "Option 2"];
        }
        if (updates.type && updates.type !== "MULTIPLE_CHOICE") {
          next.options = undefined;
        }
        return next;
      }),
    }));
  };

  const handleAddOption = (questionId: string) => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: prev.questions?.map((q) => {
        if (q.id !== questionId) return q;
        const options = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
        return { ...q, options };
      }),
    }));
  };

  const handleUpdateOption = (questionId: string, optionIndex: number, value: string) => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: prev.questions?.map((q) => {
        if (q.id !== questionId) return q;
        const options = [...(q.options || [])];
        options[optionIndex] = value;
        return { ...q, options };
      }),
    }));
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: prev.questions?.map((q) => {
        if (q.id !== questionId) return q;
        const options = (q.options || []).filter((_, i) => i !== optionIndex);
        return { ...q, options };
      }),
    }));
  };

  const handleRemoveQuestion = (id: string) => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: prev.questions?.filter((q) => q.id !== id),
    }));
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const questions = newSurvey.questions || [];
    if (questions.length === 0) {
      toast.error("Add at least one question");
      return;
    }
    for (const q of questions) {
      if (!q.question?.trim()) {
        toast.error("Every question needs text");
        return;
      }
      if (q.type === "MULTIPLE_CHOICE") {
        const opts = (q.options || []).map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          toast.error("Multiple choice questions need at least 2 answer options");
          return;
        }
      }
    }

    onAddSurvey({
      ...newSurvey,
      questions: questions.map((q) =>
        q.type === "MULTIPLE_CHOICE"
          ? { ...q, options: (q.options || []).map((o) => o.trim()).filter(Boolean) }
          : { ...q, options: undefined },
      ),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
    });
    setIsSurveyModalOpen(false);
    setNewSurvey({
      title: "",
      description: "",
      targetRole: "BOTH",
      questions: [{ id: "q1", type: "RATING", question: "Overall satisfaction?" }],
    });
  };

  const handleNotifSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddNotification({
      ...newNotif,
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
    });
    setIsNotifModalOpen(false);
    setNewNotif({ title: "", message: "", targetRole: "BOTH", type: "INFO" });
  };

  return (
    <div className={`space-y-4 ${hideHeader ? "" : ""}`}>
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Surveys & Comms</h2>
            <p className="text-sm text-slate-400">Send announcements and gather feedback.</p>
          </div>
        </header>
      )}

      <div className="inline-flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("SURVEYS")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer",
            activeTab === "SURVEYS"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800",
          )}
        >
          Surveys
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("NOTIFICATIONS")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer",
            activeTab === "NOTIFICATIONS"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800",
          )}
        >
          System Alerts
        </button>
      </div>

      {activeTab === "SURVEYS" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Active Surveys</h3>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsSurveyModalOpen(true)}>
              Create Survey
            </Button>
          </div>

          <div className="grid gap-3">
            {surveys.map((survey) => {
              const status = surveyStatus(survey);
              const responseCount = survey.responseCount ?? survey.response_count ?? 0;
              const lastAt = survey.lastResponseAt ?? survey.last_response_at ?? null;
              const lastRel = formatRelativeTime(lastAt);
              return (
                <div
                  key={survey.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-white">{survey.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{survey.description}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
                        onClick={() => setInsightsSurvey(survey)}
                      >
                        Insights
                      </Button>
                      <button
                        type="button"
                        onClick={() => onDeleteSurvey(survey.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        aria-label="Delete survey"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Target: {surveyTargetLabel(survey)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      {responseCount} Responses
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
                      title={lastAt ? new Date(lastAt).toLocaleString() : undefined}
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {lastRel ? `Last response ${lastRel}` : "No responses yet"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                      {survey.questions?.length || 0} Questions
                    </div>
                  </div>
                </div>
              );
            })}
            {surveys.length === 0 && (
              <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
                No surveys yet. Create one to collect feedback.
              </div>
            )}
          </div>

          <SurveyInsightsModal
            survey={insightsSurvey}
            open={!!insightsSurvey}
            onClose={() => setInsightsSurvey(null)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">System Notifications</h3>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsNotifModalOpen(true)}>
              Broadcast Alert
            </Button>
          </div>

          <div className="grid gap-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-4 hover:border-indigo-500/30 transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                    notif.type === "URGENT"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : notif.type === "WARNING"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  }`}
                >
                  {notif.type === "INFO" ? (
                    <Info className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-semibold text-white">{notif.title}</h4>
                    <button
                      type="button"
                      onClick={() => onDeleteNotification(notif.id)}
                      className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      aria-label="Delete broadcast"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">{notif.message}</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Users className="w-3 h-3 text-indigo-400" />
                      Target: {notifTargetLabel(notif)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Sent:{" "}
                      {notifCreatedAt(notif)
                        ? new Date(notifCreatedAt(notif)).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
                No broadcasts yet. Send a system alert to students or mentors.
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        title="Create New Survey"
        description="Gather feedback from users"
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setIsSurveyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => {
                const form = document.getElementById("create-survey-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              Launch Survey
            </Button>
          </div>
        }
      >
        <form id="create-survey-form" onSubmit={handleSurveySubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Survey Title" required>
              <Input
                required
                value={newSurvey.title || ""}
                onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                placeholder="e.g. Q1 Feedback"
              />
            </FormField>
            <FormField label="Target Audience">
              <SelectMenu
                value={newSurvey.targetRole || "BOTH"}
                onChange={(v) =>
                  setNewSurvey({ ...newSurvey, targetRole: v as Survey["targetRole"] })
                }
                options={[
                  { value: "STUDENT", label: "Students Only" },
                  { value: "MENTOR", label: "Mentors Only" },
                  { value: "BOTH", label: "Everyone" },
                ]}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea
              value={newSurvey.description || ""}
              onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
              placeholder="Briefly explain the purpose of this survey..."
              className="min-h-[80px]"
            />
          </FormField>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions</p>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Question
              </button>
            </div>
            <div className="space-y-2">
              {newSurvey.questions?.map((q, idx) => (
                <div key={q.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex gap-2">
                    <Input
                      required
                      value={q.question || ""}
                      onChange={(e) => handleUpdateQuestion(q.id, { question: e.target.value })}
                      placeholder={`Question ${idx + 1}`}
                      className="flex-1"
                    />
                    <div className="w-44">
                      <SelectMenu
                        value={q.type}
                        onChange={(v) =>
                          handleUpdateQuestion(q.id, { type: v as SurveyQuestion["type"] })
                        }
                        options={[
                          { value: "TEXT", label: "Text" },
                          { value: "RATING", label: "Rating (1-5)" },
                          { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-2 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="pl-1 space-y-2 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Answer options
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAddOption(q.id)}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add option
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="w-5 text-center text-[10px] font-bold text-slate-600">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <Input
                              required
                              value={opt}
                              onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 h-9"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(q.id, optIdx)}
                              disabled={(q.options?.length || 0) <= 2}
                              className="p-1.5 text-slate-600 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              aria-label="Remove option"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600">
                        Respondents pick one of these when taking the survey.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        title="Broadcast Alert"
        description="Send system-wide notification"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setIsNotifModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => {
                const form = document.getElementById("broadcast-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              Send Alert
            </Button>
          </div>
        }
      >
        <form id="broadcast-form" onSubmit={handleNotifSubmit} className="space-y-4">
          <FormField label="Alert Title" required>
            <Input
              required
              value={newNotif.title || ""}
              onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
              placeholder="e.g. Urgent Update"
            />
          </FormField>
          <FormField label="Message" required>
            <Textarea
              required
              value={newNotif.message || ""}
              onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
              placeholder="Type your announcement here..."
              className="min-h-[100px]"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Target Role">
              <SelectMenu
                value={newNotif.targetRole || "BOTH"}
                onChange={(v) =>
                  setNewNotif({
                    ...newNotif,
                    targetRole: v as SystemNotification["targetRole"],
                  })
                }
                options={[
                  { value: "STUDENT", label: "Students" },
                  { value: "MENTOR", label: "Mentors" },
                  { value: "BOTH", label: "Everyone" },
                ]}
              />
            </FormField>
            <FormField label="Alert Type">
              <SelectMenu
                value={newNotif.type || "INFO"}
                onChange={(v) => setNewNotif({ ...newNotif, type: v })}
                options={[
                  { value: "INFO", label: "Information" },
                  { value: "WARNING", label: "Warning" },
                  { value: "URGENT", label: "Urgent" },
                ]}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SurveyManagementView;
