import { getAccessToken } from "@/lib/auth/cookies";

export interface VerifiedCriterion {
  field: string;
  category: string;
  label: string;
  value: unknown;
  status: string;
  student_value?: unknown;
  comparison_status?: string;
  explanation?: string;
  evidence: Array<{ id: string; source_name: string; source_url?: string | null; quote: string;
    value: unknown; status: string; page_number?: number | null; retrieved_at?: string; cycle: string; reason?: string }>;
}

/**
 * Client for the Python LangGraph AI Server (ai-server/ on port 8000)
 * Shared school profiles, calibration, and student comparison/prediction APIs.
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

export interface EvidenceCitation {
  id: string;
  field_path: string;
  verbatim_quote: string;
  source_url?: string;
  source_document_title?: string;
  page_number?: number;
  confidence_score: number;
  verification_status: "VERIFIED" | "FOUND_UNVERIFIED" | "INFERRED" | "CONFLICTING" | "NOT_FOUND";
  extracted_at?: string;
}

// ==========================================
// 14 Saturated Extraction Domains
// (Synced with Python ai-server/schemas/criteria_schema.py)
// ==========================================

export interface AcademicsDomain {
  min_cgpa_5th?: number;
  avg_cgpa?: number;
  max_cgpa_95th?: number;
  min_sgpa_5th?: number;
  avg_sgpa?: number;
  max_sgpa_95th?: number;
  post_bac_masters_accepted?: boolean;
  post_bac_masters_gpa_expectation?: string;
  online_classes_policy?: string;
  community_college_policy?: string;
  gpa_trend_considered?: boolean;
  gpa_trend_notes?: string;
  prerequisite_min_grade?: string;
  classes_with_w_or_fails_policy?: string;
  repeated_courses_policy?: string;
  academic_red_flags?: string[];
  heavy_course_load_handling?: string;
  post_bac_or_masters_policy?: string;
  gpa_trend_importance?: string;
  withdrawals_and_fails_policy?: string;
  credit_load_capacity_eval?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface DATSectionDetail {
  avg_score?: number;
  min_score?: number;
  weight_importance: string;
}

export interface DATDomain {
  min_dat_aa_5th?: number;
  avg_dat_aa?: number;
  max_dat_aa_95th?: number;
  avg_dat_ts?: number;
  min_dat_ts_5th?: number;
  max_dat_ts_95th?: number;
  avg_dat_pat?: number;
  min_dat_pat_5th?: number;
  max_dat_pat_95th?: number;
  avg_dat_bio?: number;
  avg_dat_gc?: number;
  avg_dat_oc?: number;
  avg_dat_rc?: number;
  avg_dat_qr?: number;
  subsections?: Record<string, DATSectionDetail>;
  max_attempts_policy?: string;
  max_attempts_allowed?: number;
  dat_validity_years?: number;
  canadian_dat_accepted?: boolean;
  canadian_dat_policy?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface ShadowingDomain {
  total_hours_required?: number;
  total_hours_recommended?: number;
  general_dentistry_hours_required?: number;
  general_dentist_hours_required?: number;
  specialty_hours_accepted?: boolean;
  specialty_hours_policy?: string;
  specialist_shadowing_policy?: string;
  dentists_shadowed_min?: number;
  practices_shadowed_min?: number;
  number_of_settings_expected?: number;
  consistency_length_weeks?: string;
  dental_assisting_counts?: boolean;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface DentalExperienceDomain {
  employment_types_accepted?: string[];
  clinical_employment_preferred?: boolean;
  clinical_experience_expected?: string;
  hands_on_dental_experience?: string;
  length_depth_experience?: string;
  hours_recommended?: number;
  manual_dexterity_demonstration?: string;
  assisting_hygiene_experience_value?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface ServiceDomain {
  total_volunteering_hours_min?: number;
  total_volunteering_hours_recommended?: number;
  hours_required?: number;
  hours_recommended?: number;
  non_dental_service_required?: boolean;
  underserved_community_service?: string;
  underserved_clinical_priority?: string;
  service_focus_and_target_populations?: string;
  consistency_longitudinal_commitment?: string;
  weeks_duration?: number;
  strength_of_opportunities?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface LeadershipDomain {
  positions_expected?: string;
  duration_expected?: string;
  level_of_responsibility?: string;
  demonstrated_impact?: string;
  importance_level?: string;
  initiative_and_impact_metrics?: string;
  preferred_leadership_types?: string[];
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface ResearchDomain {
  hours_expected?: number;
  recommended_hours?: number;
  preference?: string; // REQUIRED, RECOMMENDED, OPTIONAL
  duration_expected?: string;
  publications_posters_presentations_valued?: boolean;
  publications_posters_value?: string;
  bench_vs_clinical?: string;
  relevance_depth?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface ExtracurricularsDomain {
  clubs_organizations?: string;
  athletics?: string;
  hobbies_manual_dexterity?: string;
  unique_experiences?: string;
  sustained_involvement?: string;
  depth_vs_breadth?: string;
  work_experience_non_dental?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface ApplicationQualityDomain {
  personal_statement_strength?: string;
  personal_statement_priorities?: string;
  experience_description_quality?: string;
  letters_of_recommendation_expectations?: string;
  letters_of_evaluation_requirements?: string;
  school_specific_supplemental_essays?: string;
  casper_snapshot_required?: boolean;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface SchoolFitDomain {
  mission_alignment?: string;
  in_state_residency_preference?: string;
  geographic_connection?: string;
  geographical_preference?: string;
  underserved_rural_interest?: string;
  research_alignment?: string;
  community_service_alignment?: string;
  demonstrated_interest?: string;
  gender_distribution_notes?: string;
  ethnicity_diversity_notes?: string;
  class_size?: number;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface ApplicationStrategyDomain {
  ideal_submission_date?: string;
  hard_deadline?: string;
  supplemental_completion_timing?: string;
  prerequisites_satisfied_deadline?: string;
  application_completeness?: string;
  interview_format?: string;
  timeline_submission_impact?: string;
  update_letters_policy?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface HolisticContextDomain {
  upward_academic_trend_policy?: string;
  significant_life_experiences?: string;
  disadvantaged_background_consideration?: string;
  first_generation_status?: string;
  first_gen_socioeconomic_weight?: string;
  career_changer_nontraditional?: string;
  hours_worked_during_undergrad_consideration?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface RedFlagsDomain {
  academic_misconduct_policy?: string;
  academic_misconduct_leniency?: string;
  institutional_action_policy?: string;
  criminal_disclosures_policy?: string;
  criminal_background_policy?: string;
  unexplained_academic_decline?: string;
  extremely_low_dat_subsection_cutoff?: string;
  repeated_dat_attempts_policy?: string;
  weak_no_dental_exposure?: string;
  missing_prerequisites_policy?: string;
  poor_lors_impact?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface SkillsDomain {
  core_values?: string[];
  demonstrated_in_experiences?: string;
  manual_dexterity_examples?: string[];
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface RequirementsPreparationDomain {
  online_coursework_accepted?: string;
  online_labs_accepted?: string;
  pass_fail_grades_accepted?: string;
  expiration_of_classes?: string;
  is_shadowing_required?: boolean;
  required_shadowing_hours?: number;
  dental_assisting_counts_towards_shadowing?: boolean;
  letters_of_recommendation_summary?: string;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface AdmissionsStatisticsDomain {
  overall_acceptance_rate?: number;
  interviewed_acceptance_rate?: number;
  in_state_acceptance_rate?: number;
  out_of_state_acceptance_rate?: number;
  international_acceptance_rate?: number;
  male_acceptance_rate?: number;
  female_acceptance_rate?: number;
  ethnicity_and_gender_rates?: Record<string, number>;
  reapplicant_acceptance_rate?: number;
  first_time_applicant_acceptance_rate?: number;
  overall_interview_rate?: number;
  number_applicants_interviewed?: number;
  in_state_interviewed_percentage?: number;
  out_of_state_interviewed_percentage?: number;
  international_interviewed_percentage?: number;
  stated_in_kb: boolean;
  status: string;
  verbatim_quote?: string;
}

export interface SchoolDynamicWeights {
  academics_gpa_weight: number;
  dat_weight: number;
  shadowing_weight: number;
  dental_experience_weight: number;
  service_weight: number;
  leadership_weight: number;
  research_weight: number;
  extracurriculars_weight: number;
  application_quality_weight: number;
  school_fit_weight: number;
  relative_intensities: Record<string, number>;
  baseline_values: Record<string, number>;
  skyline_values: Record<string, number>;
}


export interface DentalSchoolProfile {
  criteria?: VerifiedCriterion[];
  research_revision?: number;
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
  evidence_citations?: EvidenceCitation[];

  // Saturated Domain Extensions
  academics_domain?: AcademicsDomain;
  dat_domain?: DATDomain;
  shadowing_domain?: ShadowingDomain;
  dental_experience_domain?: DentalExperienceDomain;
  service_domain?: ServiceDomain;
  leadership_domain?: LeadershipDomain;
  research_domain?: ResearchDomain;
  extracurriculars_domain?: ExtracurricularsDomain;
  application_quality_domain?: ApplicationQualityDomain;
  school_fit_domain?: SchoolFitDomain;
  application_strategy_domain?: ApplicationStrategyDomain;
  holistic_context_domain?: HolisticContextDomain;
  red_flags_domain?: RedFlagsDomain;
  skills_domain?: SkillsDomain;
  preparation_domain?: RequirementsPreparationDomain;
  statistics_domain?: AdmissionsStatisticsDomain;
  dynamic_weights?: SchoolDynamicWeights;
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
  lor_science_faculty_count?: number;
  lor_dentist_count?: number;
  total_lor_count?: number;
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

export interface ComparisonPointItem {
  id: string;
  category: string;
  metric_name: string;
  student_value: string;
  school_target: string;
  baseline_value: string;
  skyline_value: string;
  weight_percentage: number;
  fulfillment_percentage: number;
  status: "SURPLUS" | "FULFILLED" | "PARTIAL" | "MISSING" | "CRITICAL_DEFICIT";
  impact_description: string;
}

export interface DetailedProbabilitiesAndRates {
  overall_acceptance_rate: number | null;
  overall_interview_rate: number | null;
  interviewed_acceptance_rate: number | null;
  in_state_acceptance_rate: number | null;
  out_of_state_acceptance_rate: number | null;
  international_acceptance_rate: number | null;
  acceptance_probability: number | null;
  interview_probability: number | null;
}

export interface PreparationAuditChecklist {
  online_coursework_accepted: string;
  online_labs_accepted: string;
  pass_fail_grades_accepted: string;
  expiration_of_classes: string;
  is_shadowing_required: boolean;
  required_shadowing_hours: number;
  dental_assisting_counts_towards_shadowing: string;
  letters_of_recommendation_summary: string;
  student_audit_status: "ALL_VERIFIED" | "POTENTIAL_RISKS" | "ACTION_REQUIRED";
  student_notes: string[];
}

export interface PredictionResult {
  scoreMethod?: string;
  probabilityStatus?: string;
  probabilityExplanation?: string;
  criteria_comparison?: VerifiedCriterion[];
  evidenceCoverage?: { verifiedSchoolFields: number; totalSchoolFields: number; numericalComparisons: number; scoredCategories: number; cycle: string };
  schoolId: string;
  schoolName: string;
  location: string;
  fitCategory: string;
  matchScore: number | null;
  requirementsStatus: "MEETS_ALL" | "WARNINGS" | "FAILS_REQUIREMENTS" | "UNKNOWN";
  requirementsPassedCount: number;
  requirementsTotalCount: number;
  requirements: RequirementCheckItem[];
  probabilities: {
    interviewProbability: number | null;
    acceptedProbability: number | null;
    waitlistProbability: number | null;
    rejectionProbability: number | null;
  };
  detailed_probabilities?: DetailedProbabilitiesAndRates;
  preparation_audit?: PreparationAuditChecklist;
  comparison_points?: ComparisonPointItem[];
  school_weights?: Record<string, number>;
  student_scores?: Record<string, any>;
  diagnostics: {
    mostLikelyReason: string;
    mostLimitingFactor: string;
    highestRoiImprovements: RoiImprovement[];
    actionSteps?: string[];
  };
  attached_documents_analyzed?: string[];
  document_insights?: Record<string, any>;
}

async function aiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

export const aiServerApi = {

  /** Fetch full school profile */
  getSchool: async (schoolId: string): Promise<DentalSchoolProfile> => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/research/schools/${schoolId}`);
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : `Failed to fetch school ${schoolId}`); }
    return res.json();
  },

  /** List mock/CRM students for comparison */
  listStudents: async (): Promise<StudentComparisonProfile[]> => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/compare/students`);
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "Failed to fetch student profiles for comparison"); }
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
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/compare/student-school`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "Failed to execute student vs school comparison"); }
    return res.json();
  },

  /** Compare 1 student against all 70+ dental schools */
  compareStudentAllSchools: async (payload: {
    student_id?: string;
    custom_student_profile?: StudentComparisonProfile;
    cycle?: string;
  }) => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/compare/student-all-schools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "Failed to execute batch school comparison"); }
    return res.json();
  },

  /** Rank all students for a specific school */
  compareAllStudentsSchool: async (schoolId: string, cycle: string = "2025-2026") => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/compare/all-students-school?school_id=${schoolId}&cycle=${cycle}`, {
      method: "POST",
    });
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "Failed to compare all students against school"); }
    return res.json();
  },

  /** What-If Simulator Real-time calculation */
  whatIfSimulate: async (payload: {
    dat_type?: string;
    dat_score_scale?: string;
    school_id: string;
    cgpa: number;
    dat_aa: number;
    shadowing_hours: number;
    volunteering_hours?: number;
    research_hours?: number;
    state?: string;
  }): Promise<PredictionResult> => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/predict/what-if`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "What-if simulation failed"); }
    return res.json();
  },

  /** Recalibrate historical rubrics */
  recalibrateRubrics: async (schoolId: string = "sch6") => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/calibration/recalibrate?school_id=${schoolId}`, {
      method: "POST",
    });
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "Recalibration failed"); }
    return res.json();
  },

  /** Upload historical outcome CSV */
  uploadHistoricalCsv: async (formData: FormData, schoolId: string = "sch6") => {
    const res = await aiFetch(`${AI_SERVER_BASE_URL}/api/calibration/upload-csv?school_id=${schoolId}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(typeof error.detail === "string" ? error.detail : "Failed to upload historical CSV"); }
    return res.json();
  },
};
