export const PROFILE_ETHNICITIES = [
  "White",
  "Asian",
  "Hispanic or Latino",
  "Black or African American",
] as const;

export const PROFILE_GENDERS = ["Male", "Female"] as const;

export const APPLICANT_TYPES = [
  { value: "FIRST_TIME", label: "First-time applicant" },
  { value: "REAPPLICANT", label: "Reapplicant" },
] as const;

export const REAPPLICANT_OUTCOMES = [
  "Rejected",
  "Interviewed",
  "Waitlist",
  "Accepted",
] as const;

export const ADDITIONAL_SCHOOLING_OPTIONS = [
  { value: "POST_BAC", label: "Post-Bac Program" },
  { value: "MASTERS", label: "Masters" },
  { value: "OTHER", label: "Other" },
] as const;

export const DAT_TYPES = [
  { value: "NOT_TAKEN", label: "Haven’t taken yet" },
  { value: "AMERICAN", label: "American DAT" },
  { value: "CANADIAN", label: "Canadian DAT" },
] as const;

export const AMERICAN_DAT_FIELDS = [
  { key: "dat_aa", label: "AA – Academic Average" },
  { key: "dat_pat", label: "PAT – Perceptual Ability Test" },
  { key: "dat_bio", label: "BIO – Biology" },
  { key: "dat_gc", label: "GC – General Chemistry" },
  { key: "dat_oc", label: "OC – Organic Chemistry" },
  { key: "dat_rc", label: "RC – Reading Comprehension" },
  { key: "dat_qr", label: "QR – Quantitative Reasoning" },
  { key: "dat_sns", label: "SNS – Survey of Natural Sciences" },
] as const;

export const CANADIAN_DAT_FIELDS = [
  { key: "dat_aa", label: "AA – Academic Average" },
  { key: "dat_bio", label: "BIO – Biology" },
  { key: "dat_gc", label: "GC – General Chemistry" },
  { key: "dat_pat", label: "PAT – Perceptual Ability Test" },
  { key: "dat_rc", label: "RC – Reading Comprehension" },
  { key: "dat_ts", label: "TS – Science Total" },
  { key: "dat_mdt", label: "MDT – Manual Dexterity Test (optional)" },
] as const;

export const DAT_SCORE_MAX = 600;

/** United States — used to show the state picker */
export const US_COUNTRY_VALUES = ["United States", "USA", "US", "United States of America"];

export function isUnitedStates(country: string | null | undefined) {
  if (!country) return false;
  return US_COUNTRY_VALUES.some((c) => c.toLowerCase() === country.trim().toLowerCase());
}

export const PROFILE_COUNTRIES = [
  "United States",
  "Canada",
  "Mexico",
  "United Kingdom",
  "India",
  "China",
  "South Korea",
  "Japan",
  "Philippines",
  "Nigeria",
  "Brazil",
  "Australia",
  "Germany",
  "France",
  "Ireland",
  "Saudi Arabia",
  "United Arab Emirates",
  "Egypt",
  "Pakistan",
  "Bangladesh",
  "Vietnam",
  "Taiwan",
  "Hong Kong",
  "Singapore",
  "Other",
] as const;

export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

export type ReapplicantSchoolEntry = {
  schoolId: string;
  schoolName: string;
  outcomes: string[];
};

export type ConsideringSchoolEntry = {
  id: string;
  name: string;
  location?: string;
};

export function parseDatScore(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

export function isValidDatScore(n: number | null, optional = false): boolean {
  if (n === null) return optional || true;
  if (!Number.isFinite(n)) return false;
  return n >= 0 && n <= DAT_SCORE_MAX;
}
