"use client";

import { EvidenceComparisonResult } from "./EvidenceComparisonResult";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { experiencesApi } from "@/lib/api/experiences";
import { queryKeys } from "@/lib/api/queryKeys";
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

  const schoolResearch = useQuery({
    queryKey: ["comparison-school-evidence", selectedSchoolId],
    queryFn: () => aiServerApi.getSchool(selectedSchoolId),
    enabled: !!selectedSchoolId,
  });
  const studentExperiences = useQuery({
    queryKey: queryKeys.experiences.all(selectedStudentId),
    queryFn: () => experiencesApi.list(selectedStudentId),
    enabled: !!selectedStudentId,
  });
  const shadowingHours = useMemo(() => {
    if (!studentExperiences.data || studentExperiences.isError) return null;
    const shadowing = studentExperiences.data.filter((experience) =>
      (experience.student_id ?? experience.studentId) === selectedStudentId && experience.category === "Shadowing");
    if (!shadowing.length) return null;
    return shadowing.reduce((total, experience) => total +
      Number(experience.prior_hours ?? experience.priorHours ?? 0) +
      (experience.sessions ?? []).reduce((hours, session) => hours + Number(session.duration ?? 0), 0), 0);
  }, [studentExperiences.data, studentExperiences.isError, selectedStudentId]);
  const verifiedSchoolValue = (field: string): number | null => {
    if (schoolResearch.isError || schoolResearch.data?.id !== selectedSchoolId) return null;
    const criterion = schoolResearch.data?.criteria?.find((item) => item.field === field);
    return criterion?.status === "VERIFIED" && typeof criterion.value === "number"
      ? criterion.value : null;
  };
  const schoolGpa = verifiedSchoolValue("academics_domain.avg_cgpa");
  const schoolDat = verifiedSchoolValue("dat_domain.avg_dat_aa");
  const schoolAcceptance = verifiedSchoolValue("statistics_domain.overall_acceptance_rate");
  const missingSchoolValue = schoolResearch.isPending ? "Loading…" : schoolResearch.isError ? "Unavailable" : "Not verified";

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
    return realStudents.find((s) => s.id === selectedStudentId) || null;
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
  }, [activeStudent, selectedSchoolId]);

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
      const result = showSimulator
        ? await aiServerApi.whatIfSimulate({ school_id: activeSchool.id, cgpa: simGpa, dat_aa: simDat,
            shadowing_hours: simShadowing, volunteering_hours: simVolunteering, dat_type: "AMERICAN", dat_score_scale: "IRT_200_600" })
        : await aiServerApi.compareStudentWithSchool({ school_id: activeSchool.id, student_id: activeStudent.id });

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
            Student Profile Comparison & Evidence Audit
          </span>
          <h2 className="text-lg font-bold text-white mt-1">
            Compare Applicant Against Target Dental School
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compares recorded CRM profile details with verified school requirements. Missing evidence remains unknown; outcome estimates require a validated historical model.
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
                  {activeSchool.location || "Location not recorded"}
                </div>
                <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-slate-300">
                  <span>Avg cGPA: <strong className="text-emerald-400">{schoolGpa ?? missingSchoolValue}</strong></span>
                  <span>Avg DAT AA: <strong className="text-indigo-400">{schoolDat ?? missingSchoolValue}</strong></span>
                  <span>Acceptance: <strong className="text-slate-200">{schoolAcceptance !== null ? `${schoolAcceptance}%` : missingSchoolValue}</strong></span>
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
                    {activeStudent.profile?.major || "Major not recorded"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Residency: <strong className="text-slate-200">{activeStudent.state || "Not recorded"}</strong>
                </div>
                <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-slate-300">
                  <span>cGPA: <strong className="text-emerald-400">{activeStudent.gpa ?? "Not recorded"}</strong></span>
                  <span>sGPA: <strong className="text-emerald-400">{activeStudent.profile?.sgpa ?? "Not recorded"}</strong></span>
                  <span>DAT AA: <strong className="text-indigo-400">{activeStudent.datAA ?? activeStudent.datScore ?? "Not recorded"}</strong></span>
                  <span>Shadowing: <strong className="text-slate-200">{studentExperiences.isPending ? "Loading…" : studentExperiences.isError ? "Unavailable" : shadowingHours != null ? `${shadowingHours}h` : "Not recorded"}</strong></span>
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
            <span>Verified criteria and recorded CRM details</span>
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
                  Comparing Verified Evidence...
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
                These hypothetical slider values are not CRM facts. Test numerical fit for {activeSchool?.name}.
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

      {hasEvaluated && prediction && <EvidenceComparisonResult prediction={prediction} />}
    </div>
  );
}
