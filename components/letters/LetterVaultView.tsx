"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Student, LetterOfRecommendationRequest } from "@/lib/types";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { lorApi } from "@/lib/api/lor";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import {
  Shield,
  Plus,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  User,
  FileText,
  Send,
  Lock,
  Copy,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  FormField,
  Input,
  Modal,
  Textarea,
} from "@/components/ui";

interface LetterVaultViewProps {
  student: Student;
  requests: LetterOfRecommendationRequest[];
  onSendRequest: (request: any) => void;
  onBack: () => void;
  onRefresh?: () => void | Promise<void>;
}

const DEFAULT_TEMPLATES = {
  initial: `Subject: Letter of Recommendation Request\n\nDear Dr. [Last Name] / Professor [Last Name],\n\nI hope you’re doing well. I’m reaching out to ask if you would be willing to write me a strong letter of recommendation for my dental school application this upcoming cycle.\n\nI’ve truly valued my experience working with you in [context: course, clinic, research, shadowing], especially [specific detail: what you learned, a moment that stood out, or something you appreciated]. Your mentorship has played an important role in my development and interest in pursuing dentistry.\n\nI plan to apply in [month/year], and the letter would be due by [deadline]. I would be happy to provide my resume, personal statement draft, transcript, and any additional information that would make writing the letter easier.\n\nPlease let me know if you feel comfortable writing me a letter of recommendation. I completely understand if your schedule does not allow it.\n\nThank you so much for your time and support. I really appreciate it.\n\nSincerely,\n\n[Your Full Name]\n[Your Phone Number]\n[Your Email]`,
  followUp: `Thank you so much for agreeing to write a letter of recommendation on my behalf. I truly appreciate your support.\n\nI will be using a service called Dental School Guide to manage and verify my letters. You should receive an email from them shortly with instructions for submitting your letter.\n\nPlease let me know if there’s any additional information I can provide—such as my resume, personal statement, or details about my experiences—to assist you.\n\nThank you again for your time and support.\n\nSincerely,\n\n[Your Full Name]\n[Your Phone Number]\n[Your Email]`,
};

function copyText(text: string, successMessage: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(successMessage))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast.success(successMessage);
    });
}

