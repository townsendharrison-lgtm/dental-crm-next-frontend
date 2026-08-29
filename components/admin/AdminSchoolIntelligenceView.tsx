"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Database,
  RefreshCw,
  Search,
  School as SchoolIcon,
  Sparkles,
  ExternalLink,
  Trash2,
  Check,
  Loader2,
  TrendingUp,
  BarChart3,
  Sliders,
  ChevronDown,
  ChevronRight,
  Eye,
  Plus,
  Zap,
  Image as ImageIcon,
  Download,
  Users,
  BookOpen,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  EmptyState,
} from "@/components/ui";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  aiServerApi,
  DentalSchoolProfile,
  PrerequisiteCourseItem,
  SectionCompleteness,
} from "@/lib/api/aiServer";
import AdminStudentSchoolComparisonView from "./AdminStudentSchoolComparisonView";
import CreateSchoolModal from "./CreateSchoolModal";
import { useDeleteSchool } from "@/lib/hooks/useSchools";
import type { School } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface AdminSchoolIntelligenceViewProps {
  schools?: School[];
}

type MainWorkspaceMode = "student-strategy" | "school-hub";
type SchoolHubTab = "profile" | "spreadsheet" | "sources" | "review-queue";

export default function AdminSchoolIntelligenceView({ schools = [] }: AdminSchoolIntelligenceViewProps) {
  // Top-Level Workspace Mode: "school-hub" | "student-strategy"
  const [workspaceMode, setWorkspaceMode] = useState<MainWorkspaceMode>("school-hub");

  // School Hub Sub-Tabs
  const [schoolHubTab, setSchoolHubTab] = useState<SchoolHubTab>("profile");

  // School Selection & Data
  const [schoolProfiles, setSchoolProfiles] = useState<DentalSchoolProfile[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "sch6");
  const [selectedCycle, setSelectedCycle] = useState("2025-2026");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddSchoolModalOpen, setIsAddSchoolModalOpen] = useState(false);

  // Ingestion state
  const [isCrawling, setIsCrawling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [showSectionBreakdown, setShowSectionBreakdown] = useState(false);

  // Spreadsheet matrix state
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [spreadsheetSearch, setSpreadsheetSearch] = useState("");

  // Review queue state
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);

  // Sync selected school when schools prop loads
  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  // Load school profiles from Python AI Server
  useEffect(() => {
    async function loadSchoolData() {
      setIsLoading(true);
      try {
        const list = await aiServerApi.listSchools();
        setSchoolProfiles(list);
        if (list.length > 0 && !selectedSchoolId) {
          setSelectedSchoolId(list[0].id || "sch6");
        }
      } catch (err) {
        console.warn("Could not fetch schools from AI server:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSchoolData();
  }, []);

  // Fetch spreadsheet matrix when tab is switched
  useEffect(() => {
    if (schoolHubTab === "spreadsheet") {
      aiServerApi.getSpreadsheet().then((res) => {
        setSpreadsheetData(res.rows || []);
      }).catch((e) => console.warn("Spreadsheet load error:", e));
    } else if (schoolHubTab === "review-queue") {
      aiServerApi.getReviewQueue().then((res) => {
        setReviewQueue(res || []);
      }).catch((e) => console.warn("Review queue load error:", e));
    }
  }, [schoolHubTab]);

  // Master school list: merge prop schools with AI server profiles
  const availableSchools = useMemo(() => {
    if (schools && schools.length > 0) {
      return schools;
    }
    return schoolProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
      avg_gpa: p.academic_standards?.avg_cgpa,
      dat_avg: p.academic_standards?.avg_dat_aa,
    })) as School[];
  }, [schools, schoolProfiles]);

  // Active School Profile
  const activeProfile = useMemo(() => {
    return (
      schoolProfiles.find((s) => s.id === selectedSchoolId || s.name.toLowerCase() === availableSchools.find(x => x.id === selectedSchoolId)?.name.toLowerCase()) ||
      schoolProfiles[0] ||
      null
    );
  }, [schoolProfiles, selectedSchoolId, availableSchools]);

  const activeSchoolMeta = useMemo(() => {
    return availableSchools.find((s) => s.id === selectedSchoolId) || availableSchools[0] || null;
  }, [availableSchools, selectedSchoolId]);

  // Has this school been fed with sources and extracted?
  const hasExtractedEvidence = useMemo(() => {
    if (!activeProfile) return false;
    return (
      activeProfile.completeness.verified_count > 0 ||
      activeProfile.completeness.found_unverified_count > 0 ||
      (activeProfile.evidence_citations && activeProfile.evidence_citations.length > 0)
    );
  }, [activeProfile]);

  // Prerequisite groups
  const prereqGroups = useMemo(() => {
    if (!activeProfile?.prerequisites || activeProfile.prerequisites.length === 0) return {};
    const groups: Record<string, PrerequisiteCourseItem[]> = {
      "BCP (BIOLOGY – CHEMISTRY – PHYSICS)": [],
      "ADDITIONAL BIOLOGICAL SCIENCES": [],
      "NONSCIENCE": [],
      "OTHER SCIENCE": [],
    };

    activeProfile.prerequisites.forEach((p) => {
      if (groups[p.group]) {
        groups[p.group].push(p);
      } else {
        groups[p.group] = [p];
      }
    });
    return groups;
  }, [activeProfile]);

  // Handle URL Crawl with LangGraph
  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl.trim()) return toast.error("Please enter a valid school URL");
    setIsCrawling(true);
    try {
      const res = await aiServerApi.crawlWebsite({
        url: crawlUrl.trim(),
        school_id: selectedSchoolId,
        school_name: activeSchoolMeta?.name || activeProfile?.name,
        cycle: selectedCycle,
      });
      toast.success(res.message || "Crawl completed successfully!");
      if (res.profile) {
        setSchoolProfiles((prev) =>
          prev.map((s) => (s.id === res.profile.id ? res.profile : s))
        );
      }
      setCrawlUrl("");
      setSchoolHubTab("profile");
    } catch (err: any) {
      toast.error(err?.message || "Crawl failed on AI Server");
    } finally {
      setIsCrawling(false);
    }
  };

  // Handle File Ingest (PDF / TXT / Image OCR)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("school_id", selectedSchoolId);
      formData.append("school_name", activeSchoolMeta?.name || activeProfile?.name || "Dental School");
      formData.append("cycle", selectedCycle);

      const res = await aiServerApi.ingestFile(formData);
      toast.success(`Successfully analyzed ${file.name} with GPT-4o!`);
      if (res.profile) {
        setSchoolProfiles((prev) =>
          prev.map((s) => (s.id === res.profile.id ? res.profile : s))
        );
      }
      setSchoolHubTab("profile");
    } catch (err: any) {
      toast.error(err?.message || "File ingestion failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Delete school from catalog
  const deleteSchoolMutation = useDeleteSchool();
  const handleDeleteSchool = async () => {
    if (!activeSchoolMeta) return;
    if (!confirm(`Are you sure you want to delete "${activeSchoolMeta.name}" from the catalog?`)) return;
    try {
      await deleteSchoolMutation.mutateAsync(activeSchoolMeta.id);
      toast.success(`Deleted ${activeSchoolMeta.name}`);
      const remaining = availableSchools.filter((s) => s.id !== activeSchoolMeta.id);
      if (remaining.length > 0) {
        setSelectedSchoolId(remaining[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete school");
    }
  };

  // Resolve review queue item
  const handleResolveReview = async (id: string, status: string = "VERIFIED") => {
    try {
      await aiServerApi.resolveReviewItem(id, status);
      setReviewQueue((prev) => prev.filter((item) => item.id !== id));
      toast.success("Fact verified and updated!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve item");
    }
  };

  return (
    <div className="min-h-screen text-slate-200 pb-16 font-sans space-y-6">
      {/* 1. TOP-LEVEL WORKSPACE MODE SWITCHER */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWorkspaceMode("school-hub")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              workspaceMode === "school-hub"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            )}
          >
            <SchoolIcon className="h-4 w-4" />
            School Intelligence & Sources Hub
          </button>

          <button
            onClick={() => setWorkspaceMode("student-strategy")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              workspaceMode === "student-strategy"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            )}
          >
            <Users className="h-4 w-4" />
            Student Profile Comparison
          </button>
        </div>

        {workspaceMode === "school-hub" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddSchoolModalOpen(true)}
            className="text-xs h-8 gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Dental School
          </Button>
        )}
      </div>

      {/* =================================================================== */}
      {/* WORKSPACE 1: DEDICATED STUDENT FIT & STRATEGY STUDIO */}
      {/* =================================================================== */}
      {workspaceMode === "student-strategy" && (
        <AdminStudentSchoolComparisonView
          schools={availableSchools}
          initialSchoolId={selectedSchoolId}
        />
      )}

      {/* =================================================================== */}
      {/* WORKSPACE 2: SCHOOL MANAGEMENT & INTELLIGENCE HUB */}
      {/* =================================================================== */}
      {workspaceMode === "school-hub" && (
        <div className="space-y-6">
          {/* School Header & Selector Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
                    School Knowledge Base
                  </span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                  {activeSchoolMeta?.name || activeProfile?.name || "Dental School Intelligence"}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeSchoolMeta?.location || activeProfile?.location || "United States"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* School Selector (Admin Added Schools Only) */}
                <div className="flex items-center gap-2 min-w-[260px]">
                  <span className="text-xs font-semibold text-slate-400">School:</span>
                  <div className="flex-1 flex items-center gap-1.5">
                    <SelectMenu
                      value={selectedSchoolId}
                      onChange={(val) => setSelectedSchoolId(val)}
                      options={availableSchools.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.location || "US"})`,
                      }))}
                      leftIcon={<SchoolIcon className="h-3.5 w-3.5 text-slate-400" />}
                      className="w-full text-xs"
                    />
                    {availableSchools.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDeleteSchool}
                        title="Delete this school from catalog"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Application Cycle Selector */}
                <div className="flex items-center gap-2 min-w-[150px]">
                  <SelectMenu
                    value={selectedCycle}
                    onChange={(val) => setSelectedCycle(val)}
                    options={[
                      { value: "2025-2026", label: "2025-2026 Cycle" },
                      { value: "2024-2025", label: "2024-2025 Cycle" },
                      { value: "2023-2024", label: "2023-2024 Cycle" },
                    ]}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Quick Ingestion Bar directly in the Header */}
            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Feed Admissions Sources & Documents ({selectedCycle})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Target: <strong className="text-slate-200">{activeSchoolMeta?.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
                {/* Web URL Crawler (8 cols) */}
                <form onSubmit={handleCrawl} className="lg:col-span-8 flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste official admissions URL (e.g. https://dental.school.edu/admissions/prerequisites)..."
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isCrawling}
                    className="text-xs flex-shrink-0 px-4 font-semibold"
                  >
                    {isCrawling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                    Crawl & Extract
                  </Button>
                </form>

                {/* PDF / File Dropzone (4 cols) */}
                <div className="lg:col-span-4">
                  <label className="flex h-full min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-indigo-500/40 bg-indigo-950/20 px-3 text-xs font-semibold text-indigo-300 hover:bg-indigo-950/40 transition-all">
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>Upload PDF Bulletin / Flyer</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* School Hub Navigation Tabs */}
            <div className="mt-6 flex items-center gap-6 border-b border-slate-800 text-xs">
              <button
                onClick={() => setSchoolHubTab("profile")}
                className={cn(
                  "pb-3 font-medium transition-colors",
                  schoolHubTab === "profile"
                    ? "border-b-2 border-indigo-500 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Verified Profile & Matrix
              </button>
              <button
                onClick={() => setSchoolHubTab("spreadsheet")}
                className={cn(
                  "pb-3 font-medium transition-colors",
                  schoolHubTab === "spreadsheet"
                    ? "border-b-2 border-indigo-500 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                School Directory (Spreadsheet)
              </button>
              <button
                onClick={() => setSchoolHubTab("sources")}
                className={cn(
                  "pb-3 font-medium transition-colors",
                  schoolHubTab === "sources"
                    ? "border-b-2 border-indigo-500 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Evidence Citations ({activeProfile?.evidence_citations?.length || 0})
              </button>
              <button
                onClick={() => setSchoolHubTab("review-queue")}
                className={cn(
                  "pb-3 font-medium transition-colors flex items-center gap-1.5",
                  schoolHubTab === "review-queue"
                    ? "border-b-2 border-indigo-500 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Review Queue
                {reviewQueue.length > 0 && (
                  <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 text-[10px] font-bold">
                    {reviewQueue.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: VERIFIED PROFILE & MATRIX */}
          {schoolHubTab === "profile" && activeProfile && (
            <div className="space-y-6">
              {/* Field Completeness Hero Bar (Dynamic) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      EXTRACTED ADMISSIONS CRITERIA & EVIDENCE
                    </span>
                    <div className="mt-1 text-sm font-semibold text-slate-200">
                      {activeProfile.completeness.verified_count > 0 ? (
                        <>
                          <span className="text-emerald-400 font-bold">{activeProfile.completeness.verified_count}</span> verified criteria ·{" "}
                          <span className="text-indigo-400 font-bold">
                            {activeProfile.completeness.verified_count +
                              activeProfile.completeness.found_unverified_count +
                              activeProfile.completeness.inferred_count +
                              activeProfile.completeness.conflicting_count}
                          </span>{" "}
                          total data points extracted ({activeProfile.completeness.verified_percentage}% verification rate)
                        </>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          0 verified criteria · Awaiting official source documents or website crawl
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">
                        Verified <strong className="text-slate-100">{activeProfile.completeness.verified_count}</strong>
                      </span>
                    </div>
                    {activeProfile.completeness.found_unverified_count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        <span className="text-slate-300">
                          Found <strong className="text-slate-100">{activeProfile.completeness.found_unverified_count}</strong>
                        </span>
                      </div>
                    )}
                    {activeProfile.completeness.inferred_count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        <span className="text-slate-300">
                          Inferred <strong className="text-slate-100">{activeProfile.completeness.inferred_count}</strong>
                        </span>
                      </div>
                    )}
                    {activeProfile.completeness.conflicting_count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-slate-300">
                          Conflicting <strong className="text-slate-100">{activeProfile.completeness.conflicting_count}</strong>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-600" />
                      <span className="text-slate-400">
                        Citations <strong className="text-slate-200">{activeProfile.evidence_citations?.length || 0}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        activeProfile.completeness.verified_count > 0
                          ? activeProfile.completeness.verified_percentage
                          : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Call to action if unextracted */}
              {!hasExtractedEvidence && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        No Source Documents Ingested for this School Yet
                      </div>
                      <div className="text-xs text-slate-400">
                        Feed the admissions URL or upload the bulletin PDF in the bar above to extract verified prerequisites and Dean info.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* General Information Section */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
                <div className="bg-slate-800/80 px-5 py-3 text-slate-100 font-semibold text-xs tracking-wider uppercase border-b border-slate-700/60 flex items-center justify-between">
                  <span>GENERAL INFORMATION</span>
                  <span className="text-[11px] text-indigo-400 font-mono">
                    {activeProfile.general_information.university_affiliation || activeSchoolMeta?.name}
                  </span>
                </div>

                <div className="p-6 space-y-4 text-xs text-slate-200">
                  <div>
                    <span className="font-semibold text-slate-400">State / Territory: </span>
                    <span className="text-slate-100 font-medium">
                      {activeProfile.general_information.state || activeSchoolMeta?.location || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-400">Dean / Admissions: </span>
                    <span className="text-slate-100 font-medium">
                      {activeProfile.general_information.dean || <span className="text-slate-500 italic">Not extracted yet</span>}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-400">Description: </span>
                    {activeProfile.general_information.dental_school_description ? (
                      <p className="mt-1 leading-relaxed text-slate-300">
                        {activeProfile.general_information.dental_school_description}
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-500 italic">Not extracted yet</p>
                    )}
                  </div>

                  <div>
                    <span className="font-semibold text-slate-400">Mission: </span>
                    {activeProfile.general_information.mission ? (
                      <p className="mt-1 leading-relaxed text-slate-300">
                        {activeProfile.general_information.mission}
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-500 italic">Not extracted yet</p>
                    )}
                  </div>

                  {activeProfile.general_information.core_values && activeProfile.general_information.core_values.length > 0 ? (
                    <div>
                      <span className="font-semibold text-slate-400">Core values: </span>
                      <ul className="mt-1.5 space-y-1 list-disc pl-5 text-slate-300">
                        {activeProfile.general_information.core_values.map((val, idx) => (
                          <li key={idx} className="leading-relaxed">{val}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Prerequisites Matrix Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
                <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
                    PREREQUISITES MATRIX
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeProfile.prerequisites?.length || 0} Courses Extracted
                  </span>
                </div>

                {Object.keys(prereqGroups).length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={<BookOpen className="h-8 w-8 text-slate-500" />}
                      title="No prerequisite requirements extracted yet"
                      description="Feed an admissions bulletin PDF or website URL above to automatically extract and verify this school's prerequisite matrix."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                        <tr>
                          <th className="py-2.5 px-4 w-2/5">Course</th>
                          <th className="py-2.5 px-4 text-center">Required</th>
                          <th className="py-2.5 px-4 text-center">Recommended</th>
                          <th className="py-2.5 px-4 text-center">Lab Required</th>
                          <th className="py-2.5 px-4 text-center">Credits (Semester/Quarter)</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {Object.entries(prereqGroups).map(([groupName, courses]) => (
                          <React.Fragment key={groupName}>
                            <tr className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                              <td colSpan={5} className="py-2 px-4">
                                {groupName}
                              </td>
                            </tr>

                            {courses.map((course, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/40 transition-colors text-slate-200">
                                <td className="py-2.5 px-4 font-medium text-slate-100">
                                  {course.course_name}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {course.required ? <span className="font-bold text-indigo-400">✓</span> : null}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {course.recommended ? <span className="font-bold text-indigo-400">✓</span> : null}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {course.lab_required ? <span className="font-bold text-indigo-400">✓</span> : null}
                                </td>
                                <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                                  {course.semester_credits} / {course.quarter_credits}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SPREADSHEET MATRIX */}
          {schoolHubTab === "spreadsheet" && (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Dental School Directory & Matrix ({availableSchools.length} Schools)
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Filter schools..."
                    value={spreadsheetSearch}
                    onChange={(e) => setSpreadsheetSearch(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Exporting CSV matrix...")}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">School</th>
                      <th className="py-2.5 px-4">Location</th>
                      <th className="py-2.5 px-4 text-center">Avg cGPA</th>
                      <th className="py-2.5 px-4 text-center">Avg DAT</th>
                      <th className="py-2.5 px-4 text-center">Extraction Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {availableSchools
                      .filter((row: any) =>
                        spreadsheetSearch
                          ? (row.name || "").toLowerCase().includes(spreadsheetSearch.toLowerCase()) ||
                            (row.location || "").toLowerCase().includes(spreadsheetSearch.toLowerCase())
                          : true
                      )
                      .map((row: any, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-100">{row.name}</td>
                          <td className="py-2.5 px-4 text-slate-400">{row.location}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-emerald-400">
                            {row.avg_gpa || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-indigo-400">
                            {row.dat_avg || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="rounded bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 text-[10px] font-medium">
                              CATALOG READY
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SOURCES & CITATIONS */}
          {schoolHubTab === "sources" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
                Verifiable Evidence Citations for {activeSchoolMeta?.name} ({activeProfile?.evidence_citations?.length || 0})
              </h3>
              {(!activeProfile?.evidence_citations || activeProfile.evidence_citations.length === 0) ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-slate-500" />}
                  title="No sources fed for this school yet"
                  description="Use the URL crawler or file dropzone in the header bar to feed official admissions sources."
                />
              ) : (
                <div className="space-y-3">
                  {activeProfile.evidence_citations.map((cit, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                            {cit.category}
                          </span>
                          <span className="font-semibold text-slate-100 text-xs">{cit.field_label}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Source: {cit.source_name} {cit.page_number ? `(Page ${cit.page_number})` : ""}
                        </span>
                      </div>
                      <p className="text-xs italic text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800">
                        "{cit.raw_snippet}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVIEW QUEUE */}
          {schoolHubTab === "review-queue" && (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Verification & Discrepancy Queue
                </h3>
              </div>

              {reviewQueue.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                  title="No Pending Discrepancies"
                  description="All extracted criteria for this school are consistent and verified. If future website crawls or uploaded PDFs conflict with each other, they will appear here for your review."
                />
              ) : (
                <div className="space-y-3">
                  {reviewQueue.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100 text-xs">
                          {item.field_label} ({item.school_name})
                        </span>
                        <span className="rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                          {item.issue_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                        {item.source_a && (
                          <div className="rounded border border-slate-800 bg-slate-900 p-2.5">
                            <span className="font-medium text-indigo-300">Source A: {item.source_a.name}</span>
                            <p className="mt-1 text-slate-300 italic">"{item.source_a.snippet}"</p>
                          </div>
                        )}
                        {item.source_b && (
                          <div className="rounded border border-slate-800 bg-slate-900 p-2.5">
                            <span className="font-medium text-indigo-300">Source B: {item.source_b.name}</span>
                            <p className="mt-1 text-slate-300 italic">"{item.source_b.snippet}"</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveReview(item.id, "REJECTED")}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleResolveReview(item.id, "VERIFIED")}
                          className="text-xs"
                        >
                          Verify Fact
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. CREATE NEW DENTAL SCHOOL MODAL */}
      <CreateSchoolModal
        isOpen={isAddSchoolModalOpen}
        onClose={() => setIsAddSchoolModalOpen(false)}
        onSchoolCreated={(newSchool, aiProfile) => {
          if (aiProfile) {
            setSchoolProfiles((prev) => [aiProfile, ...prev]);
          }
          setSelectedSchoolId(newSchool.id);
          setWorkspaceMode("school-hub");
          setSchoolHubTab("profile");
        }}
      />
    </div>
  );
}
