"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Sliders,
  Award,
  Zap,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users,
  ShieldAlert,
  BarChart3,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Check,
  Scale,
  Percent,
  HelpCircle,
  Target,
  FileCheck,
  Stethoscope,
  HeartHandshake,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  EmptyState,
} from "@/components/ui";
import { SelectMenu, SelectMenuOption } from "@/components/ui/SelectMenu";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import {
  aiServerApi,
  StudentComparisonProfile,
  DentalSchoolProfile,
  PredictionResult,
  ComparisonPointItem,
  DetailedProbabilitiesAndRates,
  PreparationAuditChecklist,
} from "@/lib/api/aiServer";
import type { School } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDATScore, toCanonicalDAT } from "@/lib/utils/datUtils";

interface Props {
  schools: School[] | DentalSchoolProfile[];
  initialSchoolId?: string;
  initialStudentId?: string;
}

export default function AdminStudentSchoolComparisonView({
  schools = [],
  initialSchoolId,
  initialStudentId,
}: Props) {
  // Live CRM Students
  const { data: realStudents = [], isLoading: isLoadingStudents } = useStudents();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    initialSchoolId || (schools[0] as any)?.id || ""
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || "");

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [hasEvaluated, setHasEvaluated] = useState(false);

  // What-If Simulator toggle & state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simGpa, setSimGpa] = useState<number>(3.65);
  const [simDat, setSimDat] = useState<number>(420);
  const [simShadowing, setSimShadowing] = useState<number>(85);
  const [simVolunteering, setSimVolunteering] = useState<number>(100);

  // Comparison chart filter
  const [chartFilter, setChartFilter] = useState<"ALL" | "SURPLUS" | "FULFILLED" | "PARTIAL" | "MISSING">("ALL");

  // Set default initial selections
  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId((schools[0] as any).id);
    }
  }, [schools, selectedSchoolId]);

  useEffect(() => {
    if (realStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(realStudents[0].id);
    }
  }, [realStudents, selectedStudentId]);

  // Active School Object (from admin added schools only)
  const activeSchool = useMemo(() => {
    return schools.find((s) => (s as any).id === selectedSchoolId) || (schools[0] as any) || null;
  }, [schools, selectedSchoolId]);

  // Active Student Object (from CRM students)
  const activeStudent = useMemo(() => {
    return realStudents.find((s) => s.id === selectedStudentId) || realStudents[0] || null;
  }, [realStudents, selectedStudentId]);

  // Sync simulator sliders when active student changes
  useEffect(() => {
    if (activeStudent) {
      const rawGpa = activeStudent.gpa || (activeStudent as any).cgpa || 3.5;
      setSimGpa(Number(rawGpa));
      const rawDat = activeStudent.datAA || activeStudent.datScore || 20;
      setSimDat(toCanonicalDAT(rawDat));
      setSimShadowing(85);
      setSimVolunteering(100);
      setPrediction(null);
      setHasEvaluated(false);
    }
  }, [activeStudent]);

  // SelectMenu Options
  const schoolOptions: SelectMenuOption[] = useMemo(() => {
    return schools.map((s: any) => ({
      value: s.id,
      label: `${s.name} (${s.location || "US"})`,
    }));
  }, [schools]);

  const studentOptions: SelectMenuOption[] = useMemo(() => {
    return realStudents.map((st) => ({
      value: st.id,
      label: `${st.name} (GPA: ${st.gpa || "N/A"} · DAT: ${formatDATScore(st.datAA || st.datScore)})`,
    }));
  }, [realStudents]);

  // Data Sufficiency Validation
  const dataSufficiency = useMemo(() => {
    const issues: { type: "SCHOOL" | "STUDENT"; message: string }[] = [];

    if (!activeSchool) {
      issues.push({ type: "SCHOOL", message: "No dental school selected." });
    }

    if (!activeStudent) {
      issues.push({ type: "STUDENT", message: "No student profile selected." });
    } else {
      if (!activeStudent.gpa && !(activeStudent as any).cgpa) {
        issues.push({
          type: "STUDENT",
          message: `${activeStudent.name}'s profile is missing a Cumulative GPA. Please update their profile in the CRM dashboard.`,
        });
      }
      const dat = activeStudent.datAA || activeStudent.datScore;
      if (!dat) {
        issues.push({
          type: "STUDENT",
          message: `${activeStudent.name}'s profile is missing a DAT score. Please update their profile in the CRM dashboard.`,
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }, [activeSchool, activeStudent]);

  // Execute 1-to-1 Evaluation
  const handleEvaluate = async () => {
    if (!activeStudent || !activeSchool) {
      return toast.error("Please select both a school and a student");
    }

    setIsEvaluating(true);
    try {
      const studentGpa = showSimulator ? simGpa : Number(activeStudent.gpa || (activeStudent as any).cgpa || 3.65);
      const studentDat = showSimulator ? simDat : toCanonicalDAT(Number(activeStudent.datAA || activeStudent.datScore || 21));
      const studentShadowing = showSimulator ? simShadowing : Number((activeStudent as any).shadowingHours || (activeStudent as any).profile?.shadowing_hours || 85);
      const studentVolunteering = showSimulator ? simVolunteering : Number((activeStudent as any).volunteeringHours || (activeStudent as any).profile?.volunteering_hours || 100);

      const studentPayload: StudentComparisonProfile = {
        id: activeStudent.id,
        name: activeStudent.name,
        email: activeStudent.email,
        cgpa: studentGpa,
        sgpa: Number((activeStudent as any).sgpa || activeStudent.profile?.sgpa || studentGpa - 0.05),
        bcp_gpa: Number((activeStudent as any).sgpa || activeStudent.profile?.sgpa || studentGpa - 0.05),
        dat_aa: studentDat,
        dat_ts: Number(activeStudent.datTS || activeStudent.profile?.dat_ts || studentDat),
        dat_pat: Number((activeStudent as any).datPAT || activeStudent.profile?.dat_pat || 20),
        shadowing_hours: studentShadowing,
        volunteering_hours: studentVolunteering,
        dental_experience_hours: 60,
        research_hours: 40,
        state: activeStudent.state || "Massachusetts",
        undergrad_institution: activeStudent.undergradInstitution || "University",
        major: activeStudent.profile?.major || "Biology",
        completed_courses: [],
        lor_science_faculty_count: 2,
        lor_dentist_count: 1,
        total_lor_count: 3,
      };

      const result = await aiServerApi.compareStudentWithSchool({
        school_id: activeSchool.id,
        custom_student_profile: studentPayload,
        include_ai_reasoning: true,
      });

      setPrediction(result);
      setHasEvaluated(true);
      toast.success(`Evaluated ${activeStudent.name} against ${activeSchool.name}!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to evaluate student vs school");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper badge for status
  const getPointStatusBadge = (status: string) => {
    switch (status) {
      case "SURPLUS":
        return (
          <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
            SURPLUS / EXCEEDS
          </span>
        );
      case "FULFILLED":
        return (
          <span className="rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold">
            FULFILLED
          </span>
        );
      case "PARTIAL":
        return (
          <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
            PARTIAL
          </span>
        );
      case "MISSING":
      default:
        return (
          <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold">
            MISSING / DEFICIT
          </span>
        );
    }
  };

  // Filter comparison points
  const filteredPoints = useMemo(() => {
    if (!prediction?.comparison_points) return [];
    if (chartFilter === "ALL") return prediction.comparison_points;
    return prediction.comparison_points.filter((pt) => pt.status === chartFilter);
  }, [prediction, chartFilter]);

  // Points breakdown counts
  const pointCounts = useMemo(() => {
    const points = prediction?.comparison_points || [];
    return {
      total: points.length,
      fulfilled: points.filter((p) => p.status === "FULFILLED" || p.status === "SURPLUS").length,
      partial: points.filter((p) => p.status === "PARTIAL").length,
      missing: points.filter((p) => p.status === "MISSING" || p.status === "CRITICAL_DEFICIT").length,
    };
  }, [prediction]);

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      {/* =================================================================== */}
      {/* 1. SIDE-BY-SIDE SELECTION CONTROL PANEL */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
            1-on-1 Student Profile Comparison & Saturated Audit
          </span>
          <h2 className="text-lg font-bold text-white mt-1">
            Compare Applicant Against Target Dental School
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Benchmarks the student profile against school requirements calibrated on a percentile target range, generates an interactive comparison chart, and computes detailed acceptance odds.
          </p>
        </div>

        {/* Side-by-Side Selector Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT SIDE: SELECT TARGET SCHOOL (Admin Added Only) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-indigo-400" />
                Target Dental School
              </span>
              <span className="text-[11px] text-slate-400">
                {schools.length} Managed Schools
              </span>
            </div>

            <SelectMenu
              value={selectedSchoolId}
              onChange={(val) => {
                setSelectedSchoolId(val);
                setPrediction(null);
                setHasEvaluated(false);
              }}
              options={schoolOptions}
              placeholder="Select a dental school..."
              leftIcon={<GraduationCap className="h-3.5 w-3.5 text-slate-400" />}
              className="w-full text-xs"
            />

            {activeSchool && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs space-y-1.5">
                <div className="font-semibold text-slate-100">{activeSchool.name}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  {activeSchool.location || "United States"}
                </div>
                <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-slate-300">
                  <span>Avg cGPA: <strong className="text-emerald-400">{activeSchool.avg_gpa || "3.55"}</strong></span>
                  <span>Avg DAT AA: <strong className="text-indigo-400">{formatDATScore(activeSchool.dat_avg || 420)}</strong></span>
                  <span>Acceptance: <strong className="text-slate-200">{activeSchool.acceptance_rate ? `${activeSchool.acceptance_rate}%` : "8.5%"}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: SELECT STUDENT PROFILE (CRM Students) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-400" />
                Student Profile
              </span>
              <span className="text-[11px] text-slate-400">
                {realStudents.length} Active Students
              </span>
            </div>

            <SelectMenu
              value={selectedStudentId}
              onChange={(val) => {
                setSelectedStudentId(val);
                setPrediction(null);
                setHasEvaluated(false);
              }}
              options={studentOptions}
              placeholder="Select an applicant..."
              leftIcon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              className="w-full text-xs"
            />

            {activeStudent && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{activeStudent.name}</span>
                  <span className="text-[10px] rounded bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 border border-indigo-500/20">
                    {activeStudent.profile?.major || "Predental / Biology"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Residency: <strong className="text-slate-200">{activeStudent.state || "Massachusetts"}</strong>
                </div>
                <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-slate-300">
                  <span>cGPA: <strong className="text-emerald-400">{activeStudent.gpa || "3.50"}</strong></span>
                  <span>sGPA: <strong className="text-emerald-400">{activeStudent.profile?.sgpa || "3.45"}</strong></span>
                  <span>DAT AA: <strong className="text-indigo-400">{formatDATScore(activeStudent.datAA || activeStudent.datScore || 21)}</strong></span>
                  <span>Shadowing: <strong className="text-slate-200">85h</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Sufficiency Warning Notices */}
        {!dataSufficiency.isValid && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Action Required: Insufficient Data to Run Precision Comparison
            </div>
            <ul className="list-disc pl-5 text-xs text-amber-200/90 space-y-1">
              {dataSufficiency.issues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Central Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Admissions Committee Simulation & Predictive Diagnostics</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
              className="text-xs gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5" />
              {showSimulator ? "Hide What-If Sliders" : "What-If Simulator"}
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={isEvaluating}
              onClick={handleEvaluate}
              className="text-xs gap-2 px-5 py-2 font-bold shadow-md shadow-indigo-600/30"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating Admissions Odds...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Evaluate & Generate Comparison Chart
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. OPTIONAL INTERACTIVE WHAT-IF SLIDERS */}
      {/* =================================================================== */}
      {showSimulator && (
        <div className="rounded-xl border border-indigo-500/30 bg-slate-900 p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                What-If Scenario Simulator
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust sliders to test how score improvements change admission odds for {activeSchool?.name}.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSimGpa(activeStudent?.gpa || 3.5);
                setSimDat(toCanonicalDAT(activeStudent?.datAA || 21));
                setSimShadowing(85);
                setSimVolunteering(100);
              }}
              className="text-xs h-7"
            >
              Reset Values
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 pt-1">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Simulated cGPA</span>
                <span className="text-emerald-400 font-mono text-sm">{simGpa.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="4.0"
                step="0.05"
                value={simGpa}
                onChange={(e) => setSimGpa(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Simulated DAT AA</span>
                <span className="text-indigo-400 font-mono text-sm">{formatDATScore(simDat)}</span>
              </div>
              <input
                type="range"
                min="200"
                max="600"
                step="10"
                value={simDat}
                onChange={(e) => setSimDat(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Shadowing Hours</span>
                <span className="text-emerald-400 font-mono text-sm">{simShadowing}h</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={simShadowing}
                onChange={(e) => setSimShadowing(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Volunteering Hours</span>
                <span className="text-amber-400 font-mono text-sm">{simVolunteering}h</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={simVolunteering}
                onChange={(e) => setSimVolunteering(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. EVALUATION RESULTS & INSIGHTS VIEW */}
      {/* =================================================================== */}
      {!hasEvaluated && !isEvaluating && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <EmptyState
            icon={<Sparkles className="h-10 w-10 text-indigo-400" />}
            title="Ready for Evaluation"
            description="Click 'Evaluate & Generate Comparison Chart' above to benchmark this applicant against the target school with dynamic percentile weighting."
          />
        </div>
      )}

      {isEvaluating && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <div className="text-sm font-bold text-white">Running LangGraph Predictive Model...</div>
          <p className="text-xs text-slate-400">
            Evaluating student profile against school requirements on a normalized percentile scale, auditing preparation checklist, and computing acceptance rate breakdown.
          </p>
        </div>
      )}

      {hasEvaluated && prediction && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* A. STANDING & 4-OUTCOME PROBABILITY CARDS */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Match Score & Fit */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                OVERALL ADMISSION STANDING
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-white font-mono">
                  {prediction.matchScore}%
                </span>
                <span
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-bold uppercase border",
                    prediction.fitCategory.includes("Strong") || prediction.fitCategory.includes("Safety")
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : prediction.fitCategory.includes("Target")
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      : prediction.fitCategory.includes("Reach")
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  )}
                >
                  {prediction.fitCategory}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {prediction.diagnostics?.mostLikelyReason || "Strong competitive fit based on academic and DAT standing."}
              </p>
            </div>

            {/* 4 Outcome Probability Funnel */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  CALIBRATED OUTCOME PROBABILITIES
                </span>
                <span className="text-[11px] text-indigo-400 font-mono font-medium">
                  {activeSchool?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Interview</div>
                  <div className="text-2xl font-black text-white font-mono">
                    {prediction.probabilities.interviewProbability}%
                  </div>
                  <div className="text-[10px] text-emerald-400/80">High Invitation Odds</div>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-blue-950/30 p-3.5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-blue-400">Acceptance</div>
                  <div className="text-2xl font-black text-white font-mono">
                    {prediction.probabilities.acceptedProbability}%
                  </div>
                  <div className="text-[10px] text-blue-400/80">Final Offer Chance</div>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-3.5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-amber-400">Waitlist</div>
                  <div className="text-2xl font-black text-white font-mono">
                    {prediction.probabilities.waitlistProbability}%
                  </div>
                  <div className="text-[10px] text-amber-400/80">Secondary Pool</div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-950 p-3.5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Rejection</div>
                  <div className="text-2xl font-black text-slate-300 font-mono">
                    {prediction.probabilities.rejectionProbability}%
                  </div>
                  <div className="text-[10px] text-slate-500">Post-Screening</div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* B. INTERACTIVE COMPARISON CHART (Fulfilled vs Partial vs Missing) */}
          {/* =================================================================== */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Scale className="h-4 w-4 text-indigo-400" />
                  Interactive Comparison Chart & Criteria Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Points evaluated against school requirements with school-specific weights calibrated from the percentile directory.
                </p>
              </div>

              {/* Status Filter Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setChartFilter("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                    chartFilter === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  All ({pointCounts.total})
                </button>
                <button
                  onClick={() => setChartFilter("FULFILLED")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                    chartFilter === "FULFILLED"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/30"
                  )}
                >
                  Fulfilled ({pointCounts.fulfilled})
                </button>
                <button
                  onClick={() => setChartFilter("PARTIAL")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                    chartFilter === "PARTIAL"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 border border-amber-500/30"
                  )}
                >
                  Partial ({pointCounts.partial})
                </button>
                <button
                  onClick={() => setChartFilter("MISSING")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                    chartFilter === "MISSING"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-500/30"
                  )}
                >
                  Missing ({pointCounts.missing})
                </button>
              </div>
            </div>

            {/* Comparison Points Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                  <tr>
                    <th className="py-3 px-4">Evaluation Point</th>
                    <th className="py-3 px-4 text-center">Student Score</th>
                    <th className="py-3 px-4 text-center">School Target</th>
                    <th className="py-3 px-4 text-center">Target Range</th>
                    <th className="py-3 px-4 text-center">Calibrated Weight</th>
                    <th className="py-3 px-4 text-center">Fulfillment Bar</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredPoints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No criteria matching current status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPoints.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-100">{pt.metric_name}</div>
                          <div className="text-[11px] text-slate-400">{pt.impact_description}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                          {pt.student_value}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-200">
                          {pt.school_target}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                          {pt.baseline_value} → {pt.skyline_value}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-indigo-300 font-bold border border-indigo-500/20">
                            {pt.weight_percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  pt.fulfillment_percentage >= 100
                                    ? "bg-emerald-500"
                                    : pt.fulfillment_percentage >= 70
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                )}
                                style={{ width: `${Math.min(100, pt.fulfillment_percentage)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-300">
                              {pt.fulfillment_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getPointStatusBadge(pt.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* =================================================================== */}
          {/* C. COMPLETE SUITE OF ACCEPTANCE PROBABILITIES & DETAILED RATES */}
          {/* =================================================================== */}
          {prediction.detailed_probabilities && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  Comprehensive Suite of Acceptance Probabilities & Detailed Rates
                </h3>
                <span className="text-xs text-slate-400">
                  Official Demographic & Sub-Cohort Breakdown
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {/* 1. Overall Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Overall Acceptance</span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {prediction.detailed_probabilities.overall_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">General applicant pool</div>
                </div>

                {/* 2. Interviewed Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Interviewed Acceptance</span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {prediction.detailed_probabilities.interviewed_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">Post-interview offer rate</div>
                </div>

                {/* 3. In-State Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">In-State Acceptance</span>
                  <div className="text-2xl font-black font-mono text-indigo-400">
                    {prediction.detailed_probabilities.in_state_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">Resident applicants</div>
                </div>

                {/* 4. Out-of-State Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Out-of-State Acceptance</span>
                  <div className="text-2xl font-black font-mono text-indigo-400">
                    {prediction.detailed_probabilities.out_of_state_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">Non-resident applicants</div>
                </div>

                {/* 5. International Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">International Acceptance</span>
                  <div className="text-2xl font-black font-mono text-amber-400">
                    {prediction.detailed_probabilities.international_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">Foreign degree holders</div>
                </div>

                {/* 6. Male Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Male Acceptance</span>
                  <div className="text-2xl font-black font-mono text-slate-200">
                    {prediction.detailed_probabilities.male_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">Gender sub-cohort</div>
                </div>

                {/* 7. Female Acceptance Rate */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Female Acceptance</span>
                  <div className="text-2xl font-black font-mono text-slate-200">
                    {prediction.detailed_probabilities.female_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">Gender sub-cohort</div>
                </div>

                {/* 8. Reapplicant vs First-Time */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Reapplicant Rate</span>
                  <div className="text-2xl font-black font-mono text-indigo-400">
                    {prediction.detailed_probabilities.reapplicant_acceptance_rate}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    vs First-Time: {prediction.detailed_probabilities.first_time_applicant_acceptance_rate}%
                  </div>
                </div>
              </div>

              {/* Interview Invitation Metrics Sub-Bar */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-slate-400">Overall Interview Rate:</span>{" "}
                  <strong className="text-amber-400 font-mono text-sm ml-1">
                    {prediction.detailed_probabilities.overall_interview_rate}%
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Applicants Interviewed:</span>{" "}
                  <strong className="text-slate-200 font-mono text-sm ml-1">
                    ~{prediction.detailed_probabilities.number_applicants_interviewed}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Interviewed Resident Breakdown:</span>{" "}
                  <span className="font-mono text-slate-300 ml-1">
                    {prediction.detailed_probabilities.in_state_interviewed_percentage}% IS / {prediction.detailed_probabilities.out_of_state_interviewed_percentage}% OOS
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* D. REQUIREMENTS & PREPARATION AUDIT CHECKLIST */}
          {/* =================================================================== */}
          {prediction.preparation_audit && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    Requirements & Preparation Audit Checklist
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verification of institutional policies for online courses, labs, pass/fail, expiration, and shadowing rules.
                  </p>
                </div>

                <div>
                  {prediction.preparation_audit.student_audit_status === "ALL_VERIFIED" ? (
                    <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> ALL REQUIREMENTS VERIFIED
                    </span>
                  ) : prediction.preparation_audit.student_audit_status === "POTENTIAL_RISKS" ? (
                    <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> POTENTIAL DEFICITS IDENTIFIED
                    </span>
                  ) : (
                    <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" /> ACTION REQUIRED BEFORE APPLICATION
                    </span>
                  )}
                </div>
              </div>

              {/* Student Risk Warnings */}
              {prediction.preparation_audit.student_notes && prediction.preparation_audit.student_notes.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Admissions Committee Compliance Action Items:
                  </div>
                  <ul className="list-disc pl-5 text-xs text-amber-200/90 space-y-1">
                    {prediction.preparation_audit.student_notes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements Policy Matrix Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Online Coursework</span>
                  <p className="text-slate-200">{prediction.preparation_audit.online_coursework_accepted}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Online Labs</span>
                  <p className="text-slate-200">{prediction.preparation_audit.online_labs_accepted}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Pass / Fail Grades</span>
                  <p className="text-slate-200">{prediction.preparation_audit.pass_fail_grades_accepted}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Course Expiration</span>
                  <p className="text-slate-200">{prediction.preparation_audit.expiration_of_classes}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Shadowing Mandate</span>
                  <p className="text-slate-200">
                    {prediction.preparation_audit.is_shadowing_required ? `Mandatory (${prediction.preparation_audit.required_shadowing_hours}h required)` : "Recommended"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Dental Assisting Rules</span>
                  <p className="text-slate-200">{prediction.preparation_audit.dental_assisting_counts_towards_shadowing}</p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* E. PREREQUISITE REQUIREMENT AUDIT CHECKLIST */}
          {/* =================================================================== */}
          {prediction.requirements && prediction.requirements.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
              <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Prerequisite Course Audit ({prediction.requirements.length} Courses)
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {prediction.requirements.filter((c) => c.status === "MET").length} / {prediction.requirements.length} Met
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Course Requirement</th>
                      <th className="py-2.5 px-4">School Standard</th>
                      <th className="py-2.5 px-4">Student Status</th>
                      <th className="py-2.5 px-4 text-center">Audit Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {prediction.requirements.map((req, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-100">{req.name}</td>
                        <td className="py-2.5 px-4 text-slate-300 font-mono">{req.schoolRequirement}</td>
                        <td className="py-2.5 px-4 text-slate-300">{req.studentValue || req.details}</td>
                        <td className="py-2.5 px-4 text-center">
                          {req.status === "MET" ? (
                            <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                              MET
                            </span>
                          ) : req.status === "WARNING" ? (
                            <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                              IN PROGRESS
                            </span>
                          ) : req.status === "RECOMMENDED_MISSING" ? (
                            <span className="rounded bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 text-[10px] font-medium">
                              RECOMMENDED
                            </span>
                          ) : (
                            <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold">
                              MISSING
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* F. ADMISSIONS COMMITTEE DIAGNOSTIC & ROI RECOMMENDATIONS */}
          {/* =================================================================== */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Primary Admission Factor
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {prediction.diagnostics?.mostLikelyReason || "Strong metric alignment with historical matriculants."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Most Limiting Factor / Constraint
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {prediction.diagnostics?.mostLimitingFactor || "Ensure all lab prerequisites and secondary essays are completed early."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
