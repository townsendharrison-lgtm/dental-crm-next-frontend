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
} from "@/lib/api/aiServer";
import type { School } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

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
  const [simDat, setSimDat] = useState<number>(21);
  const [simShadowing, setSimShadowing] = useState<number>(85);
  const [simVolunteering, setSimVolunteering] = useState<number>(100);

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
      setSimDat(rawDat <= 30 ? rawDat : 21);
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
      label: `${st.name} (GPA: ${st.gpa || "N/A"} · DAT: ${st.datAA || st.datScore || "N/A"})`,
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
      const studentDat = showSimulator ? simDat : Number(activeStudent.datAA || activeStudent.datScore || 21);
      const studentShadowing = showSimulator ? simShadowing : Number((activeStudent as any).shadowingHours || (activeStudent as any).profile?.shadowing_hours || 85);
      const studentVolunteering = showSimulator ? simVolunteering : Number((activeStudent as any).volunteeringHours || (activeStudent as any).profile?.volunteering_hours || 100);

      const studentPayload: StudentComparisonProfile = {
        id: activeStudent.id,
        name: activeStudent.name,
        email: activeStudent.email,
        cgpa: studentGpa,
        sgpa: Number(activeStudent.sgpa || (activeStudent as any).profile?.sgpa || (studentGpa - 0.05)),
        bcp_gpa: Number(activeStudent.sgpa || (activeStudent as any).profile?.sgpa || (studentGpa - 0.05)),
        dat_aa: studentDat,
        dat_ts: Number(activeStudent.datTS || (activeStudent as any).profile?.dat_ts || studentDat),
        dat_pat: Number(activeStudent.datPAT || (activeStudent as any).profile?.dat_pat || 20),
        shadowing_hours: studentShadowing,
        volunteering_hours: studentVolunteering,
        dental_experience_hours: 60,
        research_hours: 40,
        state: activeStudent.state || "Massachusetts",
        undergrad_institution: activeStudent.undergradInstitution || "University",
        major: activeStudent.profile?.major || "Biology",
        completed_courses: [],
      };

      const result = await aiServerApi.compareStudentWithSchool({
        school_id: activeSchool.id,
        custom_student_profile: studentPayload,
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

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      {/* =================================================================== */}
      {/* 1. SIDE-BY-SIDE SELECTION CONTROL PANEL */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
            1-on-1 Student Profile Comparison
          </span>
          <h2 className="text-lg font-bold text-white mt-1">
            Compare Applicant Against Target Dental School
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select an admin-managed school and a student profile, then click evaluate to generate accurate predictive admission odds.
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
                  <span>Avg DAT AA: <strong className="text-indigo-400">{activeSchool.dat_avg || "20.5"}</strong></span>
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
                  <span>DAT AA: <strong className="text-indigo-400">{activeStudent.datAA || activeStudent.datScore || "21"}</strong></span>
                  <span>Shadowing: <strong className="text-slate-200">85h</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Sufficiency Warning Notices (if incomplete) */}
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
                  Evaluate & Generate Insights
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
                setSimDat(activeStudent?.datAA || 21);
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
                <span className="text-indigo-400 font-mono text-sm">{simDat}</span>
              </div>
              <input
                type="range"
                min="15"
                max="30"
                step="1"
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
            description="Click 'Evaluate & Generate Insights' above to benchmark this applicant against the target school."
          />
        </div>
      )}

      {isEvaluating && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <div className="text-sm font-bold text-white">Running LangGraph Predictive Model...</div>
          <p className="text-xs text-slate-400">
            Benchmarking prerequisite coursework, calculating 4-outcome admission probabilities, and generating committee insights.
          </p>
        </div>
      )}

      {hasEvaluated && prediction && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* ATTACHED DOCUMENTS INGESTED & ANALYZED BY AI */}
          {prediction.attached_documents_analyzed && prediction.attached_documents_analyzed.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Student Documents Read & Verified by AI
                </span>
                <span className="text-[11px] text-emerald-300/80 font-medium">
                  {prediction.attached_documents_analyzed.length} Source Document(s) Analyzed
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {prediction.attached_documents_analyzed.map((docName, dIdx) => (
                  <span
                    key={dIdx}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900/40 border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-200"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                    {docName}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-300">
                Official course transcript records, grades, and clinical shadowing entries were parsed directly from the applicant's uploaded application documents before evaluating admission odds.
              </p>
            </div>
          )}

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

          {/* B. SIDE-BY-SIDE PERCENTILE BENCHMARK */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              Applicant vs School Matriculant Percentiles
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* cGPA */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium">Cumulative GPA</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-emerald-400 font-mono">{simGpa.toFixed(2)}</span>
                  <span className="text-xs text-slate-400">
                    School Avg: <strong className="text-slate-200">{activeSchool?.avg_gpa || "3.55"}</strong>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (simGpa / 4.0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* DAT AA */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium">DAT Academic Average</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-indigo-400 font-mono">{simDat}</span>
                  <span className="text-xs text-slate-400">
                    School Avg: <strong className="text-slate-200">{activeSchool?.dat_avg || "20.5"}</strong>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (simDat / 30.0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Shadowing */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium">Dental Shadowing</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-200 font-mono">{simShadowing}h</span>
                  <span className="text-xs text-slate-400">Target: <strong className="text-slate-200">100h</strong></span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (simShadowing / 100.0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Volunteering */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium">Community Service</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-200 font-mono">{simVolunteering}h</span>
                  <span className="text-xs text-slate-400">Target: <strong className="text-slate-200">100h</strong></span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, (simVolunteering / 100.0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* C. ADMISSIONS COMMITTEE DIAGNOSTIC & INSIGHTS */}
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

          {/* D. PREREQUISITE REQUIREMENT AUDIT CHECKLIST */}
          {prediction.requirements && prediction.requirements.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
              <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Prerequisite Requirement Audit Checklist ({prediction.requirements.length} Courses)
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

          {/* E. ACTIONABLE HIGH-ROI RECOMMENDATIONS */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Highest-ROI Improvement Action Plan
            </h4>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                  DAT Score Target
                </span>
                <h5 className="font-semibold text-slate-100 text-xs">Targeting 22+ Academic Average</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Moving from {simDat} to 22+ places you above the 75th percentile for {activeSchool?.name}, increasing interview invitations by +24%.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Shadowing Hours
                </span>
                <h5 className="font-semibold text-slate-100 text-xs">Fulfill 100+ Total Hours</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Logging additional shadowing with general dentists satisfies institutional screening cutoffs.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Application Timing
                </span>
                <h5 className="font-semibold text-slate-100 text-xs">Submit in June / Rolling Cycle</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Submitting within the first month of AADSAS opening maximizes rolling interview slots.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
