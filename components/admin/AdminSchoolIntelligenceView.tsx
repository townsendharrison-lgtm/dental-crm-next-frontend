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
  Download,
  Users,
  BookOpen,
  Layers,
  Award,
  Scale,
  Target,
  Percent,
  Stethoscope,
  HeartHandshake,
  Compass,
  Flag,
  Briefcase,
  GraduationCap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Save,
  X,
  Filter,
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
  BaselineSkylineResponse,
} from "@/lib/api/aiServer";
import CitationBadge from "./CitationBadge";
import AdminStudentSchoolComparisonView from "./AdminStudentSchoolComparisonView";
import CreateSchoolModal from "./CreateSchoolModal";
import { useDeleteSchool } from "@/lib/hooks/useSchools";
import type { School } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDATScore } from "@/lib/utils/datUtils";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";

interface AdminSchoolIntelligenceViewProps {
  schools?: School[];
}

type MainWorkspaceMode = "student-strategy" | "school-hub" | "knowledgebase" | "directory";
type SchoolHubTab = "profile" | "weights" | "sources";

type SaturatedCategoryTab =
  | "academics"
  | "dat"
  | "shadowing"
  | "dental_experience"
  | "service"
  | "leadership"
  | "research"
  | "extracurriculars"
  | "app_quality"
  | "school_fit"
  | "strategy"
  | "holistic"
  | "red_flags"
  | "skills"
  | "preparation"
  | "statistics";

