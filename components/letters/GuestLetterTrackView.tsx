"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { LetterOfRecommendationRequest } from "@/lib/types";
import { lorApi } from "@/lib/api/lor";
import {
  Shield,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Search,
  ArrowRight,
  User,
  Lock,
  AlertTriangle,
  Loader2,
  Plus,
} from "lucide-react";

interface GuestLetterTrackViewProps {
  token: string;
}

export const GuestLetterTrackView: React.FC<GuestLetterTrackViewProps> = ({ token }) => {
  const [requests, setRequests] = useState<LetterOfRecommendationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = async (tk: string) => {
    setLoading(true);
    setError("");

    try {
      const data = await lorApi.trackGuestRequests(tk);
      setRequests(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch requests. Please check your token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRequests(token);
    } else {
      setError("Invalid or missing tracking link. Please check your email for the correct link.");
      setLoading(false);
    }
  }, [token]);

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

  const getProgressWidth = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "33%";
      case "UPLOADED":
        return "66%";
      case "REVIEWED":
        return "100%";
      case "DECLINED":
        return "33%";
      default:
        return "0%";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "REVIEWED":
        return "bg-emerald-400";
      case "UPLOADED":
        return "bg-indigo-400";
      case "REQUESTED":
        return "bg-amber-400";
      case "DECLINED":
        return "bg-rose-400";
      default:
        return "bg-slate-400";
    }
  };

  if (loading || error || requests.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng"
                alt="Dental School Guide"
                className="h-8 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-lg font-black text-white">Dental School Guide</span>
            </div>

            {loading ? (
              <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto border border-indigo-500/20 mb-6">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            ) : error ? (
              <div className="w-20 h-20 bg-rose-600/10 rounded-3xl flex items-center justify-center text-rose-400 mx-auto border border-rose-500/20 mb-6">
                <Lock className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center text-slate-500 mx-auto border border-slate-700 mb-6">
                <Search className="w-10 h-10" />
              </div>
            )}

            <h1 className="text-4xl font-black text-white">
              {loading ? "Verifying Link..." : error ? "Access Denied" : "No Requests Found"}
            </h1>
            <p className="text-slate-400 max-w-md mx-auto">
              {loading
                ? "Please wait while we securely retrieve your tracking details."
                : error
                ? error
                : "We couldn't find any requests associated with this tracking link. Please contact support if you believe this is an error."}
            </p>
          </div>

          {!loading && !error && (
            <div className="text-center mt-8">
              <Link
                href="/guest-letter-request"
                className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors inline-flex items-center justify-center gap-2 bg-indigo-500/10 px-6 py-3 rounded-xl border border-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Submit a New Request
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Secure & Encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng"
                alt=""
                className="h-6 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">My Letter Requests</h2>
              <p className="text-slate-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" /> Tracking requests for{" "}
                <span className="text-indigo-400 font-bold">
                  {requests[0]?.studentName || "Student"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (token) fetchRequests(token);
              }}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}{" "}
              Refresh
            </button>
            <Link
              href="/guest-letter-request"
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" /> Request Another Letter
            </Link>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Request Cards */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Active Requests</h3>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {requests.length} Total
                </span>
              </div>

              <div className="divide-y divide-slate-800">
                {requests.map((req) => (
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
                            {parseLocalDate(req.dueDate).toLocaleDateString("en-US", {
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

                    {/* Declined Banner */}
                    {req.status === "DECLINED" && (
                      <div className="mt-4 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span className="text-xs font-bold text-rose-400">
                            Letter Declined — Writer has been notified to re-upload
                          </span>
                        </div>
                        {req.declineReason && (
                          <p className="text-xs text-rose-300/80 pl-6">{req.declineReason}</p>
                        )}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-6 flex items-center gap-6">
                      <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${getProgressColor(
                            req.status
                          )}`}
                          style={{ width: getProgressWidth(req.status) }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
                        <span
                          className={
                            req.status === "REQUESTED" || req.status === "DECLINED" ? "text-white" : ""
                          }
                        >
                          Awaiting
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span className={req.status === "UPLOADED" ? "text-white" : ""}>
                          Reviewing
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span className={req.status === "REVIEWED" ? "text-white" : ""}>
                          Complete
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> How It Works
              </h3>
              <div className="space-y-4">
                {[
                  { step: "1", label: "Request", desc: "Submit your request with the writer's details" },
                  { step: "2", label: "Email Sent", desc: "Writer receives an email with upload instructions" },
                  { step: "3", label: "Upload", desc: "Writer uploads the letter through a secure portal" },
                  { step: "4", label: "Review", desc: "Letter is reviewed and approved by the admin" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{s.label}</p>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-600/20">
              <h3 className="text-xl font-black mb-4">Confidentiality</h3>
              <p className="text-indigo-55/80 text-sm leading-relaxed mb-6">
                All letters are stored in a secure vault. Only authorized administrators can view the letter contents.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/10">
                  <Lock className="w-4 h-4 text-indigo-200" />
                  <span className="text-xs font-bold">Encrypted Storage</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/10">
                  <Shield className="w-4 h-4 text-indigo-200" />
                  <span className="text-xs font-bold">FERPA Compliant</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestLetterTrackView;
