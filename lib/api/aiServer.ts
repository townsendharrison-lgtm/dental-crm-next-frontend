/**
 * Client for the Python LangGraph AI Server (ai-server/ on port 8000)
 */

export const AI_SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_AI_SERVER_URL || "http://localhost:8000";

export interface PrerequisiteCourseItem {
  course_name: string;
  group: string;
  required: boolean;
  recommended: boolean;
  lab_required: boolean;
  semester_credits: number;
  quarter_credits: number;
  min_grade?: string;
  notes?: string;
  status: "VERIFIED" | "FOUND_UNVERIFIED" | "INFERRED" | "CONFLICTING" | "NOT_FOUND";
}

export interface SectionCompleteness {
  section_name: string;
  total_fields: number;
  verified_count: number;
  found_unverified_count: number;
  inferred_count: number;
  conflicting_count: number;
  not_found_count: number;
  completion_percentage: number;
}

export interface FieldCompletenessSummary {
  total_fields_extracted?: number;
  total_required_fields?: number;
  reviewed_percentage: number;
  verified_percentage: number;
  verified_count: number;
  found_unverified_count: number;
  inferred_count: number;
  conflicting_count: number;
  not_found_count?: number;
  section_breakdown?: SectionCompleteness[];
}

export interface DentalSchoolProfile {
  id: string;
  name: string;
  cycle: string;
  location: string;
  completeness: FieldCompletenessSummary;
  general_information: {
    university_affiliation: string;
    state: string;
    country: string;
    dean: string;
    dental_school_description: string;
    mission: string;
    vision: string;
    community_service_mission: string;
    research_mission: string;
    core_values: string[];
    admissions_philosophy: string;
    website_url?: string;
    admissions_email?: string;
    phone?: string;
  };
  enrollee_statistics: {
    baccalaureate_count: number;
    masters_or_beyond_count: number;
    four_years_predental_count?: number;
    three_years_predental_count?: number;
    two_years_predental_count?: number;
    total_class_size: number;
    male_percentage?: number;
    female_percentage?: number;
    in_state_percentage?: number;
    out_of_state_percentage?: number;
    average_age?: number;
    additional_preparation_notes?: string[];
  };
  prerequisites: PrerequisiteCourseItem[];
  academic_standards: {
    avg_cgpa: number;
    avg_sgpa: number;
    avg_bcp_gpa?: number;
    min_cgpa_cutoff: number;
    min_sgpa_cutoff: number;
    avg_dat_aa: number;
    avg_dat_ts: number;
    avg_dat_pat: number;
    min_dat_aa_cutoff: number;
    canadian_dat_accepted?: boolean;
  };
  extracurriculars: {
    min_shadowing_hours: number;
    recommended_shadowing_hours: number;
    general_dentist_hours_required: number;
    min_volunteering_hours: number;
    recommended_volunteering_hours: number;
    research_experience_preference: string;
  };
  financials: {
    in_state_tuition_annual: number;
    out_of_state_tuition_annual: number;
    four_year_total_estimated_cost?: number;
    in_state_acceptance_rate?: number;
    out_of_state_acceptance_rate?: number;
    overall_acceptance_rate?: number;
    in_state_preference_multiplier?: number;
  };
  evidence_citations?: any[];
}

export interface StudentComparisonProfile {
  id?: string;
  name: string;
  email?: string;
  cgpa: number;
  sgpa: number;
  bcp_gpa?: number;
  dat_aa: number;
  dat_ts: number;
  dat_pat: number;
  shadowing_hours: number;
  volunteering_hours: number;
  dental_experience_hours: number;
  research_hours: number;
  state: string;
  undergrad_institution?: string;
  major?: string;
  applicant_type?: string;
  completed_courses?: Array<{
    course_name: string;
    category: string;
    grade: string;
    credit_hours: number;
    has_lab: boolean;
  }>;
}

export interface RequirementCheckItem {
  id: string;
  name: string;
  category: string;
  status: "MET" | "WARNING" | "UNMET" | "RECOMMENDED_MISSING" | "UNKNOWN";
  studentValue: any;
  schoolRequirement: any;
  details: string;
  isHardRequirement: boolean;
}

export interface RoiImprovement {
  id: string;
  actionTitle: string;
  description: string;
  category: string;
  currentMetric: any;
  targetMetric: any;
  probabilityLift: {
    interviewLift: number;
    acceptanceLift: number;
  };
  impactLevel: "HIGH" | "MEDIUM" | "MODERATE";
}

