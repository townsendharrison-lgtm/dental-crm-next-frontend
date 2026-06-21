"use client";

import React, { useState } from "react";
import {
  FileText,
  Mail,
  User,
  Calendar,
  Send,
  Shield,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { lorApi } from "@/lib/api/lor";
import { toast } from "sonner";

export const GuestLetterRequestView: React.FC = () => {
  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    writerName: "",
    writerEmail: "",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.studentName ||
      !formData.studentEmail ||
      !formData.writerName ||
      !formData.writerEmail ||
      !formData.dueDate
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await lorApi.submitGuestRequest(formData);
      setSuccess(true);
      toast.success("Request submitted successfully!");
    } catch (err: any) {
      const errMsg = err?.message || "Failed to submit request. Please try again.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="w-24 h-24 bg-emerald-600/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white">Request Submitted!</h2>
            <p className="text-slate-400 leading-relaxed">
              Your letter of recommendation request has been submitted. An email has been sent to{" "}
              <strong className="text-white">{formData.writerName}</strong> with instructions on how to upload the letter.
            </p>
            <p className="text-indigo-300 font-semibold text-sm bg-indigo-950/40 border border-indigo-900/30 p-4 rounded-xl max-w-sm mx-auto">
              Please check your email to get your request tracking link.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  studentName: "",
                  studentEmail: "",
                  writerName: "",
                  writerEmail: "",
                  dueDate: "",
                });
              }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Submit Another Request
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Powered by Dental School Guide
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
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
          <h1 className="text-4xl font-black text-white">Request a Letter of Recommendation</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Fill in the details below and we'll send a professional request email to your letter writer with upload instructions.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
        >
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" /> Your Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Sarah Jenkins"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Your Email
                </label>
                <input
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                  placeholder="sarah@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" /> Letter Writer Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Writer's Name
                </label>
                <input
                  type="text"
                  value={formData.writerName}
                  onChange={(e) => setFormData({ ...formData, writerName: e.target.value })}
                  placeholder="Dr. Robert Miller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Writer's Email
                </label>
                <input
                  type="email"
                  value={formData.writerEmail}
                  onChange={(e) => setFormData({ ...formData, writerEmail: e.target.value })}
                  placeholder="dr.miller@university.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Timeline
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm font-medium p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer animate-all"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? "Submitting..." : "Send Request"}
          </button>
        </form>

        {/* Email instruction notice */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Please check your email to get your request tracking link.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Shield className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Secure & Confidential</span>
        </div>
      </div>
    </div>
  );
};

export default GuestLetterRequestView;
