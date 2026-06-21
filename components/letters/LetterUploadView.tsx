"use client";

import React, { useState, useEffect } from "react";
import type { LetterOfRecommendationRequest, Student, LOREmailConfig } from "@/lib/types";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { lorApi } from "@/lib/api/lor";
import {
  Shield,
  Upload,
  CheckCircle,
  FileText,
  AlertCircle,
  Lock,
  ArrowRight,
  Download,
  Mail,
  User,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface LetterUploadViewProps {
  requests?: LetterOfRecommendationRequest[];
  students?: Student[];
  config?: LOREmailConfig;
  onUpload?: (requestId: string, file: File) => void;
  initialCode?: string;
  hideHeaderOnDesktop?: boolean;
}

export const LetterUploadView: React.FC<LetterUploadViewProps> = ({
  requests = [],
  students = [],
  config,
  onUpload,
  initialCode = "",
  hideHeaderOnDesktop = false,
}) => {
  const [accessCode, setAccessCode] = useState(initialCode);
  const [isVerified, setIsVerified] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [backendConfig, setBackendConfig] = useState<any>(null);

  // Auto-fill and verify code if passed as initialCode
  useEffect(() => {
    if (initialCode) {
      setAccessCode(initialCode);
      verifyCode(initialCode);
    }
  }, [initialCode]);

  const verifyCode = async (code: string) => {
    const codeToVerify = code || accessCode;
    if (!codeToVerify.trim()) return;

    setVerifying(true);
    setVerifyError("");

    try {
      const data = await lorApi.verifyAccessCode(codeToVerify);
      const req = data.request;
      setSelectedRequest(req);
      if (data.config) setBackendConfig(data.config);
      setIsVerified(true);
      if (
        req.status === "UPLOADED" ||
        req.status === "REVIEWED" ||
        (req.status as string) === "VERIFIED"
      ) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      // Fallback: check local requests if provided (for backward compatibility in local previews)
      const localReq = requests.find((r) => r.accessCode === codeToVerify);
      if (localReq) {
        setSelectedRequest(localReq);
        setIsVerified(true);
        setVerifyError("");
        if (
          localReq.status === "UPLOADED" ||
          localReq.status === "REVIEWED" ||
          (localReq.status as string) === "VERIFIED"
        ) {
          setIsSuccess(true);
        }
      } else {
        setVerifyError(err?.message || "Invalid Access Code. Please check and try again.");
      }
    }
    setVerifying(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedRequest) return;
    const file = selectedFile;

    setIsUploading(true);
    setUploadError("");

    const code = selectedRequest.access_code || selectedRequest.accessCode;

    try {
      await lorApi.uploadDocument(code, file);
      setIsSuccess(true);
      if (onUpload) onUpload(selectedRequest.id, file);
    } catch (err: any) {
      if (onUpload) {
        onUpload(selectedRequest.id, file);
        setIsSuccess(true);
      } else {
        setUploadError(err?.message || "Upload failed. Please try again.");
      }
    }
    setIsUploading(false);
  };

  const getStudentName = () => {
    if (selectedRequest?.student_name) return selectedRequest.student_name;
    if (selectedRequest?.studentName) return selectedRequest.studentName;
    const student = students.find(
      (s) => s.id === (selectedRequest?.studentId || selectedRequest?.student_id)
    );
    return student?.name || "the student";
  };

  const getDueDate = () => {
    const d = selectedRequest?.due_date || selectedRequest?.dueDate;
    if (!d) return "N/A";
    return parseLocalDate(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const isDeclined = selectedRequest?.status === "DECLINED";
  const declineReason = selectedRequest?.decline_reason || selectedRequest?.declineReason;

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-24 h-24 bg-emerald-600/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white">Upload Successful</h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Thank you for supporting {getStudentName()}&apos;s application. The letter has been securely received and is now pending review.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-600">
            <Shield className="w-4 h-4" />
            <span className="font-bold uppercase tracking-widest text-[9px]">Powered by Dental School Guide</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-[70vh] bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
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
            <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto border border-indigo-500/20 mb-6">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-black text-white">Letter Portal</h2>
            <p className="text-slate-400 text-sm">Please enter the unique Access ID provided in your invitation email.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Access ID
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setVerifyError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && verifyCode("")}
                placeholder="e.g. LOR-SA-DM-1234"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white text-center font-mono text-lg focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            {verifyError && (
              <div className="flex items-center gap-2 text-rose-400 text-sm font-medium p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {verifyError}
              </div>
            )}
            <button
              onClick={() => verifyCode("")}
              disabled={verifying || !accessCode.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {verifying ? "Verifying..." : "Verify Identity"}{" "}
              {!verifying && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-[9px]">Secure & Encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  const mailtoUrl = `mailto:info@dentalschoolguide.com?subject=${encodeURIComponent(
    `Support Request: LOR Upload${accessCode ? ` [Access Code: ${accessCode}]` : ""}`
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 ${hideHeaderOnDesktop ? "lg:hidden" : ""}`}>
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <div className={`flex items-center gap-2 mb-1 ${hideHeaderOnDesktop ? "lg:hidden" : ""}`}>
                <img
                  src="https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng"
                  alt=""
                  className="h-5 object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Dental School Guide
                </span>
              </div>
              <h2 className={`text-3xl font-black text-white mb-1 ${hideHeaderOnDesktop ? "lg:hidden" : ""}`}>Upload Recommendation</h2>
              <p className="text-slate-400 flex items-center gap-2 text-sm">
                For <span className="text-indigo-400 font-bold">{getStudentName()}</span>
              </p>
            </div>
          </div>
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-[9px]">
              Due Date
            </p>
            <p className="text-white font-black">{getDueDate()}</p>
          </div>
        </header>

        {/* Declined Banner */}
        {isDeclined && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Revision Required</h3>
                <p className="text-sm text-slate-400">
                  Your previously uploaded letter was declined. Please review the feedback and re-upload
                  a revised version.
                </p>
              </div>
            </div>
            {declineReason && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 text-[9px]">
                  Reason
                </p>
                <p className="text-sm text-rose-200 leading-relaxed">{declineReason}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 space-y-8 relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white">
                    {isDeclined ? "Re-upload Your Letter" : "Upload Your Letter"}
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {isDeclined
                      ? "Please address the feedback above and upload a revised version of your letter in PDF format."
                      : "Please upload your letter of recommendation in PDF format. Ensure it is on official letterhead and includes your signature."}
                  </p>
                </div>

                <div className="relative group">
                  {!selectedFile ? (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                      <div
                        className={`aspect-video bg-slate-950 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center p-12 transition-all group-hover:bg-indigo-500/5 ${
                          isDeclined
                            ? "border-rose-500/30 group-hover:border-rose-500/50"
                            : "border-slate-800 group-hover:border-indigo-500/50"
                        }`}
                      >
                        <div
                          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border group-hover:scale-110 transition-transform ${
                            isDeclined
                              ? "bg-rose-600/10 text-rose-400 border-rose-500/20"
                              : "bg-indigo-600/10 text-indigo-400 border-indigo-500/20"
                          }`}
                        >
                          <Upload className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Drag & Drop or Click</h4>
                        <p className="text-slate-500 text-sm">Only PDF files are accepted (Max 10MB)</p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center justify-center space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-white truncate max-w-[250px] mx-auto">
                          {selectedFile.name}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex gap-4 w-full pt-4">
                        <button
                          onClick={() => setSelectedFile(null)}
                          disabled={isUploading}
                          className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-all text-sm"
                        >
                          Change File
                        </button>
                        <button
                          onClick={handleUploadSubmit}
                          disabled={isUploading}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5" />
                          )}
                          {isUploading ? "Uploading..." : "Submit Upload"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-rose-400 text-sm font-medium p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
              <Shield className="absolute -bottom-20 -right-20 w-80 h-80 text-slate-800/20 pointer-events-none" />
            </section>

            {(config || backendConfig) && (
              <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 space-y-8">
                <h3 className="text-2xl font-bold text-white">Letter Requirements</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
                    <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white">Official Guidelines</h4>
                    <div className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">
                      {config?.content?.requirements ||
                        backendConfig?.requirements ||
                        "No specific requirements listed."}
                    </div>
                    {(config?.content?.requirementsPdfUrl || backendConfig?.requirementsPdfUrl) && (
                      <a
                        href={config?.content?.requirementsPdfUrl || backendConfig?.requirementsPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors mt-4 text-sm"
                      >
                        <Download className="w-4 h-4" /> View Requirements PDF
                      </a>
                    )}
                  </div>
                  <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
                    <div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white">Example Letter</h4>
                    <p className="text-sm text-slate-500 mb-4">
                      Need inspiration? View our recommended structure.
                    </p>
                    {config?.content?.exampleLetterPdfUrl || backendConfig?.exampleLetterPdfUrl ? (
                      <a
                        href={config?.content?.exampleLetterPdfUrl || backendConfig?.exampleLetterPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" /> Download Example
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 italic">No example letter available.</span>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            <section className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-600/20">
              <h3 className="text-2xl font-black mb-6">Confidentiality</h3>
              <p className="text-indigo-50/80 leading-relaxed mb-8 text-sm">
                All letters are stored in a secure vault and are never shared with the student. Only
                authorized administrators can view the contents for verification purposes.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl border border-white/10">
                  <Lock className="w-5 h-5 text-indigo-200" />
                  <span className="text-sm font-bold">Encrypted Storage</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl border border-white/10">
                  <Shield className="w-5 h-5 text-indigo-200" />
                  <span className="text-sm font-bold">FERPA Compliant</span>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 space-y-6">
              <h3 className="text-xl font-bold text-white">Need Help?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                If you&apos;re having trouble uploading or have questions about the process, please contact
                our support team.
              </p>
              <button
                onClick={() => (window.location.href = mailtoUrl)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Mail className="w-5 h-5" /> Contact Support
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterUploadView;