export default function AdminSchoolIntelligenceView({ schools = [] }: AdminSchoolIntelligenceViewProps) {
  // Top-Level Workspace Mode: "school-hub" | "student-strategy"
  const [workspaceMode, setWorkspaceMode] = useState<MainWorkspaceMode>("school-hub");

  // School Hub Sub-Tabs
  const [schoolHubTab, setSchoolHubTab] = useState<SchoolHubTab>("profile");

  // Set global header action
  usePageHeaderAction({
    label: "Add New Dental School",
    icon: <Plus className="w-4 h-4" />,
    onClick: () => setIsAddSchoolModalOpen(true),
  });

  // Active Category in the Saturated 14-Domain Profile View
  const [activeCategory, setActiveCategory] = useState<SaturatedCategoryTab>("academics");

  // School Selection & Data
  const [schoolProfiles, setSchoolProfiles] = useState<DentalSchoolProfile[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "");
  const [selectedCycle, setSelectedCycle] = useState("2025-2026");
  const [isLoading, setIsLoading] = useState(true);

  // Baseline and Skyline Data
  const [baselineSkyline, setBaselineSkyline] = useState<BaselineSkylineResponse | null>(null);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(false);

  // Modal State
  const [isAddSchoolModalOpen, setIsAddSchoolModalOpen] = useState(false);

  // Ingestion state
  const [isCrawling, setIsCrawling] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // AI Criteria Finder state
  const [isFindingCriteria, setIsFindingCriteria] = useState(false);

  const getCitations = (keyword: string) => {
    if (!activeProfile?.evidence_citations) return [];
    const lowerKeyword = keyword.toLowerCase();
    return activeProfile.evidence_citations.filter(c => 
      (c.field_path && c.field_path.toLowerCase().includes(lowerKeyword)) || 
      (c.verbatim_quote && c.verbatim_quote.toLowerCase().includes(lowerKeyword))
    );
  };
  const [isUploading, setIsUploading] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Spreadsheet matrix state
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [spreadsheetSearch, setSpreadsheetSearch] = useState("");
  const [directoryCategory, setDirectoryCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("school_name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Review queue & Knowledgebase state
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [kbFilterSchoolId, setKbFilterSchoolId] = useState<string>("all");
  const [kbReviewFilterStatus, setKbReviewFilterStatus] = useState<string>("all");
  const [overrideItemId, setOverrideItemId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>("");

  // Sync selected school when schools prop loads
  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  // Load school profiles from Python AI Server
  const loadSchoolData = async () => {
    setIsLoading(true);
    try {
      const list = await aiServerApi.listSchools();
      setSchoolProfiles(list);
      if (list.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(list[0].id || "");
      }
    } catch (err) {
      console.warn("Could not fetch schools from AI server:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, []);

  // Fetch baseline-skyline calibration
  useEffect(() => {
    async function loadBaselineSkyline() {
      setIsLoadingBaseline(true);
      try {
        const data = await aiServerApi.getBaselineSkyline();
        setBaselineSkyline(data);
      } catch (err) {
        console.warn("Could not fetch baseline-skyline:", err);
      } finally {
        setIsLoadingBaseline(false);
      }
    }
    loadBaselineSkyline();
  }, []);

  const refreshKnowledgebase = async () => {
    try {
      const [list, q] = await Promise.all([
        aiServerApi.listSchools(),
        aiServerApi.getReviewQueue(),
      ]);
      setSchoolProfiles(list);
      setReviewQueue(q || []);
    } catch (e) {
      console.warn("Error refreshing KB data:", e);
    }
  };

  // Fetch spreadsheet matrix or review queue when workspaceMode is switched
  useEffect(() => {
    if (workspaceMode === "directory") {
      aiServerApi
        .getSpreadsheet()
        .then((res) => {
          setSpreadsheetData(res.rows || []);
        })
        .catch((e) => console.warn("Spreadsheet load error:", e));
    } else if (workspaceMode === "knowledgebase") {
      refreshKnowledgebase();
    }
  }, [workspaceMode]);

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

  // Active School Metadata
  const activeSchoolMeta = useMemo(() => {
    if (!selectedSchoolId && availableSchools.length === 0) return null;
    const targetId = selectedSchoolId || availableSchools[0]?.id;
    return availableSchools.find((s) => s.id === targetId) || availableSchools[0] || null;
  }, [availableSchools, selectedSchoolId]);

  // Active School Profile (never silently fallback to Boston University or first school)
  const activeProfile = useMemo(() => {
    if (!selectedSchoolId && availableSchools.length === 0) return null;
    const targetId = selectedSchoolId || availableSchools[0]?.id;
    if (!targetId) return null;

    const matchedSchoolMeta = availableSchools.find((x) => x.id === targetId);

    const found = schoolProfiles.find(
      (s) =>
        s.id === targetId ||
        (matchedSchoolMeta && s.name.toLowerCase() === matchedSchoolMeta.name.toLowerCase())
    );
    if (found) return found;

    // Synthesize clean empty shell for newly added school awaiting ingestion
    if (matchedSchoolMeta) {
      return {
        id: matchedSchoolMeta.id,
        name: matchedSchoolMeta.name,
        location: matchedSchoolMeta.location || "United States",
        cycle: "2025-2026",
        completeness: {
          total_fields_extracted: 0,
          reviewed_percentage: 0,
          verified_percentage: 0,
          verified_count: 0,
          found_unverified_count: 0,
          inferred_count: 0,
          conflicting_count: 0,
          not_found_count: 0,
        },
        general_information: {
          university_affiliation: matchedSchoolMeta.name,
          country: "United States",
          state: matchedSchoolMeta.location?.includes(",") ? matchedSchoolMeta.location.split(",")[1].trim() : "US",
          dean: undefined,
          dental_school_description: undefined,
          website_url: undefined,
        },
        prerequisites: [],
        evidence_citations: [],
      } as unknown as DentalSchoolProfile;
    }

    return null;
  }, [schoolProfiles, selectedSchoolId, availableSchools]);

  // Has this school been fed with sources and extracted?
  const hasExtractedEvidence = useMemo(() => {
    if (!activeProfile) return false;
    const hasCitations = Boolean(activeProfile.evidence_citations && activeProfile.evidence_citations.length > 0);
    const hasVerified = (activeProfile.completeness?.verified_count || 0) > 0;
    const hasUnverified = (activeProfile.completeness?.found_unverified_count || 0) > 0;
    const hasPrereqs = Boolean(activeProfile.prerequisites && activeProfile.prerequisites.length > 0);
    const hasGpa = Boolean(activeProfile.academics_domain?.avg_cgpa || activeProfile.academic_standards?.avg_cgpa);
    const hasDat = Boolean(activeProfile.dat_domain?.avg_dat_aa || activeProfile.academic_standards?.avg_dat_aa);
    const hasExtracted = (activeProfile.completeness?.total_fields_extracted || 0) > 0;
    // Check if any domain has stated_in_kb = true (from web research or ingestion)
    const hasAnyDomainData = [
      activeProfile.academics_domain,
      activeProfile.dat_domain,
      activeProfile.shadowing_domain,
      activeProfile.service_domain,
      activeProfile.research_domain,
      activeProfile.school_fit_domain,
      activeProfile.statistics_domain,
    ].some((d) => d?.stated_in_kb === true);
    return hasCitations || hasVerified || hasUnverified || hasExtracted || hasPrereqs || hasGpa || hasDat || hasAnyDomainData;
  }, [activeProfile]);

  // Count of domains that are NOT_FOUND_IN_KB
  const notFoundDomainCount = useMemo(() => {
    if (!activeProfile) return 16;
    const domains = [
      activeProfile.academics_domain,
      activeProfile.dat_domain,
      activeProfile.shadowing_domain,
      activeProfile.dental_experience_domain,
      activeProfile.service_domain,
      activeProfile.leadership_domain,
      activeProfile.research_domain,
      activeProfile.extracurriculars_domain,
      activeProfile.application_quality_domain,
      activeProfile.school_fit_domain,
      activeProfile.application_strategy_domain,
      activeProfile.holistic_context_domain,
      activeProfile.red_flags_domain,
      activeProfile.skills_domain,
      activeProfile.statistics_domain,
      activeProfile.preparation_domain,
    ];
    return domains.filter((d) => !d || !d.stated_in_kb || d.status === "NOT_FOUND_IN_KB").length;
  }, [activeProfile]);

  // Handle AI-powered autonomous criteria research
  const handleFindCriteria = async () => {
    if (!selectedSchoolId || isFindingCriteria) return;
    const schoolName = activeSchoolMeta?.name || activeProfile?.name;
    if (!schoolName) {
      toast.error("Please select a school first");
      return;
    }
    setIsFindingCriteria(true);
    toast.info(`🔍 Searching the web for ${schoolName} admissions criteria...`, { duration: 5000 });
    try {
      const res = await aiServerApi.findCriteria({
        school_id: selectedSchoolId,
        school_name: schoolName,
        cycle: selectedCycle,
      });
      if (res.success) {
        toast.success(res.message || `Found criteria for ${res.domains_updated.length} domains!`);
      } else {
        toast.error(res.message || "Could not find criteria from web sources.");
      }
      // Fetch the updated single-school profile from server to get the fully merged state
      try {
        const freshProfile = await aiServerApi.getSchool(selectedSchoolId);
        if (freshProfile) {
          setSchoolProfiles((prev) => {
            const exists = prev.some((s) => s.id === freshProfile.id);
            if (exists) {
              return prev.map((s) => (s.id === freshProfile.id ? freshProfile : s));
            }
            return [freshProfile, ...prev];
          });
        }
      } catch {
        // Fallback: use the profile from the response
        if (res.profile) {
          setSchoolProfiles((prev) => {
            const exists = prev.some((s) => s.id === res.profile.id);
            if (exists) {
              return prev.map((s) => (s.id === res.profile.id ? res.profile : s));
            }
            return [res.profile, ...prev];
          });
        }
      }
      setSchoolHubTab("profile");
    } catch (err: any) {
      toast.error(err?.message || "AI web research failed");
    } finally {
      setIsFindingCriteria(false);
    }
  };

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

  // Unified 60+ metrics directory rows
  const unifiedDirectoryRows = useMemo(() => {
    return availableSchools.map((school) => {
      const profile = schoolProfiles.find(
        (p) => p.id === school.id || p.name.toLowerCase() === school.name.toLowerCase()
      );
      const row = spreadsheetData.find(
        (r) => r.school_id === school.id || r.school_name?.toLowerCase() === school.name.toLowerCase()
      );

      const acad: any = profile?.academics_domain || profile?.academic_standards || {};
      const dat: any = profile?.dat_domain || profile?.academic_standards || {};
      const stats: any = profile?.statistics_domain || profile?.financials || {};
      const gen: any = (profile as any)?.general_information || {};
      const enrol: any = (profile as any)?.enrollee_statistics || {};
      const extra: any = (profile as any)?.extracurriculars || {};
      const shadow: any = profile?.shadowing_domain || {};
      const serv: any = profile?.service_domain || {};
      const res: any = profile?.research_domain || {};
      const lor: any = (profile as any)?.letters_of_evaluation || {};
      const log: any = (profile as any)?.logistics || {};
      const fin: any = (profile as any)?.financials || {};
      const prep: any = profile?.preparation_domain || {};
      const weights: any = profile?.dynamic_weights || {};

      return {
        school_id: school.id,
        school_name: school.name,
        location: school.location || profile?.location || "United States",
        state: gen.state || (school.location?.includes(",") ? school.location.split(",")[1].trim() : "US"),
        cycle: profile?.cycle || "2025-2026",
        dean: gen.dean || row?.dean || null,
        affiliation: gen.university_affiliation || school.name,
        website_url: gen.website_url || row?.website_url || "",
        accreditation_status: gen.accreditation_status || "CODA Accredited",

        // GPA (no fake fallback numbers)
        avg_cgpa: acad.avg_cgpa ?? school.avg_gpa ?? row?.avg_cgpa ?? null,
        min_cgpa_5th: acad.min_cgpa_5th ?? row?.min_cgpa_5th ?? null,
        max_cgpa_95th: acad.max_cgpa_95th ?? row?.max_cgpa_95th ?? null,
        avg_sgpa: acad.avg_sgpa ?? row?.avg_sgpa ?? null,
        min_sgpa_5th: acad.min_sgpa_5th ?? row?.min_sgpa_5th ?? null,
        max_sgpa_95th: acad.max_sgpa_95th ?? row?.max_sgpa_95th ?? null,
        avg_bcp_gpa: acad.avg_bcp_gpa ?? row?.avg_bcp_gpa ?? null,
        min_cgpa_cutoff: acad.min_cgpa_cutoff ?? row?.min_cgpa_cutoff ?? null,
        min_sgpa_cutoff: acad.min_sgpa_cutoff ?? row?.min_sgpa_cutoff ?? null,

        // DAT (no fake fallback numbers)
        avg_dat_aa: dat.avg_dat_aa ?? school.dat_avg ?? row?.avg_dat_aa ?? null,
        min_dat_aa_5th: dat.min_dat_aa_5th ?? row?.min_dat_aa_5th ?? null,
        max_dat_aa_95th: dat.max_dat_aa_95th ?? row?.max_dat_aa_95th ?? null,
        avg_dat_ts: dat.avg_dat_ts ?? row?.avg_dat_ts ?? null,
        avg_dat_pat: dat.avg_dat_pat ?? row?.avg_dat_pat ?? null,
        avg_dat_bio: dat.avg_dat_bio ?? row?.avg_dat_bio ?? null,
        avg_dat_gc: dat.avg_dat_gc ?? row?.avg_dat_gc ?? null,
        avg_dat_oc: dat.avg_dat_oc ?? row?.avg_dat_oc ?? null,
        avg_dat_rc: dat.avg_dat_rc ?? row?.avg_dat_rc ?? null,
        avg_dat_qr: dat.avg_dat_qr ?? row?.avg_dat_qr ?? null,
        min_dat_cutoff: acad.min_dat_aa_cutoff ?? row?.min_dat_cutoff ?? null,
        canadian_dat_accepted: acad.canadian_dat_accepted ?? row?.canadian_dat_accepted ?? null,

        // Enrollee & Class
        total_class_size: enrol.total_class_size ?? row?.total_class_size ?? null,
        male_percentage: enrol.male_percentage ?? row?.male_percentage ?? null,
        female_percentage: enrol.female_percentage ?? row?.female_percentage ?? null,
        in_state_percentage: enrol.in_state_percentage ?? row?.in_state_percentage ?? null,
        out_of_state_percentage: enrol.out_of_state_percentage ?? row?.out_of_state_percentage ?? null,
        average_age: enrol.average_age ?? row?.average_age ?? null,
        urm_percentage: enrol.underrepresented_minority_percentage ?? row?.urm_percentage ?? null,
        baccalaureate_count: enrol.baccalaureate_count ?? row?.baccalaureate_count ?? null,
        masters_count: enrol.masters_or_beyond_count ?? row?.masters_count ?? null,

        // Admissions & Rates
        overall_acceptance_rate: stats.overall_acceptance_rate ?? row?.overall_acceptance_rate ?? null,
        in_state_acceptance_rate: stats.in_state_acceptance_rate ?? row?.in_state_acceptance_rate ?? null,
        out_of_state_acceptance_rate: stats.out_of_state_acceptance_rate ?? row?.out_of_state_acceptance_rate ?? null,
        international_acceptance_rate: stats.international_acceptance_rate ?? row?.international_acceptance_rate ?? null,
        male_acceptance_rate: stats.male_acceptance_rate ?? row?.male_acceptance_rate ?? null,
        female_acceptance_rate: stats.female_acceptance_rate ?? row?.female_acceptance_rate ?? null,
        reapplicant_acceptance_rate: stats.reapplicant_acceptance_rate ?? row?.reapplicant_acceptance_rate ?? null,
        first_time_acceptance_rate: stats.first_time_applicant_acceptance_rate ?? row?.first_time_acceptance_rate ?? null,
        overall_interview_rate: stats.overall_interview_rate ?? row?.overall_interview_rate ?? null,
        number_applicants_interviewed: stats.number_applicants_interviewed ?? row?.number_applicants_interviewed ?? null,

        // Shadowing & Volunteering
        min_shadowing: shadow.total_hours_required ?? extra.min_shadowing_hours ?? row?.min_shadowing ?? null,
        rec_shadowing: shadow.total_hours_recommended ?? extra.recommended_shadowing_hours ?? row?.rec_shadowing ?? null,
        gen_dentist_required: extra.general_dentist_hours_required ?? row?.gen_dentist_required ?? null,
        specialist_shadowing_accepted: extra.specialist_shadowing_accepted ?? row?.specialist_shadowing_accepted ?? null,
        dental_assisting_counts: prep.dental_assisting_counts_towards_shadowing ?? row?.dental_assisting_counts ?? null,
        min_volunteering: serv.total_volunteering_hours_min ?? extra.min_volunteering_hours ?? row?.min_volunteering ?? null,
        rec_volunteering: serv.total_volunteering_hours_recommended ?? extra.recommended_volunteering_hours ?? row?.rec_volunteering ?? null,
        underserved_priority: serv.underserved_clinical_priority ?? row?.underserved_priority ?? null,

        // Research & Extracurriculars
        research_preference: res.preference ?? extra.research_experience_preference ?? row?.research_preference ?? null,
        research_hours: res.hours_expected ?? row?.research_hours ?? null,
        publications_valued: res.publications_posters_presentations_valued ?? row?.publications_valued ?? null,
        manual_dexterity_assessed: extra.manual_dexterity_assessed ?? row?.manual_dexterity_assessed ?? null,

        // LOR
        lor_total_required: lor.total_letters_required ?? row?.lor_total_required ?? null,
        lor_max: lor.total_letters_max ?? row?.lor_max ?? null,
        lor_science_faculty: lor.science_faculty_letters_required ?? row?.lor_science_faculty ?? null,
        lor_nonscience_faculty: lor.non_science_faculty_letters_required ?? row?.lor_nonscience_faculty ?? null,
        lor_dentist_required: lor.practicing_dentist_letter_required ?? row?.lor_dentist_required ?? null,
        committee_letter_accepted: lor.committee_letter_accepted ?? row?.committee_letter_accepted ?? null,

        // Tuition & Logistics
        in_state_tuition: fin.in_state_tuition_annual ?? row?.in_state_tuition ?? null,
        out_of_state_tuition: fin.out_of_state_tuition_annual ?? row?.out_of_state_tuition ?? null,
        four_year_cost: fin.four_year_total_estimated_cost ?? row?.four_year_cost ?? null,
        aadsas_deadline: log.aadsas_deadline ?? row?.aadsas_deadline ?? null,
        secondary_fee: log.secondary_fee ?? row?.secondary_fee ?? null,
        secondary_required: log.secondary_application_required ?? row?.secondary_required ?? null,
        casper_required: log.casper_required ?? row?.casper_required ?? null,
        kira_required: log.kira_talent_required ?? row?.kira_required ?? null,
        seat_deposit: log.seat_deposit_amount ?? row?.seat_deposit ?? null,
        interview_format: log.interview_format ?? row?.interview_format ?? null,

        // Policies
        online_classes_accepted: prep.online_coursework_accepted ?? row?.online_classes_accepted ?? null,
        online_labs_accepted: prep.online_labs_accepted ?? row?.online_labs_accepted ?? null,
        pass_fail_accepted: prep.pass_fail_grades_accepted ?? row?.pass_fail_accepted ?? null,
        community_college_policy: acad.community_college_policy ?? row?.community_college_policy ?? null,

        // Dynamic Weights
        weight_gpa: weights.academics_gpa_weight ?? row?.dynamic_weights?.gpa ?? null,
        weight_dat: weights.dat_weight ?? row?.dynamic_weights?.dat ?? null,
        weight_shadowing: weights.shadowing_weight ?? row?.dynamic_weights?.shadowing ?? null,
        weight_service: weights.service_weight ?? row?.dynamic_weights?.service ?? null,
        weight_dental_exp: weights.dental_experience_weight ?? row?.dynamic_weights?.dental_exp ?? null,
        weight_research: weights.research_weight ?? row?.dynamic_weights?.research ?? null,

        // Completeness
        completeness_verified: profile?.completeness?.verified_count ?? row?.completeness_verified ?? 0,
        completeness_percentage: profile?.completeness?.verified_percentage ?? row?.completeness_percentage ?? 0,
        status:
          (profile?.completeness?.verified_percentage ?? 0) > 20
            ? "VERIFIED"
            : (profile?.completeness?.total_fields_extracted ?? 0) > 0 ||
              (profile?.evidence_citations && profile.evidence_citations.length > 0)
            ? "IN_PROGRESS"
            : "AWAITING_INGESTION",
      };
    });
  }, [availableSchools, schoolProfiles, spreadsheetData]);

  // Filtered and sorted directory rows
  const filteredAndSortedDirectoryRows = useMemo(() => {
    let list = [...unifiedDirectoryRows];
    if (spreadsheetSearch.trim()) {
      const q = spreadsheetSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.school_name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q) ||
          r.dean.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA || "").localeCompare(String(valB || ""))
        : String(valB || "").localeCompare(String(valA || ""));
    });
    return list;
  }, [unifiedDirectoryRows, spreadsheetSearch, sortField, sortAsc]);

  // Added Knowledge Bases list derived from citations and evidence rows
  const addedKnowledgeBases = useMemo(() => {
    const map = new Map<string, {
      schoolId: string;
      schoolName: string;
      sourceName: string;
      sourceUrl?: string;
      sourceType: string;
      pointsExtracted: number;
      status: string;
      createdAt?: string;
    }>();

    // 1. Gather from schoolProfiles evidence citations
    schoolProfiles.forEach((school) => {
      if (kbFilterSchoolId !== "all" && school.id !== kbFilterSchoolId) return;

      school.evidence_citations?.forEach((cit: any) => {
        const sourceTitle = cit.source_document_title || cit.source_name || cit.source_url || "Direct Source";
        const key = `${school.id}__${sourceTitle}`;
        if (!map.has(key)) {
          map.set(key, {
            schoolId: school.id,
            schoolName: school.name,
            sourceName: sourceTitle,
            sourceUrl: cit.source_url,
            sourceType: cit.source_type || (cit.source_url ? "WEBSITE_CRAWL" : "PDF_DOCUMENT"),
            pointsExtracted: 1,
            status: "INDEXED",
            createdAt: cit.created_at,
          });
        } else {
          map.get(key)!.pointsExtracted++;
        }
      });
    });

    // 2. Gather from reviewQueue items if not already counted
    reviewQueue.forEach((item) => {
      if (kbFilterSchoolId !== "all" && item.school_id !== kbFilterSchoolId) return;
      const sourceTitle = item.source_name || item.source_url || "Uploaded Source";
      const key = `${item.school_id}__${sourceTitle}`;
      if (!map.has(key)) {
        map.set(key, {
          schoolId: item.school_id,
          schoolName: item.school_name,
          sourceName: sourceTitle,
          sourceUrl: item.source_url,
          sourceType: item.source_type || (item.source_url ? "WEBSITE_CRAWL" : "PDF_DOCUMENT"),
          pointsExtracted: 1,
          status: "INDEXED",
          createdAt: item.created_at,
        });
      } else {
        map.get(key)!.pointsExtracted++;
      }
    });

    return Array.from(map.values());
  }, [schoolProfiles, reviewQueue, kbFilterSchoolId]);

  // Filtered review queue items
  const filteredReviewItems = useMemo(() => {
    return reviewQueue.filter((item) => {
      if (kbFilterSchoolId !== "all" && item.school_id !== kbFilterSchoolId) {
        return false;
      }
      if (kbReviewFilterStatus !== "all") {
        if (kbReviewFilterStatus === "PENDING" && item.issue_type !== "PENDING_REVIEW") return false;
        if (kbReviewFilterStatus === "CONFLICTING" && item.issue_type !== "CONFLICTING") return false;
        if (kbReviewFilterStatus === "VERIFIED" && item.issue_type !== "VERIFIED") return false;
      }
      return true;
    });
  }, [reviewQueue, kbFilterSchoolId, kbReviewFilterStatus]);

  // Toggle sort direction or sort field
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

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
      if (res.success === false) {
        toast.error(res.message || "Could not extract data from this website. Try uploading the page as a PDF instead.");
      } else {
        toast.success(res.message || "Crawl and saturated extraction completed!");
      }
      if (res.profile) {
        setSchoolProfiles((prev) => {
          const exists = prev.some((s) => s.id === res.profile.id);
          if (exists) {
            return prev.map((s) => (s.id === res.profile.id ? res.profile : s));
          }
          return [res.profile, ...prev];
        });
        setSelectedSchoolId(res.profile.id);
      }
      setCrawlUrl("");
      setSchoolHubTab("profile");
      setWorkspaceMode("school-hub");
    } catch (err: any) {
      toast.error(err?.message || "Crawl failed on AI Server");
    } finally {
      setIsCrawling(false);
    }
  };

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCrawlUrl(""); // Clear URL if file selected
    }
  };

  const handleUnifiedIngest = async () => {
    if (!selectedSchoolId) {
      toast.error("Please select a target school first");
      return;
    }

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("school_id", selectedSchoolId);
        formData.append("school_name", activeSchoolMeta?.name || activeProfile?.name || "Dental School");
        formData.append("cycle", selectedCycle);
        
        const res = await aiServerApi.ingestFile(formData);
        if (res.success === false) {
          toast.error(res.message || "Could not extract data from this file.");
        } else {
          toast.success(res.message || "File uploaded & criteria extracted successfully!");
        }
        if (res.profile) {
          setSchoolProfiles((prev) => {
            const exists = prev.some((s) => s.id === res.profile.id);
            if (exists) {
              return prev.map((s) => (s.id === res.profile.id ? res.profile : s));
            }
            return [res.profile, ...prev];
          });
          setSelectedSchoolId(res.profile.id);
        }
        setSelectedFile(null);
        await refreshKnowledgebase();
        await loadSchoolData();
        setSchoolHubTab("profile");
        setWorkspaceMode("school-hub");
      } catch (err: any) {
        toast.error(err?.message || "File upload failed on AI Server");
      } finally {
        setIsUploading(false);
      }
    } else if (crawlUrl.trim()) {
      setIsCrawling(true);
      try {
        const res = await aiServerApi.crawlWebsite({
          url: crawlUrl.trim(),
          school_id: selectedSchoolId,
          school_name: activeSchoolMeta?.name || activeProfile?.name,
          cycle: selectedCycle,
        });
        if (res.success === false) {
          toast.error(res.message || "Could not extract data from this website. Try uploading the page as a PDF instead.");
        } else {
          toast.success(res.message || "Crawl and criteria extraction completed!");
        }
        if (res.profile) {
          setSchoolProfiles((prev) => {
            const exists = prev.some((s) => s.id === res.profile.id);
            if (exists) {
              return prev.map((s) => (s.id === res.profile.id ? res.profile : s));
            }
            return [res.profile, ...prev];
          });
          setSelectedSchoolId(res.profile.id);
        }
        setCrawlUrl("");
        await refreshKnowledgebase();
        await loadSchoolData();
        setSchoolHubTab("profile");
        setWorkspaceMode("school-hub");
      } catch (err: any) {
        toast.error(err?.message || "Crawl failed on AI Server");
      } finally {
        setIsCrawling(false);
      }
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
      } else {
        setSelectedSchoolId("");
      }
      await loadSchoolData();
      await refreshKnowledgebase();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete school");
    }
  };

  // Delete Knowledge Base Source
  const handleDeleteKbSource = async (schoolId?: string, sourceName?: string, sourceUrl?: string) => {
    const label = sourceName || sourceUrl || "this source";
    if (!confirm(`Are you sure you want to delete ${label} from the knowledge base?`)) return;
    try {
      await aiServerApi.deleteKbSource({ school_id: schoolId, source_name: sourceName, source_url: sourceUrl });
      toast.success("Knowledge base source deleted successfully");
      await refreshKnowledgebase();
      await loadSchoolData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete source");
    }
  };

  // Resolve review queue item (Approve, Override, or Reject)
  const handleResolveReview = async (id: string, status: string = "VERIFIED", overrideVal?: any) => {
    try {
      await aiServerApi.resolveReviewItem(id, status, overrideVal);
      setReviewQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                is_verified: status === "VERIFIED",
                issue_type: status === "VERIFIED" ? "VERIFIED" : "REJECTED",
                extracted_value: overrideVal !== undefined ? overrideVal : item.extracted_value,
              }
            : item
        )
      );
      setOverrideItemId(null);
      setOverrideValue("");
      toast.success(
        status === "VERIFIED"
          ? overrideVal !== undefined
            ? "Value overridden & criteria approved!"
            : "Criteria approved & verified!"
          : "Criteria marked as rejected."
      );
      await refreshKnowledgebase();
      await loadSchoolData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve item");
    }
  };

  // Export 60+ column matrix to CSV
  const handleExportCsv = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const headers = [
      "School Name", "Location", "State", "Dean", "Cycle",
      "Avg cGPA", "Min 5th cGPA", "Max 95th cGPA", "Avg sGPA", "Min 5th sGPA", "Max 95th sGPA", "Min cGPA Cutoff", "Min sGPA Cutoff",
      "Avg DAT AA", "Min 5th DAT AA", "Max 95th DAT AA", "Avg DAT TS", "Avg DAT PAT", "Avg DAT BIO", "Avg DAT GC", "Avg DAT OC", "Avg DAT RC", "Avg DAT QR", "Min DAT Cutoff", "Canadian DAT Accepted",
      "Class Size", "Male %", "Female %", "In-State %", "Out-of-State %", "Avg Age", "URM %",
      "Overall Acceptance Rate %", "In-State Acc Rate %", "OOS Acc Rate %", "Intl Acc Rate %", "Interview Rate %",
      "Min Shadowing Hrs", "Rec Shadowing Hrs", "Min Volunteering Hrs", "Rec Volunteering Hrs", "Research Preference", "Research Hrs Expected",
      "LOR Total Required", "LOR Max", "LOR Science Required", "LOR Dentist Required",
      "In-State Tuition", "Out-of-State Tuition", "4-Year Total Cost",
      "AADSAS Deadline", "Secondary Fee", "Casper Required", "Kira Required", "Seat Deposit",
      "Online Classes", "Online Labs", "Pass/Fail Accepted", "Community College Policy",
      "Status", "Verified Count", "Completeness %"
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          escapeCsv(r.school_name), escapeCsv(r.location), escapeCsv(r.state), escapeCsv(r.dean), escapeCsv(r.cycle),
          escapeCsv(r.avg_cgpa), escapeCsv(r.min_cgpa_5th), escapeCsv(r.max_cgpa_95th), escapeCsv(r.avg_sgpa), escapeCsv(r.min_sgpa_5th), escapeCsv(r.max_sgpa_95th), escapeCsv(r.min_cgpa_cutoff), escapeCsv(r.min_sgpa_cutoff),
          escapeCsv(r.avg_dat_aa), escapeCsv(r.min_dat_aa_5th), escapeCsv(r.max_dat_aa_95th), escapeCsv(r.avg_dat_ts), escapeCsv(r.avg_dat_pat), escapeCsv(r.avg_dat_bio), escapeCsv(r.avg_dat_gc), escapeCsv(r.avg_dat_oc), escapeCsv(r.avg_dat_rc), escapeCsv(r.avg_dat_qr), escapeCsv(r.min_dat_cutoff), escapeCsv(r.canadian_dat_accepted ? "Yes" : "No"),
          escapeCsv(r.total_class_size), escapeCsv(r.male_percentage), escapeCsv(r.female_percentage), escapeCsv(r.in_state_percentage), escapeCsv(r.out_of_state_percentage), escapeCsv(r.average_age), escapeCsv(r.urm_percentage),
          escapeCsv(r.overall_acceptance_rate), escapeCsv(r.in_state_acceptance_rate), escapeCsv(r.out_of_state_acceptance_rate), escapeCsv(r.international_acceptance_rate), escapeCsv(r.overall_interview_rate),
          escapeCsv(r.min_shadowing), escapeCsv(r.rec_shadowing), escapeCsv(r.min_volunteering), escapeCsv(r.rec_volunteering), escapeCsv(r.research_preference), escapeCsv(r.research_hours),
          escapeCsv(r.lor_total_required), escapeCsv(r.lor_max), escapeCsv(r.lor_science_faculty), escapeCsv(r.lor_dentist_required ? "Yes" : "No"),
          escapeCsv(r.in_state_tuition), escapeCsv(r.out_of_state_tuition), escapeCsv(r.four_year_cost),
          escapeCsv(r.aadsas_deadline), escapeCsv(r.secondary_fee), escapeCsv(r.casper_required ? "Yes" : "No"), escapeCsv(r.kira_required ? "Yes" : "No"), escapeCsv(r.seat_deposit),
          escapeCsv(r.online_classes_accepted), escapeCsv(r.online_labs_accepted), escapeCsv(r.pass_fail_accepted), escapeCsv(r.community_college_policy),
          escapeCsv(r.status), escapeCsv(r.completeness_verified), escapeCsv(r.completeness_percentage)
        ].join(",")
      )
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dental_school_directory_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Spreadsheet Matrix CSV exported!");
  };

  // Helper badge renderer for domain status
  const renderStatusBadge = (statedInKb?: boolean, status?: string) => {
    if (statedInKb === true && status === "FOUND_VIA_WEB_RESEARCH") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
          <Zap className="h-3 w-3" /> FOUND VIA WEB RESEARCH
        </span>
      );
    }
    if (statedInKb === true || status === "VERIFIED_IN_KB" || status === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> VERIFIED IN KB
        </span>
      );
    }
    if (status === "INFERRED_FROM_BENCHMARK" || status === "INFERRED") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
          <Sliders className="h-3 w-3" /> INFERRED FROM BENCHMARK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-700">
        <HelpCircle className="h-3 w-3" /> NOT STATED IN KB
      </span>
    );
  };

  // Helper to render web research insight callout for any domain
  const renderWebInsight = (domain?: { stated_in_kb?: boolean; verbatim_quote?: string; status?: string }) => {
    if (!domain?.stated_in_kb || !domain?.verbatim_quote) return null;
    return (
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold uppercase text-[10px]">
          <Zap className="h-3 w-3" /> AI Web Research Insight
        </div>
        <p className="text-slate-200 leading-relaxed italic">
          &ldquo;{domain.verbatim_quote}&rdquo;
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-200 pb-16 font-sans space-y-6">

      {/* 1. TOP-LEVEL WORKSPACE MODE SWITCHER */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          onClick={() => setWorkspaceMode("school-hub")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 justify-center sm:flex-none",
            workspaceMode === "school-hub"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          <SchoolIcon className="h-4 w-4" />
          School Intelligence & Sources Hub
        </button>

        <button
          onClick={() => setWorkspaceMode("directory")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 justify-center sm:flex-none",
            workspaceMode === "directory"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          <Database className="h-4 w-4" />
          School Directory Matrix
        </button>

        <button
          onClick={() => setWorkspaceMode("student-strategy")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 justify-center sm:flex-none",
            workspaceMode === "student-strategy"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          <Users className="h-4 w-4" />
          Student Profile Comparison
        </button>
        
        <button
          onClick={() => setWorkspaceMode("knowledgebase")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 justify-center sm:flex-none",
            workspaceMode === "knowledgebase"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          <Globe className="h-4 w-4" />
          Knowledgebase & Review Queue
        </button>
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
        availableSchools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center max-w-xl mx-auto my-8 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <SchoolIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Dental Schools in Catalog</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Your dental school database is empty. Click below to add a dental school and start tracking its admissions criteria.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddSchoolModalOpen(true)}
                className="gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                Add New Dental School
              </Button>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* School Header & Selector Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
                    Saturated Knowledge Base
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                    14 Domains + Baseline Skyline
                  </span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                  {activeSchoolMeta?.name || activeProfile?.name || "Dental School Intelligence"}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeSchoolMeta?.location || activeProfile?.location || "United States"} · Dean:{" "}
                  <span className="text-slate-300 font-medium">
                    {activeProfile?.general_information?.dean || "Not Stated"}
                  </span>
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

            {/* School Hub Navigation Tabs + Find Criteria Button */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSchoolHubTab("profile")}
                  className={cn(
                    "pb-3 font-medium transition-colors flex items-center gap-1.5",
                    schoolHubTab === "profile"
                      ? "border-b-2 border-indigo-500 text-indigo-400 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  14 Saturated Categories & Criteria
                </button>

                <button
                  onClick={() => setSchoolHubTab("weights")}
                  className={cn(
                    "pb-3 font-medium transition-colors flex items-center gap-1.5",
                    schoolHubTab === "weights"
                      ? "border-b-2 border-indigo-500 text-indigo-400 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Scale className="h-3.5 w-3.5 text-indigo-400" />
                  Dynamic Weights & Percentile Scoring
                </button>
              </div>

              {/* Find Required Criteria — AI Web Research Button */}
              {notFoundDomainCount > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleFindCriteria}
                  disabled={isFindingCriteria}
                  className="text-xs gap-1.5 mb-1 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 border-amber-500/40 shadow-md shadow-amber-600/20"
                >
                  {isFindingCriteria ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {isFindingCriteria ? "Researching..." : "Find Required Criteria"}
                  <span className="rounded-full bg-white/20 px-1.5 py-0 text-[10px] font-bold">
                    {notFoundDomainCount} gaps
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* =================================================================== */}
          {/* TAB 1: 14 SATURATED CATEGORIES & CRITERIA EXPLORER */}
          {/* =================================================================== */}
          {schoolHubTab === "profile" && activeProfile && (
            <div className="space-y-6">
              {/* Prominent Callout if School Has No Ingested Admissions Data */}
              {!hasExtractedEvidence && (
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>No Admissions Data Ingested Yet</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Clean Profile Shell
                          </span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          {activeSchoolMeta?.name || activeProfile?.name || "This school"} was added to the directory without criteria. No GPA/DAT scores, prerequisites, shadowing hours, or policies will appear until you ingest official admissions brochures, PDF guidelines, or crawl the school&apos;s website.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleFindCriteria}
                        disabled={isFindingCriteria}
                        className="text-xs gap-1.5 shadow-md shadow-amber-600/20 w-full sm:w-auto justify-center bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 border-amber-500/40"
                      >
                        {isFindingCriteria ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                        {isFindingCriteria ? "Searching Web..." : "Find Required Criteria"}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setWorkspaceMode("knowledgebase");
                          if (activeSchoolMeta?.id) setKbFilterSchoolId(activeSchoolMeta.id);
                        }}
                        className="text-xs gap-1.5 shadow-md shadow-indigo-600/30 w-full sm:w-auto justify-center"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Ingest Documents or Scan Website
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Pill Navigation Bar */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 shadow-sm overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
                  {[
                    { id: "academics", label: "1. Academics", icon: GraduationCap },
                    { id: "dat", label: "2. DAT Standards", icon: Target },
                    { id: "shadowing", label: "3. Shadowing", icon: Eye },
                    { id: "dental_experience", label: "4. Dental Experience", icon: Stethoscope },
                    { id: "service", label: "5. Community Service", icon: HeartHandshake },
                    { id: "leadership", label: "6. Leadership", icon: Award },
                    { id: "research", label: "7. Research", icon: Sparkles },
                    { id: "extracurriculars", label: "8. Extracurriculars", icon: Briefcase },
                    { id: "app_quality", label: "9. App Quality & LOR", icon: FileText },
                    { id: "school_fit", label: "10. School Fit", icon: Compass },
                    { id: "strategy", label: "11. Strategy & Timing", icon: TrendingUp },
                    { id: "holistic", label: "12. Holistic Context", icon: Users },
                    { id: "red_flags", label: "13. Red Flags", icon: Flag },
                    { id: "skills", label: "14. Skills & Values", icon: CheckCircle2 },
                    { id: "preparation", label: "Prep Checklist", icon: BookOpen },
                    { id: "statistics", label: "Admissions Stats", icon: BarChart3 },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id as SaturatedCategoryTab)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Content Panel for the Selected Saturated Category */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-6">
                {/* 1. ACADEMICS */}
                {activeCategory === "academics" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-indigo-400" />
                          Category 1: Academics & GPA Metrics
                        </h3>
                        <p className="text-xs text-slate-400">
                          GPA ranges (5th, average, 95th), post-baccalaureate/master's policies, online/CC coursework, and credit loads.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.academics_domain?.stated_in_kb,
                        activeProfile.academics_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Cumulative GPA (cGPA)</span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          Avg: {activeProfile.academics_domain?.avg_cgpa ?? activeProfile.academic_standards?.avg_cgpa ?? "Not Stated"}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          5th Percentile: {activeProfile.academics_domain?.min_cgpa_5th ?? "Not Stated"} · 95th Percentile: {activeProfile.academics_domain?.max_cgpa_95th ?? "Not Stated"}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Science GPA (sGPA)</span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          Avg: {activeProfile.academics_domain?.avg_sgpa ?? activeProfile.academic_standards?.avg_sgpa ?? "Not Stated"}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          5th Percentile: {activeProfile.academics_domain?.min_sgpa_5th ?? "Not Stated"} · 95th Percentile: {activeProfile.academics_domain?.max_sgpa_95th ?? "Not Stated"}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Post-Bac / Master's</span>
                        <div className="text-xs text-slate-200 font-medium">
                          {activeProfile.academics_domain?.post_bac_or_masters_policy || "Not Stated in KB"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">Coursework Policies</div>
                        <div className="space-y-1.5 text-slate-300">
                          <div><strong className="text-slate-400">Online Classes:</strong> {activeProfile.academics_domain?.online_classes_policy || "Not Stated in KB"}</div>
                          <div><strong className="text-slate-400">Community College:</strong> {activeProfile.academics_domain?.community_college_policy || "Not Stated in KB"}</div>
                          <div><strong className="text-slate-400">GPA Trend:</strong> {activeProfile.academics_domain?.gpa_trend_importance || "Not Stated in KB"}</div>
                          <div><strong className="text-slate-400">Min Prerequisite Grade:</strong> <span className="font-mono text-emerald-400">{activeProfile.academics_domain?.prerequisite_min_grade || "Not Stated in KB"}</span></div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-rose-300 uppercase tracking-wider text-[11px]">Rigor & Red Flags Policy</div>
                        <div className="space-y-1.5 text-slate-300">
                          <div><strong className="text-slate-400">Repeated Courses:</strong> {activeProfile.academics_domain?.repeated_courses_policy || "Not Stated in KB"}</div>
                          <div><strong className="text-slate-400">Withdrawals & Fails:</strong> {activeProfile.academics_domain?.withdrawals_and_fails_policy || "Not Stated in KB"}</div>
                          <div><strong className="text-slate-400">Heavy Course Load:</strong> {activeProfile.academics_domain?.credit_load_capacity_eval || "Not Stated in KB"}</div>
                        </div>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.academics_domain)}
                  </div>
                )}

                {/* 2. DAT STANDARDS */}
                {activeCategory === "dat" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Target className="h-4 w-4 text-indigo-400" />
                          Category 2: Dental Admission Test (DAT) Standards
                        </h3>
                        <p className="text-xs text-slate-400">
                          Percentiles across AA, TS, PAT, subsection preferences (Bio, Chem, Org, RC, QR), retakes, and Canadian DAT.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.dat_domain?.stated_in_kb,
                        activeProfile.dat_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                          <span>Academic Average (AA)</span>
                          <CitationBadge citations={getCitations("dat_aa")} />
                        </div>
                        <div className="text-xl font-bold font-mono text-indigo-400">
                          Avg: {formatDATScore(activeProfile.dat_domain?.avg_dat_aa ?? activeProfile.academic_standards?.avg_dat_aa)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          5th Pct: {formatDATScore(activeProfile.dat_domain?.min_dat_aa_5th)} · 95th Pct: {formatDATScore(activeProfile.dat_domain?.max_dat_aa_95th)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                          <span>Total Science (TS)</span>
                          <CitationBadge citations={getCitations("dat_ts")} />
                        </div>
                        <div className="text-xl font-bold font-mono text-indigo-400">
                          Avg: {formatDATScore(activeProfile.dat_domain?.avg_dat_ts ?? activeProfile.academic_standards?.avg_dat_ts)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          5th Pct: {formatDATScore(activeProfile.dat_domain?.min_dat_ts_5th)} · 95th Pct: {formatDATScore(activeProfile.dat_domain?.max_dat_ts_95th)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                          <span>Perceptual Ability (PAT)</span>
                          <CitationBadge citations={getCitations("dat_pat")} />
                        </div>
                        <div className="text-xl font-bold font-mono text-indigo-400">
                          Avg: {formatDATScore(activeProfile.dat_domain?.avg_dat_pat ?? activeProfile.academic_standards?.avg_dat_pat)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          5th Pct: {formatDATScore(activeProfile.dat_domain?.min_dat_pat_5th)} · 95th Pct: {formatDATScore(activeProfile.dat_domain?.max_dat_pat_95th)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs">
                      <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                        DAT Administrative & Examination Rules
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                        <div>
                          <strong className="text-slate-400">Max Attempts Allowed:</strong>{" "}
                          <span className="font-mono text-slate-100">
                            {activeProfile.dat_domain?.max_attempts_allowed != null ? `${activeProfile.dat_domain.max_attempts_allowed} attempts` : "Not Stated in KB"}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-400">Score Validity:</strong>{" "}
                          <span className="font-mono text-slate-100">
                            {activeProfile.dat_domain?.dat_validity_years != null ? `${activeProfile.dat_domain.dat_validity_years} years` : "Not Stated in KB"}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-400">Canadian DAT Accepted:</strong>{" "}
                          <span className="font-bold text-emerald-400">
                            {activeProfile.dat_domain?.canadian_dat_accepted != null ? (activeProfile.dat_domain.canadian_dat_accepted ? "YES" : "NO") : "Not Stated in KB"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.dat_domain)}
                  </div>
                )}

                {/* 3. SHADOWING */}
                {activeCategory === "shadowing" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Eye className="h-4 w-4 text-indigo-400" />
                          Category 3: Dental Shadowing
                        </h3>
                        <p className="text-xs text-slate-400">
                          Required & recommended shadowing hours, general dentist minimums, and setting variety.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.shadowing_domain?.stated_in_kb,
                        activeProfile.shadowing_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Required Hours</span>
                        <div className="text-2xl font-black font-mono text-emerald-400">
                          {activeProfile.shadowing_domain?.total_hours_required != null ? `${activeProfile.shadowing_domain.total_hours_required}h` : "Not Stated"}
                        </div>
                        <div className="text-[11px] text-slate-500">Hard institutional cutoff</div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Recommended Hours</span>
                        <div className="text-2xl font-black font-mono text-indigo-400">
                          {activeProfile.shadowing_domain?.total_hours_recommended != null ? `${activeProfile.shadowing_domain.total_hours_recommended}h` : "Not Stated"}
                        </div>
                        <div className="text-[11px] text-slate-500">Competitive matriculant benchmark</div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">General Dentist Hours</span>
                        <div className="text-2xl font-black font-mono text-amber-400">
                          {activeProfile.shadowing_domain?.general_dentist_hours_required != null ? `${activeProfile.shadowing_domain.general_dentist_hours_required}h` : "Not Stated"}
                        </div>
                        <div className="text-[11px] text-slate-500">General practice exposure requirement</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs space-y-2 text-slate-300">
                      <div>
                        <strong className="text-slate-400">Specialist Shadowing Policy:</strong>{" "}
                        {activeProfile.shadowing_domain?.specialty_hours_accepted != null
                          ? (activeProfile.shadowing_domain.specialty_hours_accepted ? "Accepted" : "Not Accepted")
                          : (activeProfile.shadowing_domain?.verbatim_quote ? "See insight below" : "Not Stated in KB")}
                      </div>
                      <div>
                        <strong className="text-slate-400">Dental Assisting Counts:</strong>{" "}
                        {activeProfile.shadowing_domain?.dental_assisting_counts != null
                          ? (activeProfile.shadowing_domain.dental_assisting_counts ? "Yes" : "No")
                          : "Not Stated in KB"}
                      </div>
                    </div>

                    {/* Web Research Insight */}
                    {renderWebInsight(activeProfile.shadowing_domain)}
                  </div>
                )}

                {/* 4. DENTAL EXPERIENCE */}
                {activeCategory === "dental_experience" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-indigo-400" />
                          Category 4: Hands-On Dental Experience
                        </h3>
                        <p className="text-xs text-slate-400">
                          Dental assisting, hygiene, dental lab tech roles, and manual dexterity verification.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.dental_experience_domain?.stated_in_kb,
                        activeProfile.dental_experience_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">Clinical Experience Expectations</div>
                        <p className="text-slate-300 leading-relaxed">
                          {activeProfile.dental_experience_domain?.clinical_experience_expected || "Not Stated in KB"}
                        </p>
                        <div className="pt-2">
                          <strong className="text-slate-400">Recommended Hours:</strong>{" "}
                          <span className="font-mono font-bold text-emerald-400">
                            {activeProfile.dental_experience_domain?.hours_recommended != null ? `${activeProfile.dental_experience_domain.hours_recommended}h+` : "Not Stated"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-emerald-300 uppercase tracking-wider text-[11px]">Manual Dexterity Demonstration</div>
                        <p className="text-slate-300 leading-relaxed">
                          {activeProfile.dental_experience_domain?.manual_dexterity_demonstration || "Not Stated in KB"}
                        </p>
                        <div className="pt-2">
                          <strong className="text-slate-400">Assisting/Hygiene Value:</strong>{" "}
                          <span className="text-slate-200">
                            {activeProfile.dental_experience_domain?.assisting_hygiene_experience_value || "Not Stated in KB"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.dental_experience_domain)}
                  </div>
                )}

                {/* 5. COMMUNITY SERVICE */}
                {activeCategory === "service" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <HeartHandshake className="h-4 w-4 text-indigo-400" />
                          Category 5: Community Service & Volunteering
                        </h3>
                        <p className="text-xs text-slate-400">
                          Hours, underserved population focus, and long-term service commitment.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.service_domain?.stated_in_kb,
                        activeProfile.service_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Service Hours</span>
                        <div className="flex items-baseline gap-4">
                          <div>
                            <span className="text-xs text-slate-400">Cutoff:</span>{" "}
                            <span className="text-lg font-bold font-mono text-emerald-400">
                              {activeProfile.service_domain?.hours_required != null ? `${activeProfile.service_domain.hours_required}h` : "Not Stated"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">Recommended:</span>{" "}
                            <span className="text-lg font-bold font-mono text-indigo-400">
                              {activeProfile.service_domain?.hours_recommended != null ? `${activeProfile.service_domain.hours_recommended}h` : "Not Stated"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5 text-xs text-slate-300">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Target Populations</span>
                        <p>{activeProfile.service_domain?.service_focus_and_target_populations || "Not Stated in KB"}</p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.service_domain)}
                  </div>
                )}

                {/* 6. LEADERSHIP */}
                {activeCategory === "leadership" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Award className="h-4 w-4 text-indigo-400" />
                          Category 6: Leadership
                        </h3>
                        <p className="text-xs text-slate-400">
                          Importance level, officer roles, peer mentorship, and tangible initiative metrics.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.leadership_domain?.stated_in_kb,
                        activeProfile.leadership_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">Importance Level</div>
                        <p className="text-base font-bold text-white">
                          {activeProfile.leadership_domain?.importance_level || "Not Stated in KB"}
                        </p>
                        <p className="text-slate-300">
                          {activeProfile.leadership_domain?.initiative_and_impact_metrics || "Not Stated in KB"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Preferred Leadership Types</div>
                        {activeProfile.leadership_domain?.preferred_leadership_types && activeProfile.leadership_domain.preferred_leadership_types.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-1 text-slate-300">
                            {activeProfile.leadership_domain.preferred_leadership_types.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500">Not Stated in KB</p>
                        )}
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.leadership_domain)}
                  </div>
                )}

                {/* 7. RESEARCH */}
                {activeCategory === "research" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-400" />
                          Category 7: Research Experience
                        </h3>
                        <p className="text-xs text-slate-400">
                          Institutional research preference, wet lab vs clinical, publications, and recommended hours.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.research_domain?.stated_in_kb,
                        activeProfile.research_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Institutional Preference</span>
                        <div className="text-lg font-bold text-indigo-400">
                          {activeProfile.research_domain?.preference || "Not Stated in KB"}
                        </div>
                        <div className="text-slate-400">
                          Recommended:{" "}
                          <span className="font-mono text-white">
                            {activeProfile.research_domain?.recommended_hours != null ? `${activeProfile.research_domain.recommended_hours}h` : "Not Stated"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5 col-span-2">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Publications & Bench Focus</span>
                        <p className="text-slate-300">
                          {activeProfile.research_domain?.bench_vs_clinical || "Not Stated in KB"}
                        </p>
                        <p className="text-slate-400">
                          {activeProfile.research_domain?.publications_posters_value || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.research_domain)}
                  </div>
                )}

                {/* 8. EXTRACURRICULARS */}
                {activeCategory === "extracurriculars" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-indigo-400" />
                          Category 8: Extracurricular Activities
                        </h3>
                        <p className="text-xs text-slate-400">
                          Depth vs. breadth of commitments, collegiate athletics, music, and non-dental employment.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.extracurriculars_domain?.stated_in_kb,
                        activeProfile.extracurriculars_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Depth vs Breadth</div>
                        <p className="text-slate-300">
                          {activeProfile.extracurriculars_domain?.depth_vs_breadth || "Not Stated in KB"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Athletics, Arts & Work Experience</div>
                        <p className="text-slate-300">
                          {activeProfile.extracurriculars_domain?.work_experience_non_dental || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.extracurriculars_domain)}
                  </div>
                )}

                {/* 9. APPLICATION QUALITY */}
                {activeCategory === "app_quality" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-400" />
                          Category 9: Application Quality & Letters of Evaluation
                        </h3>
                        <p className="text-xs text-slate-400">
                          Personal statement priorities, letters of recommendation specifications, and Casper requirements.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.application_quality_domain?.stated_in_kb,
                        activeProfile.application_quality_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">Personal Statement Priorities</div>
                        <p className="text-slate-300 leading-relaxed">
                          {activeProfile.application_quality_domain?.personal_statement_priorities || "Not Stated in KB"}
                        </p>
                        <div className="pt-2">
                          <strong className="text-slate-400">Casper / Snapshot Required:</strong>{" "}
                          <span className="font-bold text-emerald-400">
                            {activeProfile.application_quality_domain?.casper_snapshot_required != null ? (activeProfile.application_quality_domain.casper_snapshot_required ? "YES" : "NO") : "Not Stated in KB"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-emerald-300 uppercase tracking-wider text-[11px]">Letters of Evaluation (LOR)</div>
                        <p className="text-slate-300 leading-relaxed">
                          {activeProfile.application_quality_domain?.letters_of_evaluation_requirements || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.application_quality_domain)}
                  </div>
                )}

                {/* 10. SCHOOL FIT */}
                {activeCategory === "school_fit" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Compass className="h-4 w-4 text-indigo-400" />
                          Category 10: School Fit & Clinical Culture
                        </h3>
                        <p className="text-xs text-slate-400">
                          Mission alignment, geographical preference, cohort size, and clinical pedagogy.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.school_fit_domain?.stated_in_kb,
                        activeProfile.school_fit_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Class Size</span>
                        <div className="text-2xl font-black font-mono text-white">
                          {activeProfile.school_fit_domain?.class_size || activeProfile.enrollee_statistics?.total_class_size || "Not Stated"}
                        </div>
                        <div className="text-slate-400">Entering D1 class cohort</div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1.5 col-span-2">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Geographical Preference</span>
                        <p className="text-slate-300">
                          {activeProfile.school_fit_domain?.geographical_preference || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.school_fit_domain)}
                  </div>
                )}

                {/* 11. STRATEGY */}
                {activeCategory === "strategy" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-indigo-400" />
                          Category 11: Application Strategy & Timing
                        </h3>
                        <p className="text-xs text-slate-400">
                          Rolling admissions impact, interview format (MMI vs Traditional), and update letters policy.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.application_strategy_domain?.stated_in_kb,
                        activeProfile.application_strategy_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Interview Format</div>
                        <div className="text-sm font-bold text-indigo-400">
                          {activeProfile.application_strategy_domain?.interview_format || "Not Stated in KB"}
                        </div>
                        <p className="text-slate-300">
                          {activeProfile.application_strategy_domain?.timeline_submission_impact || "Not Stated in KB"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Update Letters Policy</div>
                        <p className="text-slate-300">
                          {activeProfile.application_strategy_domain?.update_letters_policy || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.application_strategy_domain)}
                  </div>
                )}

                {/* 12. HOLISTIC CONTEXT */}
                {activeCategory === "holistic" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-400" />
                          Category 12: Holistic Context & Non-Traditional Paths
                        </h3>
                        <p className="text-xs text-slate-400">
                          First-generation, socioeconomic considerations, career changers, and working through college.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.holistic_context_domain?.stated_in_kb,
                        activeProfile.holistic_context_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">First-Gen & Socioeconomic Weight</div>
                        <p className="text-slate-300">
                          {activeProfile.holistic_context_domain?.first_gen_socioeconomic_weight || "Not Stated in KB"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-emerald-300 uppercase tracking-wider text-[11px]">Working During Undergrad</div>
                        <p className="text-slate-300">
                          {activeProfile.holistic_context_domain?.hours_worked_during_undergrad_consideration || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.holistic_context_domain)}
                  </div>
                )}

                {/* 13. RED FLAGS */}
                {activeCategory === "red_flags" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Flag className="h-4 w-4 text-rose-400" />
                          Category 13: Red Flags & Institutional Filters
                        </h3>
                        <p className="text-xs text-slate-400">
                          Academic integrity violations, criminal background screening, and strict deadlines.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.red_flags_domain?.stated_in_kb,
                        activeProfile.red_flags_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-rose-400 uppercase tracking-wider text-[11px]">Academic Misconduct Leniency</div>
                        <p className="text-slate-300">
                          {activeProfile.red_flags_domain?.academic_misconduct_leniency || "Not Stated in KB"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-amber-400 uppercase tracking-wider text-[11px]">Criminal Background Checks</div>
                        <p className="text-slate-300">
                          {activeProfile.red_flags_domain?.criminal_background_policy || "Not Stated in KB"}
                        </p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.red_flags_domain)}
                  </div>
                )}

                {/* 14. SKILLS & VALUES */}
                {activeCategory === "skills" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Category 14: Skills & Core Institutional Values
                        </h3>
                        <p className="text-xs text-slate-400">
                          Institutional core values, manual dexterity demonstrations, and interpersonal skills.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.skills_domain?.stated_in_kb,
                        activeProfile.skills_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">Core Values</div>
                        {activeProfile.skills_domain?.core_values && activeProfile.skills_domain.core_values.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {activeProfile.skills_domain.core_values.map((val, idx) => (
                              <span key={idx} className="rounded bg-indigo-500/10 text-indigo-300 px-2 py-0.5 border border-indigo-500/20 text-xs">
                                {val}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">Not Stated in KB</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Manual Dexterity Proof Examples</div>
                        {activeProfile.skills_domain?.manual_dexterity_examples && activeProfile.skills_domain.manual_dexterity_examples.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-1 text-slate-300">
                            {activeProfile.skills_domain.manual_dexterity_examples.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500">Not Stated in KB</p>
                        )}
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.skills_domain)}
                  </div>
                )}

                {/* PREPARATION CHECKLIST */}
                {activeCategory === "preparation" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-indigo-400" />
                          Requirements & Preparation Audit Checklist
                        </h3>
                        <p className="text-xs text-slate-400">
                          Online courses, online labs, P/F grades, expiration limits, and dental assisting counting rules.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.preparation_domain?.stated_in_kb,
                        activeProfile.preparation_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Online Coursework</span>
                        <p className="text-slate-200">{activeProfile.preparation_domain?.online_coursework_accepted || "Not Stated in KB"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Online Labs</span>
                        <p className="text-slate-200">{activeProfile.preparation_domain?.online_labs_accepted || "Not Stated in KB"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Pass / Fail Grades</span>
                        <p className="text-slate-200">{activeProfile.preparation_domain?.pass_fail_grades_accepted || "Not Stated in KB"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Course Expiration</span>
                        <p className="text-slate-200">{activeProfile.preparation_domain?.expiration_of_classes || "Not Stated in KB"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Dental Assisting as Shadowing</span>
                        <p className="text-slate-200">{activeProfile.preparation_domain?.dental_assisting_counts_towards_shadowing || "Not Stated in KB"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">LOR Summary</span>
                        <p className="text-slate-200">{activeProfile.preparation_domain?.letters_of_recommendation_summary || "Not Stated in KB"}</p>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.preparation_domain)}
                  </div>
                )}

                {/* ADMISSIONS STATISTICS */}
                {activeCategory === "statistics" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-indigo-400" />
                          Admissions Statistics & Rates Breakdown
                        </h3>
                        <p className="text-xs text-slate-400">
                          IS/OOS, male/female, reapplicant vs first-time, and interview invitation rates.
                        </p>
                      </div>
                      {renderStatusBadge(
                        activeProfile.statistics_domain?.stated_in_kb,
                        activeProfile.statistics_domain?.status
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-center space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Overall Acceptance</div>
                        <div className="text-2xl font-black font-mono text-emerald-400">
                          {activeProfile.statistics_domain?.overall_acceptance_rate != null ? `${activeProfile.statistics_domain.overall_acceptance_rate}%` : "Not Stated"}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-center space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">In-State Acceptance</div>
                        <div className="text-2xl font-black font-mono text-indigo-400">
                          {activeProfile.statistics_domain?.in_state_acceptance_rate != null ? `${activeProfile.statistics_domain.in_state_acceptance_rate}%` : "Not Stated"}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-center space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Out-of-State Acceptance</div>
                        <div className="text-2xl font-black font-mono text-indigo-400">
                          {activeProfile.statistics_domain?.out_of_state_acceptance_rate != null ? `${activeProfile.statistics_domain.out_of_state_acceptance_rate}%` : "Not Stated"}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-center space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Interview Invitation Rate</div>
                        <div className="text-2xl font-black font-mono text-amber-400">
                          {activeProfile.statistics_domain?.overall_interview_rate != null ? `${activeProfile.statistics_domain.overall_interview_rate}%` : "Not Stated"}
                        </div>
                      </div>
                    </div>
                    {renderWebInsight(activeProfile.statistics_domain)}
                  </div>
                )}
              </div>

              {/* Prerequisites Matrix Table (Always Accessible at bottom of profile) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
                <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    PREREQUISITES MATRIX FOR {activeSchoolMeta?.name}
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
                          <th className="py-2.5 px-4 text-center">Credits (Sem/Qtr)</th>
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

          {/* =================================================================== */}
          {/* TAB 2: DYNAMIC WEIGHTS & PERCENTILE RANGE MATRIX */}
          {/* =================================================================== */}
          {schoolHubTab === "weights" && activeProfile && (
            <div className="space-y-6">
              {!hasExtractedEvidence ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                    <Scale className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">No Admissions Criteria Ingested Yet</h4>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1.5 mb-5 leading-relaxed">
                    The AI dynamic weights and calibrated stringency matrix require extracted school criteria. No scoring weights or percentile cutoffs are generated until you ingest official admission documents or crawl the school website.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setWorkspaceMode("knowledgebase");
                      if (activeSchoolMeta?.id) setKbFilterSchoolId(activeSchoolMeta.id);
                    }}
                    className="text-xs gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Ingest Documents or Scan Website
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Scale className="h-5 w-5 text-indigo-400" />
                        Dynamic Weights & Percentile Range Matrix
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Visualizing how the AI scoring engine dynamically weighs categories based on {activeSchoolMeta?.name || activeProfile.name}&apos;s specific requirements and percentile distributions.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                        <tr>
                          <th className="py-3 px-4">Evaluation Domain</th>
                          <th className="py-3 px-4 text-center">Lower Bound (5th Pct)</th>
                          <th className="py-3 px-4 text-center">Average Target</th>
                          <th className="py-3 px-4 text-center">Upper Bound (95th Pct)</th>
                          <th className="py-3 px-4 text-center">Relative Stringency</th>
                          <th className="py-3 px-4 text-center">Calibrated Dynamic Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {[
                          {
                            domain: "Academics & GPA",
                            metric: "cGPA / sGPA",
                            baseline: activeProfile?.academics_domain?.min_cgpa_5th ? `${activeProfile.academics_domain.min_cgpa_5th} min` : "Not Stated",
                            school: activeProfile?.academics_domain?.avg_cgpa ? `${activeProfile.academics_domain.avg_cgpa} / ${activeProfile.academics_domain.avg_sgpa ?? "—"}` : "Not Stated in KB",
                            skyline: activeProfile?.academics_domain?.max_cgpa_95th ? `${activeProfile.academics_domain.max_cgpa_95th}` : "Competitive",
                            intensity: ((activeProfile?.dynamic_weights?.relative_intensities?.["cgpa_avg"] ?? 0.5) + (activeProfile?.dynamic_weights?.relative_intensities?.["sgpa_avg"] ?? 0.5)) / 2,
                            weight: activeProfile?.dynamic_weights?.academics_gpa_weight ?? 22.0,
                          },
                          {
                            domain: "DAT Examination",
                            metric: "AA / TS",
                            baseline: activeProfile?.dat_domain?.min_dat_aa_5th ? `${formatDATScore(activeProfile.dat_domain.min_dat_aa_5th)} min` : "Not Stated",
                            school: activeProfile?.dat_domain?.avg_dat_aa ? `${formatDATScore(activeProfile.dat_domain.avg_dat_aa)}` : (activeProfile?.dat_domain?.min_dat_aa_5th ? `≥${formatDATScore(activeProfile.dat_domain.min_dat_aa_5th)} min` : (activeProfile?.dat_domain?.stated_in_kb ? (activeProfile.dat_domain.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB")),
                            skyline: activeProfile?.dat_domain?.max_dat_aa_95th ? `≥${formatDATScore(activeProfile.dat_domain.max_dat_aa_95th)}` : "Competitive",
                            intensity: (activeProfile?.dynamic_weights?.relative_intensities?.["dat_aa_avg"] ?? 0.5) * 0.5 + (activeProfile?.dynamic_weights?.relative_intensities?.["dat_ts_avg"] ?? 0.5) * 0.3 + (activeProfile?.dynamic_weights?.relative_intensities?.["dat_pat_avg"] ?? 0.5) * 0.2,
                            weight: activeProfile?.dynamic_weights?.dat_weight ?? 22.0,
                          },
                          {
                            domain: "Dental Shadowing",
                            metric: "Total Hours",
                            baseline: activeProfile?.shadowing_domain?.total_hours_required ? `${activeProfile.shadowing_domain.total_hours_required}h min` : "Not Stated",
                            school: activeProfile?.shadowing_domain?.total_hours_required != null ? `${activeProfile.shadowing_domain.total_hours_required}h${activeProfile.shadowing_domain.total_hours_recommended ? ` (${activeProfile.shadowing_domain.total_hours_recommended}h rec)` : ""}` : (activeProfile?.shadowing_domain?.total_hours_recommended != null ? `${activeProfile.shadowing_domain.total_hours_recommended}h rec` : (activeProfile?.shadowing_domain?.stated_in_kb ? (activeProfile.shadowing_domain.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB")),
                            skyline: activeProfile?.shadowing_domain?.total_hours_recommended ? `${activeProfile.shadowing_domain.total_hours_recommended}h+` : "100h+",
                            intensity: (activeProfile?.dynamic_weights?.relative_intensities?.["min_shadowing_hours"] ?? 0.5) * 0.6 + (activeProfile?.dynamic_weights?.relative_intensities?.["recommended_shadowing_hours"] ?? 0.5) * 0.4,
                            weight: activeProfile?.dynamic_weights?.shadowing_weight ?? 14.0,
                          },
                          {
                            domain: "Dental Clinical Experience",
                            metric: "Chairside Assisting / Hygiene",
                            baseline: "Optional",
                            school: activeProfile?.dental_experience_domain?.hands_on_dental_experience || (activeProfile?.dental_experience_domain?.employment_types_accepted?.length ? activeProfile.dental_experience_domain.employment_types_accepted.join(", ") : (activeProfile?.dental_experience_domain?.stated_in_kb ? (activeProfile.dental_experience_domain.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB")),
                            skyline: "Paid / Assisting",
                            intensity: activeProfile?.dynamic_weights?.relative_intensities?.["dental_experience_hours"] ?? 0.50,
                            weight: activeProfile?.dynamic_weights?.dental_experience_weight ?? 10.0,
                          },
                          {
                            domain: "Community Service",
                            metric: "Volunteer Hours",
                            baseline: activeProfile?.service_domain?.total_volunteering_hours_min ? `${activeProfile.service_domain.total_volunteering_hours_min}h min` : "Not Stated",
                            school: activeProfile?.service_domain?.total_volunteering_hours_min != null ? `${activeProfile.service_domain.total_volunteering_hours_min}h${activeProfile.service_domain.total_volunteering_hours_recommended ? ` (${activeProfile.service_domain.total_volunteering_hours_recommended}h rec)` : ""}` : (activeProfile?.service_domain?.total_volunteering_hours_recommended != null ? `${activeProfile.service_domain.total_volunteering_hours_recommended}h rec` : (activeProfile?.service_domain?.stated_in_kb ? (activeProfile.service_domain.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB")),
                            skyline: activeProfile?.service_domain?.total_volunteering_hours_recommended ? `${activeProfile.service_domain.total_volunteering_hours_recommended}h+` : "100h+",
                            intensity: (activeProfile?.dynamic_weights?.relative_intensities?.["min_volunteering_hours"] ?? 0.5) * 0.5 + (activeProfile?.dynamic_weights?.relative_intensities?.["recommended_volunteering_hours"] ?? 0.5) * 0.5,
                            weight: activeProfile?.dynamic_weights?.service_weight ?? 10.0,
                          },
                          {
                            domain: "Research Experience",
                            metric: "Wet Lab / Clinical",
                            baseline: "Optional",
                            school: activeProfile?.research_domain?.preference ? `${activeProfile.research_domain.preference}${activeProfile.research_domain.hours_expected ? ` (${activeProfile.research_domain.hours_expected}h)` : ""}` : (activeProfile?.research_domain?.stated_in_kb ? (activeProfile.research_domain.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB"),
                            skyline: "Publication / Poster",
                            intensity: activeProfile?.dynamic_weights?.relative_intensities?.["research_hours"] ?? 0.50,
                            weight: activeProfile?.dynamic_weights?.research_weight ?? 6.0,
                          },
                          {
                            domain: "Leadership & Mentorship",
                            metric: "Club Exec / Tutoring",
                            baseline: "Encouraged",
                            school: activeProfile?.leadership_domain?.positions_expected || (activeProfile?.leadership_domain?.stated_in_kb ? (activeProfile.leadership_domain?.verbatim_quote?.slice(0, 80) || activeProfile.leadership_domain?.demonstrated_impact || "See school criteria") : "Not Stated in KB"),
                            skyline: "E-Board / President",
                            intensity: 0.50,
                            weight: activeProfile?.dynamic_weights?.leadership_weight ?? 6.0,
                          },
                          {
                            domain: "Extracurriculars & Work",
                            metric: "Depth of Non-Dental",
                            baseline: "Encouraged",
                            school: activeProfile?.extracurriculars_domain?.clubs_organizations || activeProfile?.extracurriculars_domain?.sustained_involvement || (activeProfile?.extracurriculars_domain?.stated_in_kb ? (activeProfile.extracurriculars_domain?.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB"),
                            skyline: "Collegiate Athlete / High Impact",
                            intensity: 0.50,
                            weight: activeProfile?.dynamic_weights?.extracurriculars_weight ?? 4.0,
                          },
                          {
                            domain: "Application Quality & LORs",
                            metric: "Essays & Recommendations",
                            baseline: "Required",
                            school: activeProfile?.application_quality_domain?.letters_of_recommendation_expectations || (activeProfile?.application_quality_domain?.stated_in_kb ? (activeProfile.application_quality_domain?.verbatim_quote?.slice(0, 80) || activeProfile.application_quality_domain?.personal_statement_strength || "See school criteria") : "Not Stated in KB"),
                            skyline: "Exceptional LORs",
                            intensity: 0.50,
                            weight: activeProfile?.dynamic_weights?.application_quality_weight ?? 3.0,
                          },
                          {
                            domain: "School Fit",
                            metric: "Residency & Values",
                            baseline: "General",
                            school: activeProfile?.school_fit_domain?.mission_alignment || (activeProfile?.school_fit_domain?.stated_in_kb ? (activeProfile.school_fit_domain?.verbatim_quote?.slice(0, 80) || "See school criteria") : "Not Stated in KB"),
                            skyline: "Direct Mission Match",
                            intensity: 0.50,
                            weight: activeProfile?.dynamic_weights?.school_fit_weight ?? 3.0,
                          },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-100">{row.domain}</div>
                              <div className="text-[11px] text-slate-400">{row.metric}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{row.baseline}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-indigo-300">{row.school}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{row.skyline}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.min(100, row.intensity * 100)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] text-slate-300">
                                  {(row.intensity * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 border border-indigo-500/20">
                                {row.weight.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* =================================================================== */}
          {/* TAB 3: SPREADSHEET MATRIX (Removed from here, moved to Directory Mode) */}
          {/* =================================================================== */}
        </div>
        )
      )}

      {/* =================================================================== */}
      {/* WORKSPACE: SCHOOL DIRECTORY MATRIX */}
      {/* =================================================================== */}
      {/* =================================================================== */}
      {/* WORKSPACE: SCHOOL DIRECTORY MATRIX */}
      {/* =================================================================== */}
      {workspaceMode === "directory" && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          {/* Header & Controls */}
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-400" />
                  Dental School Directory & Matrix ({filteredAndSortedDirectoryRows.length} Schools)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Comparative matrix across 60+ admissions metrics, demographics, and clinical requirements.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search schools, state, dean..."
                    value={spreadsheetSearch}
                    onChange={(e) => setSpreadsheetSearch(e.target.value)}
                    className="h-8 rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none w-56"
                  />
                  {spreadsheetSearch && (
                    <button
                      onClick={() => setSpreadsheetSearch("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv(filteredAndSortedDirectoryRows)}
                  className="text-xs h-8 gap-1.5 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-400" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
              {[
                { id: "all", label: "All 60+ Columns" },
                { id: "academics", label: "GPA & Academics" },
                { id: "dat", label: "DAT Standardized" },
                { id: "demographics", label: "Demographics & Rates" },
                { id: "experience", label: "Clinical & Experience" },
                { id: "logistics", label: "Tuition & Logistics" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setDirectoryCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap",
                    directoryCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Matrix Table */}
          {filteredAndSortedDirectoryRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No dental schools found matching "{spreadsheetSearch}".
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 pb-2 custom-scrollbar">
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium select-none">
                  {/* Category Super-Headers */}
                  <tr className="border-b border-slate-800/60 bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="sticky left-0 bg-slate-950 z-20 py-1.5 px-3 border-r border-slate-800" colSpan={2}>
                      Institution
                    </th>
                    {(directoryCategory === "all" || directoryCategory === "academics") && (
                      <th className="py-1.5 px-3 text-center border-r border-slate-800 text-emerald-400" colSpan={7}>
                        Academics & GPA Standards
                      </th>
                    )}
                    {(directoryCategory === "all" || directoryCategory === "dat") && (
                      <th className="py-1.5 px-3 text-center border-r border-slate-800 text-indigo-400" colSpan={7}>
                        DAT Exam Statistics
                      </th>
                    )}
                    {(directoryCategory === "all" || directoryCategory === "demographics") && (
                      <th className="py-1.5 px-3 text-center border-r border-slate-800 text-purple-400" colSpan={7}>
                        Enrollees & Acceptance Rates
                      </th>
                    )}
                    {(directoryCategory === "all" || directoryCategory === "experience") && (
                      <th className="py-1.5 px-3 text-center border-r border-slate-800 text-cyan-400" colSpan={6}>
                        Clinical, Service & LORs
                      </th>
                    )}
                    {(directoryCategory === "all" || directoryCategory === "logistics") && (
                      <th className="py-1.5 px-3 text-center text-amber-400" colSpan={6}>
                        Tuition, Deadlines & Policies
                      </th>
                    )}
                  </tr>

                  {/* Sub-Headers with Sorting */}
                  <tr>
                    <th
                      onClick={() => toggleSort("school_name")}
                      className="sticky left-0 bg-slate-950 z-20 py-2 px-3 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1.5">
                        School Name
                        {sortField === "school_name" ? (
                          sortAsc ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("location")}
                      className="py-2 px-3 border-r border-slate-800 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1.5">
                        Location
                        {sortField === "location" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>

                    {/* ACADEMICS COLUMNS */}
                    {(directoryCategory === "all" || directoryCategory === "academics") && (
                      <>
                        <th onClick={() => toggleSort("avg_cgpa")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Mean cGPA
                        </th>
                        <th onClick={() => toggleSort("min_cgpa_5th")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          5th% cGPA
                        </th>
                        <th onClick={() => toggleSort("max_cgpa_95th")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          95th% cGPA
                        </th>
                        <th onClick={() => toggleSort("avg_sgpa")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Mean sGPA
                        </th>
                        <th onClick={() => toggleSort("min_sgpa_5th")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          5th% sGPA
                        </th>
                        <th onClick={() => toggleSort("min_cgpa_cutoff")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Min Req cGPA
                        </th>
                        <th onClick={() => toggleSort("min_sgpa_cutoff")} className="py-2 px-3 text-center border-r border-slate-800 cursor-pointer hover:text-white">
                          Min Req sGPA
                        </th>
                      </>
                    )}

                    {/* DAT COLUMNS */}
                    {(directoryCategory === "all" || directoryCategory === "dat") && (
                      <>
                        <th onClick={() => toggleSort("avg_dat_aa")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Mean DAT AA
                        </th>
                        <th onClick={() => toggleSort("min_dat_aa_5th")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          5th% DAT AA
                        </th>
                        <th onClick={() => toggleSort("avg_dat_ts")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Mean DAT TS
                        </th>
                        <th onClick={() => toggleSort("avg_dat_pat")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Mean DAT PAT
                        </th>
                        <th onClick={() => toggleSort("avg_dat_bio")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Biology
                        </th>
                        <th onClick={() => toggleSort("avg_dat_rc")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Reading Comp
                        </th>
                        <th onClick={() => toggleSort("min_dat_cutoff")} className="py-2 px-3 text-center border-r border-slate-800 cursor-pointer hover:text-white">
                          Min DAT Cutoff
                        </th>
                      </>
                    )}

                    {/* DEMOGRAPHICS & RATES */}
                    {(directoryCategory === "all" || directoryCategory === "demographics") && (
                      <>
                        <th onClick={() => toggleSort("overall_acceptance_rate")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Acc. Rate
                        </th>
                        <th onClick={() => toggleSort("in_state_acceptance_rate")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          IS Rate
                        </th>
                        <th onClick={() => toggleSort("out_of_state_acceptance_rate")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          OOS Rate
                        </th>
                        <th onClick={() => toggleSort("international_acceptance_rate")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Intl Rate
                        </th>
                        <th onClick={() => toggleSort("overall_interview_rate")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Interview Rate
                        </th>
                        <th onClick={() => toggleSort("total_class_size")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Class Size
                        </th>
                        <th onClick={() => toggleSort("in_state_percentage")} className="py-2 px-3 text-center border-r border-slate-800 cursor-pointer hover:text-white">
                          In-State %
                        </th>
                      </>
                    )}

                    {/* CLINICAL & EXPERIENCE */}
                    {(directoryCategory === "all" || directoryCategory === "experience") && (
                      <>
                        <th onClick={() => toggleSort("min_shadowing")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Shadowing Req
                        </th>
                        <th onClick={() => toggleSort("rec_shadowing")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Shadowing Rec
                        </th>
                        <th onClick={() => toggleSort("min_volunteering")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Volunteering Req
                        </th>
                        <th onClick={() => toggleSort("research_preference")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Research
                        </th>
                        <th onClick={() => toggleSort("lor_total_required")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          LOR Total
                        </th>
                        <th onClick={() => toggleSort("lor_science_faculty")} className="py-2 px-3 text-center border-r border-slate-800 cursor-pointer hover:text-white">
                          LOR Science
                        </th>
                      </>
                    )}

                    {/* LOGISTICS & POLICIES */}
                    {(directoryCategory === "all" || directoryCategory === "logistics") && (
                      <>
                        <th onClick={() => toggleSort("in_state_tuition")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          In-State Tuition
                        </th>
                        <th onClick={() => toggleSort("out_of_state_tuition")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          OOS Tuition
                        </th>
                        <th onClick={() => toggleSort("aadsas_deadline")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          AADSAS Deadline
                        </th>
                        <th onClick={() => toggleSort("secondary_fee")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Secondary Fee
                        </th>
                        <th onClick={() => toggleSort("casper_required")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Casper
                        </th>
                        <th onClick={() => toggleSort("online_classes_accepted")} className="py-2 px-3 text-center cursor-pointer hover:text-white">
                          Online Classes
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredAndSortedDirectoryRows.map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="sticky left-0 bg-slate-900 z-10 py-2 px-3 font-semibold text-slate-100 max-w-[200px] truncate shadow-sm border-r border-slate-800" title={row.school_name}>
                        <button
                          onClick={() => {
                            setSelectedSchoolId(row.school_id);
                            setWorkspaceMode("school-hub");
                            setSchoolHubTab("profile");
                          }}
                          className="hover:text-indigo-400 text-left truncate w-full"
                        >
                          {row.school_name}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-400 border-r border-slate-800 truncate max-w-[140px]" title={row.location}>
                        {row.location}
                      </td>

                      {/* ACADEMICS CELLS */}
                      {(directoryCategory === "all" || directoryCategory === "academics") && (
                        <>
                          <td className="py-2 px-3 text-center font-mono text-emerald-400 font-bold">{row.avg_cgpa ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{row.min_cgpa_5th ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{row.max_cgpa_95th ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-400">{row.avg_sgpa ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{row.min_sgpa_5th ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-rose-400">{row.min_cgpa_cutoff ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-rose-400 border-r border-slate-800">{row.min_sgpa_cutoff ?? "—"}</td>
                        </>
                      )}

                      {/* DAT CELLS */}
                      {(directoryCategory === "all" || directoryCategory === "dat") && (
                        <>
                          <td className="py-2 px-3 text-center font-mono text-indigo-400 font-bold">{formatDATScore(row.avg_dat_aa)}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{formatDATScore(row.min_dat_aa_5th)}</td>
                          <td className="py-2 px-3 text-center font-mono">{formatDATScore(row.avg_dat_ts)}</td>
                          <td className="py-2 px-3 text-center font-mono">{formatDATScore(row.avg_dat_pat)}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{formatDATScore(row.avg_dat_bio)}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{formatDATScore(row.avg_dat_rc)}</td>
                          <td className="py-2 px-3 text-center font-mono text-rose-400 border-r border-slate-800">{formatDATScore(row.min_dat_cutoff)}</td>
                        </>
                      )}

                      {/* DEMOGRAPHICS CELLS */}
                      {(directoryCategory === "all" || directoryCategory === "demographics") && (
                        <>
                          <td className="py-2 px-3 text-center font-mono text-purple-300 font-semibold">{row.overall_acceptance_rate != null ? `${row.overall_acceptance_rate}%` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono">{row.in_state_acceptance_rate != null ? `${row.in_state_acceptance_rate}%` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono">{row.out_of_state_acceptance_rate != null ? `${row.out_of_state_acceptance_rate}%` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono">{row.international_acceptance_rate != null ? `${row.international_acceptance_rate}%` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono">{row.overall_interview_rate != null ? `${row.overall_interview_rate}%` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-300">{row.total_class_size ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono border-r border-slate-800">{row.in_state_percentage != null ? `${row.in_state_percentage}%` : "—"}</td>
                        </>
                      )}

                      {/* EXPERIENCE CELLS */}
                      {(directoryCategory === "all" || directoryCategory === "experience") && (
                        <>
                          <td className="py-2 px-3 text-center font-mono text-cyan-300 font-semibold">{row.min_shadowing != null ? `${row.min_shadowing}h` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{row.rec_shadowing != null ? `${row.rec_shadowing}h` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-300">{row.min_volunteering != null ? `${row.min_volunteering}h` : "—"}</td>
                          <td className="py-2 px-3 text-center text-[10px] text-slate-400 truncate max-w-[90px]" title={row.research_preference}>{row.research_preference ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-300">{row.lor_total_required ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono border-r border-slate-800 text-slate-300">{row.lor_science_faculty ?? "—"}</td>
                        </>
                      )}

                      {/* LOGISTICS CELLS */}
                      {(directoryCategory === "all" || directoryCategory === "logistics") && (
                        <>
                          <td className="py-2 px-3 text-center font-mono text-amber-400">{row.in_state_tuition ? `$${row.in_state_tuition.toLocaleString()}` : "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-amber-400">{row.out_of_state_tuition ? `$${row.out_of_state_tuition.toLocaleString()}` : "—"}</td>
                          <td className="py-2 px-3 text-center text-[10px] text-slate-400">{row.aadsas_deadline ?? "—"}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-300">{row.secondary_fee != null ? `$${row.secondary_fee}` : "—"}</td>
                          <td className="py-2 px-3 text-center">
                            {row.casper_required === true ? (
                              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">Required</span>
                            ) : row.casper_required === false ? (
                              <span className="text-slate-500 text-[10px]">No</span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-[10px] text-slate-400 truncate max-w-[110px]" title={row.online_classes_accepted}>{row.online_classes_accepted ?? "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* WORKSPACE 3: KNOWLEDGEBASE & REVIEW QUEUE */}
      {/* =================================================================== */}
      {workspaceMode === "knowledgebase" && (
        <div className="space-y-6">
          
          {/* TOP TOOLBAR: FILTER BY SCHOOL & STATS */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Filter Knowledge Base:</span>
              <div className="w-64">
                <SelectMenu
                  options={[
                    { value: "all", label: "All Schools (Global)" },
                    ...availableSchools.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  value={kbFilterSchoolId}
                  onChange={setKbFilterSchoolId}
                  placeholder="Filter by school..."
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Database className="h-4 w-4 text-indigo-400" />
                <span>Ingested Sources:</span>
                <span className="font-bold text-white font-mono">{addedKnowledgeBases.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Evidence Points:</span>
                <span className="font-bold text-white font-mono">
                  {addedKnowledgeBases.reduce((acc, k) => acc + k.pointsExtracted, 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span>Pending Review:</span>
                <span className="font-bold text-white font-mono">
                  {reviewQueue.filter((r) => r.issue_type !== "VERIFIED").length}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: ADD KNOWLEDGE (INGESTION) */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Feed Admissions Sources & Documents
                </h2>
              </div>
              <span className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                AI Saturated Extraction Pipeline
              </span>
            </div>

            <div className="space-y-4">
              {/* Step 1: Target School */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">1. Target School</label>
                <SelectMenu
                  options={availableSchools.map((s) => ({ value: s.id, label: s.name }))}
                  value={selectedSchoolId}
                  onChange={setSelectedSchoolId}
                  placeholder="Select Target School..."
                  className="w-full sm:w-80"
                />
              </div>

              {/* Step 2: Source input */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">2. Source Material (Official URL or Document)</label>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="Enter admissions URL (e.g., https://dental.uthscsa.edu/admissions/prerequisites)..."
                      value={crawlUrl}
                      onChange={(e) => {
                        setCrawlUrl(e.target.value);
                        if (e.target.value) setSelectedFile(null);
                      }}
                      disabled={!!selectedFile}
                      className="w-full h-10 rounded-lg border border-slate-700 bg-slate-950 px-3.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1">OR</span>
                  </div>

                  <div className="flex-1">
                    <label className={cn(
                      "flex h-10 cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed transition-all px-3.5 text-xs font-medium",
                      selectedFile
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                        : "border-indigo-500/40 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-950/40",
                      !!crawlUrl && "opacity-50 pointer-events-none"
                    )}>
                      {selectedFile ? (
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{selectedFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Upload className="h-4 w-4 text-indigo-400" />
                          <span>Upload PDF, Flyer or Brochure</span>
                        </div>
                      )}

                      {selectedFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] uppercase hover:bg-emerald-500/40 text-emerald-300"
                        >
                          Clear
                        </button>
                      )}

                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={!selectedSchoolId || !!crawlUrl}
                      />
                    </label>
                  </div>

                  <Button
                    onClick={handleUnifiedIngest}
                    variant="primary"
                    disabled={(isCrawling || isUploading) || !selectedSchoolId || (!crawlUrl.trim() && !selectedFile)}
                    className="h-10 px-5 text-xs font-bold shadow-md shadow-indigo-600/30 whitespace-nowrap"
                  >
                    {isCrawling || isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isCrawling ? "Crawling & Extracting..." : "Parsing PDF..."}
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Ingest into Knowledge Base
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDED KNOWLEDGE BASES */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" />
                Added Knowledge Bases (KBs) ({addedKnowledgeBases.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Indexed documents, brochures, and crawled web pages
              </span>
            </div>

            {addedKnowledgeBases.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No knowledge base sources found. Upload a PDF or crawl an admissions website above.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800 custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">School</th>
                      <th className="py-2.5 px-4">Source Name / Document / URL</th>
                      <th className="py-2.5 px-4 text-center">Type</th>
                      <th className="py-2.5 px-4 text-center">Data Points Extracted</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {addedKnowledgeBases.map((kb, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-200 truncate max-w-[200px]" title={kb.schoolName}>
                          {kb.schoolName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 truncate max-w-[320px]" title={kb.sourceName}>
                          {kb.sourceUrl ? (
                            <a
                              href={kb.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline flex items-center gap-1.5"
                            >
                              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{kb.sourceName}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{kb.sourceName}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold uppercase border",
                            kb.sourceType === "WEBSITE_CRAWL"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          )}>
                            {kb.sourceType === "WEBSITE_CRAWL" ? "Web Crawl" : "PDF Document"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-indigo-300 font-bold">
                          {kb.pointsExtracted} criteria
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            INDEXED
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={() => handleDeleteKbSource(kb.schoolId, kb.sourceName, kb.sourceUrl)}
                            title="Delete Knowledge Base Source"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: REVIEW QUEUE */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Criteria Verification & Review Queue ({filteredReviewItems.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Review extracted 14-point criteria. Approve, override values inline, or reject conflicts.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 text-xs">
                {[
                  { id: "all", label: `All (${reviewQueue.length})` },
                  { id: "PENDING", label: `Pending (${reviewQueue.filter(r => r.issue_type === "PENDING_REVIEW").length})` },
                  { id: "CONFLICTING", label: `Conflicts (${reviewQueue.filter(r => r.issue_type === "CONFLICTING").length})` },
                  { id: "VERIFIED", label: `Verified (${reviewQueue.filter(r => r.issue_type === "VERIFIED").length})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setKbReviewFilterStatus(st.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                      kbReviewFilterStatus === st.id
                        ? "bg-slate-800 text-white font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredReviewItems.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                title="Review Queue is Clean"
                description="No pending criteria or discrepancies require review for the selected filter."
              />
            ) : (
              <div className="space-y-3">
                {filteredReviewItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-lg border p-4 space-y-3 transition-all",
                      item.issue_type === "CONFLICTING"
                        ? "border-amber-500/30 bg-amber-950/10"
                        : item.issue_type === "VERIFIED"
                        ? "border-emerald-500/20 bg-emerald-950/5"
                        : "border-slate-800 bg-slate-950"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-100 text-xs">
                          {item.field_label || item.field_key}
                        </span>
                        <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                          {item.school_name}
                        </span>
                        {item.category && (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.issue_type === "CONFLICTING" && (
                          <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                            Conflict Detected
                          </span>
                        )}
                        {item.issue_type === "PENDING_REVIEW" && (
                          <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                            Pending Review
                          </span>
                        )}
                        {item.issue_type === "VERIFIED" && (
                          <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extracted Value / Conflict Comparison */}
                    <div className="rounded-md border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Extracted Value:</span>
                        <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                          {String(item.extracted_value ?? "Not Specified")}
                        </span>
                      </div>

                      {item.raw_snippet && (
                        <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded border border-slate-800/40">
                          "{item.raw_snippet}"
                        </div>
                      )}

                      {item.source_name && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>Source: {item.source_name}</span>
                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                              Open Source <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions / Inline Override */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-1 border-t border-slate-800/50">
                      {overrideItemId === item.id ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="Enter overridden value..."
                            value={overrideValue}
                            onChange={(e) => setOverrideValue(e.target.value)}
                            className="flex-1 sm:w-64 h-7 rounded border border-indigo-500 bg-slate-950 px-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                            autoFocus
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolveReview(item.id, "VERIFIED", overrideValue)}
                            className="text-xs h-7 gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save & Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setOverrideItemId(null);
                              setOverrideValue("");
                            }}
                            className="text-xs h-7 text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setOverrideItemId(item.id);
                              setOverrideValue(item.extracted_value !== undefined ? String(item.extracted_value) : "");
                            }}
                            className="text-xs h-7 text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                          >
                            <Edit2 className="h-3 w-3 text-indigo-400" />
                            Override Value
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveReview(item.id, "REJECTED")}
                            className="text-xs h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolveReview(item.id, "VERIFIED")}
                            className="text-xs h-7 gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