export const LetterVaultView: React.FC<LetterVaultViewProps> = ({
  student,
  requests = [],
  onSendRequest,
  onBack,
  onRefresh,
}) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dueDate: "",
    studentName: student?.name || "",
  });

  usePageHeaderAction({
    label: "Request New Letter",
    icon: <Plus className="h-4 w-4" />,
    onClick: () => setIsRequestModalOpen(true),
  });

  useEffect(() => {
    if (student?.name) {
      setFormData((prev) => ({ ...prev, studentName: student.name }));
    }
  }, [student]);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!onRefreshRef.current) return;
    const run = async () => {
      try {
        await onRefreshRef.current?.();
      } catch {
        /* ignore */
      }
    };
    run();
    const onFocus = () => run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(run, 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
      toast.success("Tracking updated");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.dueDate || !formData.studentName) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await lorApi.createRequest({
        writerName: formData.name,
        writerEmail: formData.email,
        dueDate: formData.dueDate,
        studentName: formData.studentName,
      });
      toast.success("Letter request sent! The writer will receive an email.");
      onSendRequest(res.request);
      setFormData({ name: "", email: "", dueDate: "", studentName: student?.name || "" });
      setIsRequestModalOpen(false);
    } catch {
      toast.error("Network error. Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (
    status: string,
  ): "success" | "primary" | "warning" | "danger" | "default" => {
    switch (status) {
      case "REVIEWED":
        return "success";
      case "UPLOADED":
        return "primary";
      case "REQUESTED":
        return "warning";
      case "DECLINED":
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "REVIEWED":
        return <CheckCircle className="h-3.5 w-3.5" />;
      case "UPLOADED":
        return <FileText className="h-3.5 w-3.5" />;
      case "REQUESTED":
        return <Clock className="h-3.5 w-3.5" />;
      case "DECLINED":
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = parseLocalDate(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const urgentRequest = (() => {
    const active = (requests || []).filter((r) => r.status === "REQUESTED");
    if (active.length === 0) return null;
    return [...active].sort(
      (a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime(),
    )[0];
  })();

  const urgentDays = urgentRequest ? getDaysRemaining(urgentRequest.dueDate) : 0;

  return (
    <div className="space-y-5 pb-10">
      {urgentRequest && (
        <div
          className={`rounded-xl border p-4 ${
            urgentDays <= 3
              ? "border-rose-500/30 bg-rose-500/10"
              : urgentDays <= 7
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-indigo-500/30 bg-indigo-500/10"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  urgentDays <= 3
                    ? "bg-rose-500/20 text-rose-400"
                    : urgentDays <= 7
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-indigo-500/20 text-indigo-400"
                }`}
              >
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {urgentDays <= 0
                    ? "Letter due today"
                    : urgentDays === 1
                      ? "Letter due tomorrow"
                      : `${urgentDays} days until due date`}
                </h3>
                <p className="text-xs text-slate-400">
                  From <span className="font-medium text-white">{urgentRequest.writerName}</span> ·{" "}
                  {parseLocalDate(urgentRequest.dueDate).toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div
              className={`rounded-xl border px-4 py-2 text-center ${
                urgentDays <= 3
                  ? "border-rose-500/30 bg-rose-500/20 text-rose-400"
                  : urgentDays <= 7
                    ? "border-amber-500/30 bg-amber-500/20 text-amber-400"
                    : "border-indigo-500/30 bg-indigo-500/20 text-indigo-400"
              }`}
            >
              <p className="text-2xl font-bold tabular-nums">{urgentDays}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider">Days left</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={onBack}
          className="w-fit text-slate-400"
        >
          Back to Resources
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleManualRefresh()}
              isLoading={refreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<FileText className="h-4 w-4" />}
            onClick={() => {
              setTemplates(DEFAULT_TEMPLATES);
              setIsTemplateModalOpen(true);
            }}
          >
            Email templates
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h3 className="text-base font-semibold text-white">Active Requests</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {(requests || []).length} total
              </span>
            </div>

            {(requests || []).length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Mail className="h-8 w-8" />}
                  title="No requests yet"
                  description="Request your first letter of recommendation from a professor or dentist."
                  action={
                    <Button
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setIsRequestModalOpen(true)}
                    >
                      Request New Letter
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {requests.map((req) => (
                  <div key={req.id} className="space-y-4 p-5 transition-colors hover:bg-slate-800/20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{req.writerName}</h4>
                          <p className="text-sm text-slate-500">{req.writerEmail}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right">
                          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Due date
                          </p>
                          <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                            {parseLocalDate(req.dueDate).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(req.status)}>
                          {getStatusIcon(req.status)}
                          {req.status}
                        </Badge>
                      </div>
                    </div>

                    {req.status === "REQUESTED" && (
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Lock className="h-3 w-3 shrink-0 text-slate-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Access ID
                          </span>
                          <code className="truncate font-mono text-xs font-semibold text-indigo-400">
                            {req.accessCode}
                          </code>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-indigo-400"
                          onClick={() => copyText(req.accessCode, "Access ID copied")}
                        >
                          Copy
                        </Button>
                      </div>
                    )}

                    {req.status === "DECLINED" && (
                      <div className="space-y-1 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Letter declined — writer notified to re-upload
                        </div>
                        {req.declineReason && (
                          <p className="pl-5 text-xs text-rose-300/80">{req.declineReason}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-950">
                        <div
                          className={`h-full rounded-full transition-all ${
                            req.status === "REVIEWED"
                              ? "w-full bg-emerald-500"
                              : req.status === "UPLOADED"
                                ? "w-2/3 bg-indigo-500"
                                : "w-1/3 bg-amber-500"
                          }`}
                        />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {req.status === "REVIEWED"
                          ? "Complete"
                          : req.status === "UPLOADED"
                            ? "Pending review"
                            : "Awaiting upload"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-xl bg-indigo-600 p-5 text-white shadow-lg shadow-indigo-600/20">
            <h3 className="relative z-10 mb-4 text-base font-semibold">How it works</h3>
            <div className="relative z-10 space-y-4">
              {[
                "Submit the writer's details and a due date.",
                "The writer receives a secure link with instructions.",
                "Automated reminders go out as the deadline approaches.",
                "Once uploaded, we review the letter for quality.",
              ].map((text, i) => (
                <div key={text} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-indigo-50/85">{text}</p>
                </div>
              ))}
            </div>
            <Shield className="absolute -bottom-8 -right-8 h-36 w-36 text-white/10" />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <AlertCircle className="h-4 w-4 text-amber-400" /> Pro tip
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Request letters at least 2 months before you plan to submit. That gives writers time to
              craft a thoughtful recommendation.
            </p>
          </section>
        </div>
      </div>

      <Modal
        open={isRequestModalOpen}
        onClose={() => !submitting && setIsRequestModalOpen(false)}
        title="Request letter of recommendation"
        description="We'll email the writer a secure upload link."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="lor-request-form"
              isLoading={submitting}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Send Request
            </Button>
          </>
        }
      >
        <form id="lor-request-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <FormField label="Your full name" htmlFor="lor-student-name" required>
            <Input
              id="lor-student-name"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              placeholder="Your full name"
              required
            />
          </FormField>
          <FormField label="Writer's full name" htmlFor="lor-writer-name" required>
            <Input
              id="lor-writer-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. Jane Smith"
              required
            />
          </FormField>
          <FormField label="Writer's email" htmlFor="lor-writer-email" required>
            <Input
              id="lor-writer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="j.smith@university.edu"
              required
            />
          </FormField>
          <FormField
            label="Desired due date"
            htmlFor="lor-due-date"
            required
            hint="Set this at least 2 weeks before your real deadline."
          >
            <DatePicker
              value={formData.dueDate}
              onChange={(value) => setFormData({ ...formData, dueDate: value })}
              placeholder="Select due date"
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="LOR email templates"
        description="Edit and copy these scripts for your writers."
        size="xl"
        footer={
          <Button type="button" variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-white">1. Initial request</h5>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => copyText(templates.initial, "Template copied")}
              >
                Copy
              </Button>
            </div>
            <Textarea
              value={templates.initial}
              onChange={(e) => setTemplates({ ...templates, initial: e.target.value })}
              className="min-h-[220px] resize-none font-mono text-sm"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-white">2. Follow-up after they say yes</h5>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => copyText(templates.followUp, "Template copied")}
              >
                Copy
              </Button>
            </div>
            <Textarea
              value={templates.followUp}
              onChange={(e) => setTemplates({ ...templates, followUp: e.target.value })}
              className="min-h-[160px] resize-none font-mono text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LetterVaultView;
