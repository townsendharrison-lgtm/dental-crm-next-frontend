"use client";

import { EvidenceComparisonResult } from "../admin/EvidenceComparisonResult";
import type { PredictionResult as EvidencePrediction } from "@/lib/api/aiServer";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  FileText,
  ExternalLink,
  ShieldCheck,
  Search,
  School as SchoolIcon,
  ChevronRight,
  RotateCcw,
  ArrowUpRight,
  BookmarkPlus,
  BarChart2,
  Info,
  Check,
  Loader2,
  Zap,
} from "lucide-react";
import {
  PredictionResult,
  RequirementCheckItem,
  RoiImprovement,
  StudentProfileForPrediction,
  SchoolEvidence,
} from "@/lib/types";
import { schoolIntelligenceApi, useSchoolEvidence } from "@/lib/api/schoolIntelligence";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface SchoolPredictiveModelViewProps {
  initialStudent: StudentProfileForPrediction;
  initialPredictions: PredictionResult[];
  onSelectSchool?: (schoolId: string) => void;
  isMentorView?: boolean;
}

type FitTab = "ALL" | "Strong Fit" | "Target" | "Reach" | "Safety" | "High Risk";

export default function SchoolPredictiveModelView({
  initialStudent,
  initialPredictions,
  onSelectSchool,
  isMentorView = false,
}: SchoolPredictiveModelViewProps) {
  const [activeTab, setActiveTab] = useState<FitTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<PredictionResult | null>(
    initialPredictions[0] || null
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedStudent, setSimulatedStudent] =
    useState<StudentProfileForPrediction>(initialStudent);
  const [predictions, setPredictions] = useState<PredictionResult[]>(initialPredictions);
  const [isPredicting, setIsPredicting] = useState(false);

  // Evidence citation modal state
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [activeCitationSchoolId, setActiveCitationSchoolId] = useState<string | null>(null);
  const { data: schoolEvidences, isLoading: evidenceLoading } = useSchoolEvidence(
    activeCitationSchoolId || undefined
  );

  // Filtered schools
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      const matchesSearch =
        p.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "ALL" || p.fitCategory === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [predictions, searchQuery, activeTab]);

  // Keep selected school synced
  const currentSelected = useMemo(() => {
    if (!selectedSchool) return filteredPredictions[0] || null;
    return predictions.find((p) => p.schoolId === selectedSchool.schoolId) || filteredPredictions[0] || null;
  }, [predictions, selectedSchool, filteredPredictions]);

  // Run real-time simulation prediction
  const handleSimulateUpdate = async (updates: Partial<StudentProfileForPrediction>) => {
    const updated = { ...simulatedStudent, ...updates };
    setSimulatedStudent(updated);
    setIsPredicting(true);
    try {
      const res = await schoolIntelligenceApi.predict(updated);
      if (res && res.length > 0) {
        setPredictions(res.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1)));
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleResetSimulator = async () => {
    setSimulatedStudent(initialStudent);
    setIsPredicting(true);
    try {
      const res = await schoolIntelligenceApi.predict(initialStudent);
      if (res) setPredictions(res.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1)));
      toast.success("Reset simulator to active student profile");
    } finally {
      setIsPredicting(false);
    }
  };

  const openCitationInspector = (schoolId: string) => {
    setActiveCitationSchoolId(schoolId);
    setCitationModalOpen(true);
  };

  const handleApplyRoiAction = (roi: RoiImprovement) => {
    if (roi.category === "SHADOWING") {
      const current = Number(simulatedStudent.shadowingHours || 0);
      handleSimulateUpdate({ shadowingHours: current + 40 });
      toast.success(`Applied +40 Shadowing Hours to Simulator!`);
    } else if (roi.category === "DAT") {
      const current = Number(simulatedStudent.datAa || 20);
      handleSimulateUpdate({ datAa: current + 2, datTs: (simulatedStudent.datTs || current) + 2 });
      toast.success(`Applied +2 DAT score to Simulator!`);
    } else if (roi.category === "VOLUNTEERING") {
      const current = Number(simulatedStudent.volunteeringHours || 0);
      handleSimulateUpdate({ volunteeringHours: current + 30 });
      toast.success(`Applied +30 Volunteering Hours to Simulator!`);
    } else if (roi.category === "GPA") {
      const current = Number(simulatedStudent.cgpa || 3.4);
      handleSimulateUpdate({ cgpa: Math.min(4.0, Number((current + 0.15).toFixed(2))) });
      toast.success(`Applied GPA upward trajectory to Simulator!`);
    }
    setIsSimulating(true);
  };

  const getFitBadgeStyle = (category: PredictionResult["fitCategory"]) => {
    switch (category) {
      case "Strong Fit":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Target":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "Reach":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Safety":
        return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "High Risk":
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Student Snapshot Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              AI Predictive Admission Model & Fit Engine
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {simulatedStudent.name || "Student"}&apos;s Dental School Fit & Admission Forecast
            </h2>
            <p className="text-sm text-slate-400">
              Evaluated across 70+ US Dental Schools using multi-source scraped criteria, verified cutoffs, and outcome calibrated rubrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md cursor-pointer",
                isSimulating
                  ? "bg-indigo-600 text-white shadow-indigo-600/30 border border-indigo-400"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              )}
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              {isSimulating ? "Hide What-If Simulator" : "Interactive What-If Simulator"}
            </button>
          </div>
        </div>

        {/* Profile Metrics Snapshot Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">Cumulative GPA</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {simulatedStudent.cgpa ? Number(simulatedStudent.cgpa).toFixed(2) : "N/A"}
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">DAT AA / TS</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {simulatedStudent.datAa || "N/A"} / {simulatedStudent.datTs || simulatedStudent.datAa || "N/A"}
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">Shadowing Hours</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {simulatedStudent.shadowingHours ?? "Unknown"} hrs
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">Volunteering</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">
              {simulatedStudent.volunteeringHours ?? "Unknown"} hrs
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">State Residency</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {simulatedStudent.state || "Non-specified"}
            </div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium">LORs Collected</div>
            <div className="text-lg font-bold text-purple-400 mt-0.5">
              {simulatedStudent.lorCount ?? "Unknown"} Letters
            </div>
          </div>
        </div>
      </div>

      {/* Interactive What-If Simulator Panel */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-6 shadow-2xl space-y-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Interactive &quot;What-If&quot; Admission Simulator</h3>
                    <p className="text-xs text-slate-400">
                      Adjust your metrics in real-time to simulate changes in interview and acceptance probabilities.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetSimulator}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Actual Profile
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {/* GPA Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Cumulative GPA</span>
                    <span className="text-indigo-400 font-bold text-sm">
                      {Number(simulatedStudent.cgpa || 3.5).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2.5"
                    max="4.0"
                    step="0.05"
                    value={simulatedStudent.cgpa || 3.5}
                    onChange={(e) => handleSimulateUpdate({ cgpa: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>2.50</span>
                    <span>3.25</span>
                    <span>4.00</span>
                  </div>
                </div>

                {/* DAT AA Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">DAT Academic Average (AA)</span>
                    <span className="text-indigo-400 font-bold text-sm">
                      {simulatedStudent.datAa || 20}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="28"
                    step="1"
                    value={simulatedStudent.datAa || 20}
                    onChange={(e) =>
                      handleSimulateUpdate({
                        datAa: parseInt(e.target.value, 10),
                        datTs: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>15</span>
                    <span>21</span>
                    <span>28</span>
                  </div>
                </div>

                {/* Shadowing Hours Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Shadowing Hours</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {simulatedStudent.shadowingHours ?? "Unknown"} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="250"
                    step="10"
                    value={simulatedStudent.shadowingHours ?? "Unknown"}
                    onChange={(e) =>
                      handleSimulateUpdate({ shadowingHours: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0h</span>
                    <span>100h</span>
                    <span>250h+</span>
                  </div>
                </div>

                {/* Volunteering Hours Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Volunteering Hours</span>
                    <span className="text-purple-400 font-bold text-sm">
                      {simulatedStudent.volunteeringHours ?? "Unknown"} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="10"
                    value={simulatedStudent.volunteeringHours ?? "Unknown"}
                    onChange={(e) =>
                      handleSimulateUpdate({ volunteeringHours: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0h</span>
                    <span>100h</span>
                    <span>300h+</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: School List (Left) + Detailed Prediction Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filter Tabs & School Selector List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search and Category Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dental schools or states..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
              {(["ALL", "Strong Fit", "Target", "Reach", "Safety", "High Risk"] as FitTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer",
                    activeTab === tab
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* School Selection List */}
          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredPredictions.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6">
                <SchoolIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No dental schools match this filter.</p>
              </div>
            ) : (
              filteredPredictions.map((pred) => {
                const isSelected = currentSelected?.schoolId === pred.schoolId;
                return (
                  <div
                    key={pred.schoolId}
                    onClick={() => setSelectedSchool(pred)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group",
                      isSelected
                        ? "bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
                        : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                              getFitBadgeStyle(pred.fitCategory)
                            )}
                          >
                            {pred.fitCategory}
                          </span>
                          <span className="text-xs text-slate-400">{pred.location}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition">
                          {pred.schoolName}
                        </h4>
                      </div>

                      {/* Match Score Badge */}
                      <div className="text-right flex flex-col items-end">
                        <div className="text-base font-extrabold text-white flex items-center gap-1">
                          {pred.matchScore == null ? "Unknown" : `${pred.matchScore}/100 fit`}
                          <span className="text-[10px] text-slate-400 font-normal">Match</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium">
                          {pred.probabilities.acceptedProbability == null ? "Probability unavailable" : `${pred.probabilities.acceptedProbability ?? 0}% Accept`}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar of Acceptance / Interview */}
                    <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${pred.probabilities.acceptedProbability ?? 0}%` }}
                      />
                      <div
                        className="bg-indigo-500 h-full transition-all"
                        style={{ width: `${pred.probabilities.waitlistProbability ?? 0}%` }}
                      />
                      <div
                        className="bg-rose-500/60 h-full transition-all"
                        style={{ width: `${pred.probabilities.rejectionProbability ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Prediction & Diagnostics Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          {currentSelected ? (
            <EvidenceComparisonResult prediction={currentSelected as unknown as EvidencePrediction} />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
              Select a school from the left to view detailed predictions and recommendations.
            </div>
          )}
        </div>
      </div>

      {/* Evidence & Citation Verification Modal */}
      {citationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  Verified Admissions Sources & Citations
                </h3>
              </div>
              <button
                onClick={() => setCitationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3.5 flex-1 pr-1">
              {evidenceLoading ? (
                <div className="text-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading verified source citations...
                </div>
              ) : !schoolEvidences || schoolEvidences.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No evidence snippets ingested yet for this school.
                </div>
              ) : (
                schoolEvidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {ev.category} • {ev.field_label}
                      </span>
                      <div className="flex items-center gap-2">
                        {ev.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 font-medium">
                            Extracted via {ev.source_type}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 italic font-serif">
                      &ldquo;{ev.raw_snippet}&rdquo;
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Source: {ev.source_name} {ev.page_number ? `(Page ${ev.page_number})` : ""}</span>
                      {ev.source_url && (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          View Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setCitationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
