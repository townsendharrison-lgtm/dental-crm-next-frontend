"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import type { LetterOfRecommendationRequest, Student } from "@/lib/types";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { useLorRequests, useUpdateLorStatus, useDeleteLorRequest } from "@/lib/hooks/useLor";
import { lorApi } from "@/lib/api/lor";
import {
  CheckCircle,
  XCircle,
  Eye,
  User,
  Calendar,
  FileText,
  Search,
  ArrowRight,
  AlertCircle,
  Download,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  X,
  Link,
  Timer,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";

interface AdminLetterReviewProps {
  students?: Student[];
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string, reason?: string) => void;
}

type StatusFilter = "ALL" | "UPLOADED" | "REQUESTED" | "REVIEWED" | "DECLINED";

function getDaysUntilDue(dueDate: string | undefined): {
  days: number;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  urgent: boolean;
} | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 7)
    return {
      days: diff,
      label: `${diff} days left`,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      urgent: false,
    };
  if (diff > 3)
    return {
      days: diff,
      label: `${diff} days left`,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      urgent: false,
    };
  if (diff > 0)
    return {
      days: diff,
      label: `${diff} day${diff === 1 ? "" : "s"} left`,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      urgent: true,
    };
  if (diff === 0)
    return {
      days: 0,
      label: "DUE TODAY",
      color: "text-rose-400",
      bgColor: "bg-rose-500/15",
      borderColor: "border-rose-500/30",
      urgent: true,
    };
  return {
    days: diff,
    label: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`,
    color: "text-rose-500",
    bgColor: "bg-rose-500/20",
    borderColor: "border-rose-500/40",
    urgent: true,
  };
}

export const AdminLetterReview: React.FC<AdminLetterReviewProps> = ({
  students = [],
  onAccept,
  onDecline,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<LetterOfRecommendationRequest | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docDownloadLoading, setDocDownloadLoading] = useState(false);
  const [copyingLink, setCopyingLink] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "bulk";
    id?: string;
    ids?: string[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // React Query queries + mutations
  const { data: allRequests = [], isLoading: loading, isFetching, error: fetchError, refetch } = useLorRequests();
  const updateStatusMutation = useUpdateLorStatus();
  const deleteRequestMutation = useDeleteLorRequest();

  const pendingRequests = allRequests.filter((r) => r.status === "UPLOADED");

  const filteredHistory = allRequests.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const name = r.studentName || getStudentName(r.studentId || "");
    const writer = r.writerName || "";
    const code = r.accessCode || "";
    const matchesSearch =
      !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      writer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredPending = pendingRequests.filter((r) => {
    const name = r.studentName || getStudentName(r.studentId || "");
    const writer = r.writerName || "";
    const code = r.accessCode || "";
    return (
      !searchTerm ||
      writer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  function getStudentName(studentId: string) {
    return students.find((s) => s.id === studentId)?.name || "Unknown Student";
  }

  function getName(r: LetterOfRecommendationRequest) {
    return r.studentName || getStudentName(r.studentId || "");
  }

  function getWriter(r: LetterOfRecommendationRequest) {
    return r.writerName || "Unknown";
  }

  function getCode(r: LetterOfRecommendationRequest) {
    return r.accessCode || "";
  }

  function getDueDate(r: LetterOfRecommendationRequest) {
    return r.dueDate;
  }

  function getUploadedAt(r: LetterOfRecommendationRequest) {
    return r.uploadedAt;
  }

  function getReviewedAt(r: LetterOfRecommendationRequest) {
    return r.reviewedAt;
  }

  function getRequestedAt(r: LetterOfRecommendationRequest) {
    return r.requestedAt;
  }

  const handleAccept = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: "REVIEWED" });
      toast.success("Letter accepted and student/writer notified.");
      if (onAccept) onAccept(id);
      setSelectedRequest(null);
    } catch {
      toast.error("Failed to approve letter status.");
    }
  };

  const handleDecline = async (id: string, reason: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: "DECLINED", declineReason: reason });
      toast.success("Letter declined and writer notified for re-submission.");
      if (onDecline) onDecline(id, reason);
      setSelectedRequest(null);
      setShowDeclineModal(null);
      setDeclineReason("");
    } catch {
      toast.error("Failed to decline letter status.");
    }
  };

  const handleViewDocument = async (requestId: string) => {
    setDocLoading(true);
    try {
      const url = await lorApi.getDocumentSignedUrl(requestId, false);
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Signed URL not found.");
      }
    } catch {
      toast.error("Failed to fetch letter document view URL.");
    }
    setDocLoading(false);
  };

  const handleDownloadDocument = async (req: LetterOfRecommendationRequest) => {
    setDocDownloadLoading(true);
    try {
      const url = await lorApi.getDocumentSignedUrl(req.id, true);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `LOR_${getName(req).replace(/\s+/g, "_")}_${getWriter(req).replace(
          /\s+/g,
          "_"
        )}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        toast.error("Signed URL not found.");
      }
    } catch {
      toast.error("Failed to fetch letter document download URL.");
    }
    setDocDownloadLoading(false);
  };

  const handleCopyTrackingLink = async (requestId: string) => {
    setCopyingLink(requestId);
    try {
      const trackingUrl = await lorApi.getTrackingLink(requestId);
      if (trackingUrl) {
        await navigator.clipboard.writeText(trackingUrl);
        toast.success("Tracking link copied to clipboard!");
      } else {
        toast.error("Tracking URL not found.");
      }
    } catch {
      toast.error("Failed to copy tracking link.");
    }
    setCopyingLink(null);
  };

  const handleDeleteRequest = async (id: string) => {
    setDeleting(true);
    try {
      await deleteRequestMutation.mutateAsync(id);
      toast.success("Letter request deleted successfully.");
      setDeleteTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete request");
    }
    setDeleting(false);
  };

  const handleBulkDelete = async (ids: string[]) => {
    setDeleting(true);
    try {
      await lorApi.bulkDeleteRequests(ids);
      await refetch();
      toast.success("Selected requests deleted successfully.");
      setDeleteTarget(null);
      setSelectedIds(new Set());
      setSelectedRequest(null);
    } catch {
      toast.error("Failed to delete selected requests.");
    }
    setDeleting(false);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map((r) => r.id)));
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      REQUESTED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      UPLOADED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      REVIEWED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      DECLINED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
    return (
      <span
        className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-widest ${
          styles[status] || styles.REQUESTED
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Title & description shown only on mobile */}
      <div className="lg:hidden">
        <h2 className="text-3xl font-bold text-white mb-1">Letter Review Queue</h2>
        <p className="text-slate-400 flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> Review and approve uploaded letters of
          recommendation.
        </p>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between gap-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-400/70">{(fetchError as Error)?.message || "Network Error"}</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => refetch()}
            className="cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Tabs & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Tab Switch */}
        <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
          <Button
            onClick={() => setActiveTab("pending")}
            variant={activeTab === "pending" ? "primary" : "ghost"}
            size="sm"
            leftIcon={<Clock className="w-4 h-4" />}
            className="cursor-pointer font-bold"
          >
            Pending Review
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                {pendingRequests.length}
              </span>
            )}
          </Button>
          <Button
            onClick={() => setActiveTab("history")}
            variant={activeTab === "history" ? "primary" : "ghost"}
            size="sm"
            leftIcon={<FileText className="w-4 h-4" />}
            className="cursor-pointer font-bold"
          >
            Request History
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Tooltip content="Refresh queue">
            <RefreshButton onClick={() => refetch()} isLoading={loading || isFetching} />
          </Tooltip>
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, writer, or ID..."
              className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all w-full md:w-80"
            />
          </div>
        </div>
      </div>

      {activeTab === "pending" && (
        <>
          {/* Urgency Banner */}
          {(() => {
            const nearestReq = filteredPending
              .filter((r) => getDueDate(r))
              .sort((a, b) => new Date(getDueDate(a)).getTime() - new Date(getDueDate(b)).getTime())[0];
            const countdown = nearestReq ? getDaysUntilDue(getDueDate(nearestReq)) : null;
            if (!countdown) return null;
            return (
              <div
                className={`flex items-center gap-4 p-5 rounded-2xl border ${countdown.bgColor} ${
                  countdown.borderColor
                } ${countdown.urgent ? "animate-pulse" : ""}`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${countdown.bgColor} border ${countdown.borderColor}`}
                >
                  <Timer className={`w-6 h-6 ${countdown.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                    Nearest Deadline
                  </p>
                  <p className="text-lg font-black text-white">
                    {parseLocalDate(getDueDate(nearestReq)).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${countdown.color}`}>{countdown.label}</p>
                  <p className="text-xs text-slate-500">
                    for {getWriter(nearestReq)} → {getName(nearestReq)}
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Pending Review</h3>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {filteredPending.length} Pending
                  </span>
                </div>

                <div className="divide-y divide-slate-800">
                  {filteredPending.length > 0 ? (
                    filteredPending.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`p-8 transition-all cursor-pointer hover:bg-slate-800/30 ${
                          selectedRequest?.id === req.id
                            ? "bg-indigo-600/5 border-l-4 border-l-indigo-600"
                            : ""
                        }`}
                      >
                        {/* Due date countdown badge */}
                        {(() => {
                          const cd = getDaysUntilDue(getDueDate(req));
                          if (!cd) return null;
                          return (
                            <div
                              className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border ${cd.bgColor} ${cd.borderColor}`}
                            >
                              <Timer className={`w-4 h-4 ${cd.color} shrink-0`} />
                              <span className={`text-sm font-bold ${cd.color}`}>
                                Due{" "}
                                {getDueDate(req)
                                  ? parseLocalDate(getDueDate(req)).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </span>
                              <span className={`text-sm font-black ${cd.color} ml-auto`}>
                                {cd.label}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-lg">{getWriter(req)}</h4>
                              <p className="text-sm text-slate-500">For {getName(req)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-[9px]">
                                Uploaded
                              </p>
                              <p className="text-sm font-bold text-white">
                                {getUploadedAt(req)
                                  ? new Date(getUploadedAt(req)!).toLocaleDateString()
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-[9px]">
                                Access ID
                              </p>
                              <code className="text-xs font-bold text-indigo-400">
                                {getCode(req)}
                              </code>
                            </div>
                            <ArrowRight
                              className={`w-5 h-5 text-slate-600 transition-transform ${
                                selectedRequest?.id === req.id
                                  ? "translate-x-2 text-indigo-400"
                                  : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-20 text-center">
                      <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center text-slate-800 mx-auto mb-6 border border-slate-800">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">Queue is empty</h4>
                      <p className="text-slate-500 max-w-xs mx-auto text-sm">
                        All letters have been reviewed. Great job!
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {selectedRequest ? (
                <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 sticky top-8 animate-in slide-in-from-right duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Review Details</h3>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="p-2 hover:bg-slate-800 rounded-full text-slate-500 cursor-pointer"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Large Due Date Countdown */}
                    {(() => {
                      const cd = getDaysUntilDue(getDueDate(selectedRequest));
                      if (!cd) return null;
                      return (
                        <div className={`p-5 rounded-2xl border text-center ${cd.bgColor} ${cd.borderColor}`}>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-[9px]">
                            Due Date
                          </p>
                          <p className="text-lg font-black text-white">
                            {parseLocalDate(getDueDate(selectedRequest)).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className={`text-2xl font-black mt-1 ${cd.color}`}>{cd.label}</p>
                        </div>
                      );
                    })()}

                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                            Student
                          </p>
                          <p className="font-bold text-white">{getName(selectedRequest)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center text-amber-400">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                            Due Date
                          </p>
                          <p className="font-bold text-white">
                            {getDueDate(selectedRequest)
                              ? parseLocalDate(getDueDate(selectedRequest)).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyTrackingLink(selectedRequest.id)}
                        disabled={copyingLink === selectedRequest.id}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50 text-sm"
                      >
                        {copyingLink === selectedRequest.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link className="w-4 h-4" />
                        )}
                        {copyingLink === selectedRequest.id ? "Copying..." : "Copy Student Tracking Link"}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                        Actions
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleAccept(selectedRequest.id)}
                          className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer text-sm"
                        >
                          <CheckCircle className="w-5 h-5" /> Accept
                        </button>
                        <button
                          onClick={() => setShowDeclineModal(selectedRequest.id)}
                          className="flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer text-sm"
                        >
                          <XCircle className="w-5 h-5" /> Decline
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                        Document Preview
                      </h4>
                      <div className="aspect-[3/4] bg-slate-950 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center group">
                        <FileText className="w-16 h-16 text-slate-800 mb-4 group-hover:text-indigo-500 transition-colors" />
                        <p className="text-sm text-slate-500 mb-6 truncate max-w-full">
                          Letter of Recommendation.pdf
                        </p>
                        <div className="flex flex-col gap-3 w-full">
                          <button
                            onClick={() => handleViewDocument(selectedRequest.id)}
                            disabled={docLoading}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all w-full cursor-pointer disabled:opacity-50 text-sm"
                          >
                            {docLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            {docLoading ? "Loading..." : "View Full PDF"}
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(selectedRequest)}
                            disabled={docDownloadLoading}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all w-full cursor-pointer disabled:opacity-50 text-sm"
                          >
                            {docDownloadLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            {docDownloadLoading ? "Downloading..." : "Download PDF"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="bg-slate-900/50 border border-dashed border-slate-800 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                  <AlertCircle className="w-12 h-12 text-slate-800 mb-4" />
                  <h4 className="text-lg font-bold text-slate-600 mb-2">No Letter Selected</h4>
                  <p className="text-sm text-slate-700 max-w-[200px]">
                    Select a letter from the queue to start the review process.
                  </p>
                </section>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Status Filter + Bulk Actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-4 h-4 text-slate-500" />
              {(["ALL", "REQUESTED", "UPLOADED", "REVIEWED", "DECLINED"] as StatusFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === f
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setDeleteTarget({ type: "bulk", ids: Array.from(selectedIds) })}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedIds.size} Selected
              </button>
            )}
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-5 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredHistory.length ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Student
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Writer
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Status
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px] min-w-[220px]">
                      Access ID
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Due Date
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Requested
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Uploaded
                    </th>
                    <th className="text-left px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Reviewed
                    </th>
                    <th className="text-right px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((req, index) => (
                      <tr
                        key={req.id}
                        className={`hover:bg-slate-800/20 transition-colors ${
                          index % 2 === 1 ? "bg-slate-950/25" : ""
                        } ${selectedIds.has(req.id) ? "bg-indigo-600/5" : ""}`}
                      >
                        <td className="px-4 py-5">
                          <button
                            onClick={() => toggleSelectId(req.id)}
                            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                          >
                            {selectedIds.has(req.id) ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-5 text-sm font-bold text-white">{getName(req)}</td>
                        <td className="px-4 py-5">
                          <div>
                            <p className="text-sm text-white">{getWriter(req)}</p>
                            <p className="text-xs text-slate-500">{req.writerEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="space-y-1">
                            {statusBadge(req.status)}
                            {req.status === "DECLINED" && req.declineReason && (
                              <p
                                className="text-[10px] text-rose-400 max-w-[200px] truncate"
                                title={req.declineReason}
                              >
                                {req.declineReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <code className="text-xs font-mono text-indigo-400 font-bold">
                            {getCode(req)}
                          </code>
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-400">
                          {getDueDate(req) ? parseLocalDate(getDueDate(req)).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-400">
                          {getRequestedAt(req)
                            ? new Date(getRequestedAt(req)).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-400">
                          {getUploadedAt(req)
                            ? new Date(getUploadedAt(req)!).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-400">
                          {getReviewedAt(req)
                            ? new Date(getReviewedAt(req)!).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {(req.status === "UPLOADED" || req.status === "REVIEWED") && (
                              <>
                                <button
                                  onClick={() => handleViewDocument(req.id)}
                                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                                <button
                                  onClick={() => handleDownloadDocument(req)}
                                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" /> Download
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-8 py-16 text-center text-slate-500">
                        No requests match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Showing {Math.min(filteredHistory.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                  {Math.min(filteredHistory.length, currentPage * itemsPerPage)} of{" "}
                  {filteredHistory.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const page = idx + 1;
                    if (
                      totalPages > 5 &&
                      page !== 1 &&
                      page !== totalPages &&
                      Math.abs(page - currentPage) > 1
                    ) {
                      if (page === 2 || page === totalPages - 1) {
                        return <span key={page} className="text-slate-600 px-1">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentPage === page
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {deleteTarget.type === "bulk"
                    ? `Delete ${deleteTarget.ids?.length} Request${
                        (deleteTarget.ids?.length || 0) > 1 ? "s" : ""
                      }?`
                    : "Delete Request?"}
                </h3>
                <p className="text-sm text-slate-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-2">
              <p className="text-sm text-slate-300 leading-relaxed">This will permanently delete:</p>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li>The letter request record{deleteTarget.type === "bulk" ? "s" : ""}</li>
                <li>
                  Any uploaded PDF document{deleteTarget.type === "bulk" ? "s" : ""} from storage
                </li>
                <li>Associated email log entries</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget.type === "single" && deleteTarget.id) {
                    handleDeleteRequest(deleteTarget.id);
                  } else if (deleteTarget.type === "bulk" && deleteTarget.ids) {
                    handleBulkDelete(deleteTarget.ids);
                  }
                }}
                disabled={deleting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowDeclineModal(null)}
          />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Decline Letter</h3>
              <button
                onClick={() => setShowDeclineModal(null)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Please provide a reason for declining. This will be sent to the letter writer so they can
              make corrections and re-upload.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. The letter is missing the official letterhead. Please resubmit on letterhead with a signature."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm resize-none focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeclineModal(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecline(showDeclineModal, declineReason)}
                disabled={!declineReason.trim()}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <XCircle className="w-4 h-4" /> Decline & Notify Writer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLetterReview;
