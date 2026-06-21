"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Student, LetterOfRecommendationRequest } from "@/lib/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { lorApi } from "@/lib/api/lor";
import {
  Shield,
  Plus,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  User,
  FileText,
  Send,
  Lock,
  Copy,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

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

  // Autofill student name if student prop updates
  useEffect(() => {
    if (student?.name) {
      setFormData((prev) => ({ ...prev, studentName: student.name }));
    }
  }, [student]);

  // Keep tracking data fresh
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!onRefreshRef.current) return;
    const run = async () => {
      try {
        await onRefreshRef.current?.();
      } catch {}
    };
    run(); // initial fetch on open
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
    if (!formData.name || !formData.email || !formData.dueDate || !formData.studentName) return;

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
    } catch (err) {
      toast.error("Network error. Failed to create request.");
    }

    setFormData({ name: "", email: "", dueDate: "", studentName: student?.name || "" });
    setIsRequestModalOpen(false);
    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REVIEWED":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "UPLOADED":
        return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
      case "REQUESTED":
        return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "DECLINED":
        return "text-rose-400 bg-rose-400/10 border-rose-400/20";
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "REVIEWED":
        return <CheckCircle className="w-4 h-4" />;
      case "UPLOADED":
        return <FileText className="w-4 h-4" />;
      case "REQUESTED":
        return <Clock className="w-4 h-4" />;
      case "DECLINED":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = parseLocalDate(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getMostUrgentRequest = () => {
    if (!requests || requests.length === 0) return null;
    const activeRequests = requests.filter((r) => r.status === "REQUESTED");
    if (activeRequests.length === 0) return null;
    return activeRequests.sort(
      (a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime()
    )[0];
  };

  const urgentRequest = getMostUrgentRequest();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Due Date Banner */}
      {urgentRequest && (
        <div
          className={`p-6 rounded-3xl border-2 ${
            getDaysRemaining(urgentRequest.dueDate) <= 3
              ? "bg-rose-500/10 border-rose-500/30"
              : getDaysRemaining(urgentRequest.dueDate) <= 7
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-indigo-500/10 border-indigo-500/30"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  getDaysRemaining(urgentRequest.dueDate) <= 3
                    ? "bg-rose-500/20 text-rose-400"
                    : getDaysRemaining(urgentRequest.dueDate) <= 7
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-indigo-500/20 text-indigo-400"
                }`}
              >
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {getDaysRemaining(urgentRequest.dueDate) <= 0
                    ? "Letter Due Today!"
                    : getDaysRemaining(urgentRequest.dueDate) === 1
                    ? "Letter Due Tomorrow"
                    : `${getDaysRemaining(urgentRequest.dueDate)} Days Until Due Date`}
                </h3>
                <p className="text-sm text-slate-400">
                  Letter from <span className="text-white font-bold">{urgentRequest.writerName}</span>{" "}
                  due on{" "}
                  {parseLocalDate(urgentRequest.dueDate).toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div
              className={`px-6 py-3 rounded-xl text-center min-w-[5rem] ${
                getDaysRemaining(urgentRequest.dueDate) <= 3
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : getDaysRemaining(urgentRequest.dueDate) <= 7
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              }`}
            >
              <p className="text-3xl font-bold">{getDaysRemaining(urgentRequest.dueDate)}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-[9px]">Days Left</p>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 transition-colors"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="lg:hidden">
            <h2 className="text-3xl font-bold text-white mb-1">Letter Vault</h2>
            <p className="text-slate-400 flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-indigo-400" /> Securely manage your letters of recommendation.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {onRefresh && (
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              isLoading={refreshing}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              title="Refresh tracking status"
              className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 rounded-2xl text-sm font-bold cursor-pointer h-12"
            >
              Refresh
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setTemplates(DEFAULT_TEMPLATES);
              setIsTemplateModalOpen(true);
            }}
            leftIcon={<FileText className="w-4 h-4" />}
            className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 rounded-2xl text-sm font-bold cursor-pointer h-12"
          >
            LOR Email Request Template
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsRequestModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="rounded-2xl text-sm font-bold cursor-pointer h-12"
          >
            Request New Letter
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Active Requests</h3>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {(requests || []).length} Total
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {requests && requests.length > 0 ? (
                requests.map((req) => (
                  <div key={req.id} className="p-8 hover:bg-slate-800/30 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">{req.writerName}</h4>
                          <p className="text-sm text-slate-500">{req.writerEmail}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Due Date
                          </p>
                          <div className="flex items-center gap-2 text-white font-bold">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            {parseLocalDate(req.dueDate).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>

                        <div
                          className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${getStatusColor(
                            req.status
                          )}`}
                        >
                          {getStatusIcon(req.status)}
                          {req.status}
                        </div>
                      </div>
                    </div>

                    {req.status === "REQUESTED" && (
                      <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Access ID for Writer:
                          </span>
                          <code className="text-xs font-mono text-indigo-400 font-bold">
                            {req.accessCode}
                          </code>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard
                              .writeText(req.accessCode)
                              .then(() => {
                                toast.success("Access ID copied to clipboard!");
                              })
                              .catch(() => {
                                const textArea = document.createElement("textarea");
                                textArea.value = req.accessCode;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand("copy");
                                document.body.removeChild(textArea);
                                toast.success("Access ID copied to clipboard!");
                              });
                          }}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                        >
                          Copy ID
                        </button>
                      </div>
                    )}

                    {req.status === "DECLINED" && (
                      <div className="mt-4 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span className="text-xs font-bold text-rose-400">
                            Letter Declined — Writer notified to re-upload
                          </span>
                        </div>
                        {req.declineReason && (
                          <p className="text-xs text-rose-300/80 pl-6">{req.declineReason}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex items-center gap-6">
                      <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            req.status === "REVIEWED"
                              ? "w-full bg-emerald-500"
                              : req.status === "UPLOADED"
                              ? "w-2/3 bg-indigo-500"
                              : "w-1/3 bg-amber-500"
                          }`}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {req.status === "REVIEWED"
                          ? "Complete"
                          : req.status === "UPLOADED"
                          ? "Pending Review"
                          : "Awaiting Upload"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center text-slate-800 mx-auto mb-6 border border-slate-800">
                    <Mail className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">No requests yet</h4>
                  <p className="text-slate-500 max-w-xs mx-auto text-sm">
                    Start by requesting your first letter of recommendation from a professor or dentist.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
            <h3 className="text-xl font-bold mb-4 relative z-10">How it works</h3>
            <div className="space-y-6 relative z-10">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                  1
                </div>
                <p className="text-sm text-indigo-50/80 leading-relaxed">
                  Submit the writer's details and a due date.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                  2
                </div>
                <p className="text-sm text-indigo-50/80 leading-relaxed">
                  The writer receives a secure link with instructions and requirements.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                  3
                </div>
                <p className="text-sm text-indigo-50/80 leading-relaxed">
                  Our system sends automated reminders as the deadline approaches.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                  4
                </div>
                <p className="text-sm text-indigo-50/80 leading-relaxed">
                  Once uploaded, we review the letter for quality and compliance.
                </p>
              </div>
            </div>
            <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10" />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" /> Pro Tip
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Always request letters at least 2 months before you plan to submit your application. This
              gives writers plenty of time to craft a thoughtful recommendation.
            </p>
          </section>
        </div>
      </div>

      {/* Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Request LOR</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    Letter of Recommendation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Student's Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="text"
                    required
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    placeholder="Your Full Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Writer's Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Writer's Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    placeholder="j.smith@university.edu"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Desired Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  We recommend setting this at least 2 weeks before your actual deadline.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 py-4 border border-slate-800 rounded-2xl text-slate-400 font-bold hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">LOR Email Request Template</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    Click to edit and customize these scripts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Template 1 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-lg font-bold text-white">1. Initial Email Request Script</h5>
                  <button
                    onClick={() => {
                      const text = templates.initial;
                      navigator.clipboard
                        .writeText(text)
                        .then(() => {
                          toast.success("Template copied to clipboard!");
                        })
                        .catch(() => {
                          const PinText = document.createElement("textarea");
                          PinText.value = text;
                          document.body.appendChild(PinText);
                          PinText.select();
                          document.execCommand("copy");
                          document.body.removeChild(PinText);
                          toast.success("Template copied to clipboard!");
                        });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-600/20 transition-all"
                  >
                    <Copy className="w-3 h-3" /> Copy Script
                  </button>
                </div>
                <textarea
                  value={templates.initial}
                  onChange={(e) => setTemplates({ ...templates, initial: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm text-slate-300 leading-relaxed font-mono focus:outline-none focus:border-indigo-500 transition-all min-h-[300px] resize-none"
                />
              </div>

              {/* Template 2 */}
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-lg font-bold text-white">2. Follow-up After They Say Yes</h5>
                  <button
                    onClick={() => {
                      const text = templates.followUp;
                      navigator.clipboard
                        .writeText(text)
                        .then(() => {
                          toast.success("Template copied to clipboard!");
                        })
                        .catch(() => {
                          const PinText = document.createElement("textarea");
                          PinText.value = text;
                          document.body.appendChild(PinText);
                          PinText.select();
                          document.execCommand("copy");
                          document.body.removeChild(PinText);
                          toast.success("Template copied to clipboard!");
                        });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-600/20 transition-all"
                  >
                    <Copy className="w-3 h-3" /> Copy Script
                  </button>
                </div>
                <textarea
                  value={templates.followUp}
                  onChange={(e) => setTemplates({ ...templates, followUp: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm text-slate-300 leading-relaxed font-mono focus:outline-none focus:border-indigo-500 transition-all min-h-[200px] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 shrink-0 flex justify-end">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterVaultView;