export interface PredictionResult {
  schoolId: string;
  schoolName: string;
  location: string;
  fitCategory: "Strong Fit" | "Target" | "Reach" | "Safety" | "High Risk / Unqualified";
  matchScore: number;
  requirementsStatus: "MEETS_ALL" | "WARNINGS" | "FAILS_REQUIREMENTS";
  requirementsPassedCount: number;
  requirementsTotalCount: number;
  requirements: RequirementCheckItem[];
  probabilities: {
    interviewProbability: number;
    acceptedProbability: number;
    waitlistProbability: number;
    rejectionProbability: number;
  };
  diagnostics: {
    mostLikelyReason: string;
    mostLimitingFactor: string;
    highestRoiImprovements: RoiImprovement[];
    actionSteps?: string[];
  };
  attached_documents_analyzed?: string[];
  document_insights?: Record<string, any>;
}

export const aiServerApi = {
  /** Fetch all dental school profiles with extracted completeness stats */
  listSchools: async (search?: string): Promise<DentalSchoolProfile[]> => {
    const url = `${AI_SERVER_BASE_URL}/api/research/schools${search ? `?search=${encodeURIComponent(search)}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch schools from AI server");
    return res.json();
  },

  /** Fetch full school profile */
  getSchool: async (schoolId: string): Promise<DentalSchoolProfile> => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/research/schools/${schoolId}`);
    if (!res.ok) throw new Error(`Failed to fetch school ${schoolId}`);
    return res.json();
  },

  /** Crawl dental school website using Python LangGraph agent */
  crawlWebsite: async (payload: { url: string; school_id?: string; school_name?: string; cycle?: string }) => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/research/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Crawl request failed on AI server");
    return res.json();
  },

  /** Create a new school profile on AI server */
  createSchoolProfile: async (payload: {
    name: string;
    location: string;
    website_url?: string;
    avg_cgpa?: number;
    avg_dat_aa?: number;
    overall_acceptance_rate?: number;
    cycle?: string;
    crawl_now?: boolean;
  }): Promise<DentalSchoolProfile> => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/research/schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create school profile on AI server");
    return res.json();
  },

  /** Ingest PDF, TXT, or Image OCR using LangGraph */
  ingestFile: async (formData: FormData) => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/research/ingest-file`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("File ingestion failed on AI server");
    return res.json();
  },

  /** Fetch spreadsheet matrix */
  getSpreadsheet: async (category?: string) => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/research/spreadsheet`);
    if (!res.ok) throw new Error("Failed to fetch spreadsheet matrix");
    return res.json();
  },

  /** Fetch review queue items */
  getReviewQueue: async (schoolId?: string) => {
    const url = `${AI_SERVER_BASE_URL}/api/research/review-queue${schoolId ? `?school_id=${schoolId}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch review queue");
    return res.json();
  },

  /** Resolve review queue item */
  resolveReviewItem: async (itemId: string, status: string = "VERIFIED") => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/research/review-queue/${itemId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: true, status }),
    });
    if (!res.ok) throw new Error("Failed to resolve review item");
    return res.json();
  },

  /** List mock/CRM students for comparison */
  listStudents: async (): Promise<StudentComparisonProfile[]> => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/compare/students`);
    if (!res.ok) throw new Error("Failed to fetch student profiles for comparison");
    return res.json();
  },

  /** Run LangGraph Student vs School Predictive Admission Model */
  compareStudentWithSchool: async (payload: {
    student_id?: string;
    school_id: string;
    custom_student_profile?: StudentComparisonProfile;
    cycle?: string;
    include_ai_reasoning?: boolean;
  }): Promise<PredictionResult> => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/compare/student-school`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to execute student vs school comparison");
    return res.json();
  },

  /** Compare 1 student against all 70+ dental schools */
  compareStudentAllSchools: async (payload: {
    student_id?: string;
    custom_student_profile?: StudentComparisonProfile;
    cycle?: string;
  }) => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/compare/student-all-schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to execute batch school comparison");
    return res.json();
  },

  /** Rank all students for a specific school */
  compareAllStudentsSchool: async (schoolId: string, cycle: string = "2025-2026") => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/compare/all-students-school?school_id=${schoolId}&cycle=${cycle}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to compare all students against school");
    return res.json();
  },

  /** What-If Simulator Real-time calculation */
  whatIfSimulate: async (payload: {
    school_id: string;
    cgpa: number;
    dat_aa: number;
    shadowing_hours: number;
    volunteering_hours?: number;
    research_hours?: number;
    state?: string;
  }): Promise<PredictionResult> => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/predict/what-if`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("What-if simulation failed");
    return res.json();
  },

  /** Recalibrate historical rubrics */
  recalibrateRubrics: async (schoolId: string = "sch6") => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/calibration/recalibrate?school_id=${schoolId}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Recalibration failed");
    return res.json();
  },

  /** Upload historical outcome CSV */
  uploadHistoricalCsv: async (formData: FormData, schoolId: string = "sch6") => {
    const res = await fetch(`${AI_SERVER_BASE_URL}/api/calibration/upload-csv?school_id=${schoolId}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload historical CSV");
    return res.json();
  },
};
