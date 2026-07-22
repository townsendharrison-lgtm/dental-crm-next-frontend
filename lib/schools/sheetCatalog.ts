import type { School } from "@/lib/types";

export const DENTAL_SCHOOLS_SHEET_ID = "1cF_DmnlVqVrvWWfqSG8XtJl3ITUUSyVmATEHpsTSdOQ";
/** gid=0 is the School Selection Core Stats tab (full catalog). Default gviz without gid can return a truncated sheet. */
export const DENTAL_SCHOOLS_SHEET_GID = "0";
export const DENTAL_SCHOOLS_CSV_URL = `https://docs.google.com/spreadsheets/d/${DENTAL_SCHOOLS_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${DENTAL_SCHOOLS_SHEET_GID}`;

/** Flexible header aliases for the MASTER SHEET + older column names */
export const COL_MAP = {
  name: ["School", "School name", "Institution", "Name", "School Selection Core Stats School"],
  location: ["Location", "School location / state", "State", "City, State"],
  applicants: ["# of Applicants", "Number of applicants", "Applicants"],
  acceptanceRate: ["Acceptance Rate", "Acceptance %", "Overall Acceptance", "Total Acceptance", "Admission Rate"],
  isAcceptanceRate: ["IS Acc. Rate", "In-state acceptance rate", "IS Acceptance", "Resident Acceptance"],
  oosAcceptanceRate: ["OS Acc. Rate", "Out-of-state acceptance rate", "OS Acceptance", "Non-resident Acceptance"],
  classSize: ["Class Size", "Class size", "Size"],
  type: ["Public/Private", "Public or private", "Type"],
  lengthOfSchool: ["Length of School (Yrs)", "Length of School", "Length of school", "Program Length", "Years"],
  acceptsCanadianDat: ["Acc. Canadian DAT", "Accepts Canadian DAT", "Canadian DAT", "Acc Canadian DAT"],
  cgpa: ["Mean cGPA", "Average cGPA", "cGPA"],
  sgpa: ["Mean sGPA", "Average sGPA", "sGPA"],
  datAA: ["Avg. DAT AA", "Average DAT AA", "DAT AA", "Mean DAT AA"],
  datPAT: ["Mean PAT", "PAT"],
  datTS: ["Mean TS", "TS"],
  shadowing: ["Shadow Hrs", "Shadowing hours", "Shadowing"],
  tuitionRes: ["$ Resident Tuition", "Tuition for resident", "Resident Tuition"],
  tuitionNonRes: ["$ Nonresident Tuition", "Tuition for nonresident", "Nonresident Tuition"],
  deadline: ["Application Deadline", "Application deadline", "Deadline"],
  canadians: ["Accepts Canadians", "Canadians"],
  housing: ["Campus Housing", "Campus housing", "Housing"],
  additionalInfo: ["Additional Info.", "Additional info", "Notes"],
  interview: ["Interview Format", "Interview format", "Interview"],
  prereqs: ["Required classes / prerequisites", "Prerequisites"],
  links: ["link to youtube tour of school", "Links like school tour or related resources", "Links"],
  website: ["Website", "School Website", "URL", "Link"],
  email: ["Email", "Contact Email", "Admissions Email"],
  phone: ["Phone", "Contact Phone", "Admissions Phone"],
  secondaryFee: ["Secondary Fee", "Supplemental Fee", "Secondary Application Fee"],
  deposit: ["Deposit", "Enrollment Deposit", "Seat Deposit"],
  casper: ["Casper", "Altus", "Acuity Insights", "Casper Required"],
  letters: ["Letters of Recommendation", "LOR", "Letters", "Recommendation Letters"],
  mission: ["Mission", "Mission Statement", "School Mission"],
  podcast: ["DSG Podcast with Dean of Admissions", "Podcast with Dean of Admissions", "Podcast", "Dean Podcast"],
  minCgpa5th: ["Min Acc. cGPA (5th %)", "Minimum accepted GPA stats", "Min Acc. cGPA", "5th % cGPA", "Min Acc.cGPA"],
  minDat5th: ["Min Acc.DAT (5th %)", "Minimum accepted DAT", "Min Acc. DAT", "5th % DAT", "Min Acc.DAT"],
  inStateEnrollment: ["In-state enrollment", "In-state students", "Resident enrollment", "IS Enrollment", "IS Enrolled"],
  outOfStateEnrollment: ["Out-of-state enrollment", "Out-of-state students", "Non-resident enrollment", "OS Enrollment", "OS Enrolled"],
  maleEnrollment: ["# of Men", "Male enrollment", "Male students", "Number of males", "Male", "# of men", "Men"],
  femaleEnrollment: ["# of Women", "Female enrollment", "Female students", "Number of females", "Female", "# of women", "Women"],
  whiteEnrollment: ["White", "Caucasian", "White students"],
  blackEnrollment: ["Black or African-American", "Black", "African American", "Black students"],
  hispanicEnrollment: ["Hispanic or Latino", "Hispanic", "Latino", "Hispanic students"],
  asianEnrollment: ["Asian", "Asian students"],
  internationalEnrollment: ["# of International", "International", "International students", "Intl students", "Intl enrollment"],
  ccCredits: ["CC credits accepted", "Accepts CC credits", "CC credits", "Community College Credits", "CC Credits Accepted"],
} as const;

export interface DentalSchool {
  id: string;
  name: string;
  location: string;
  applicants: number;
  acceptanceRate: number;
  isAcceptanceRate: number;
  oosAcceptanceRate: number;
  classSize: number;
  type: string;
  lengthOfSchool: string;
  acceptsCanadianDat: boolean;
  cgpa: number;
  sgpa: number;
  datAA: number;
  datPAT: number;
  datTS: number;
  shadowing: number;
  tuitionRes: number;
  tuitionNonRes: number;
  deadline: string;
  canadians: boolean;
  housing: boolean;
  additionalInfo: string;
  interview: string;
  prereqs: string;
  links: string;
  website: string;
  email: string;
  phone: string;
  secondaryFee: string;
  deposit: string;
  casper: string;
  letters: string;
  mission: string;
  podcast: string;
  minCgpa5th: number;
  minDat5th: number;
  inStateEnrollment: number;
  outOfStateEnrollment: number;
  maleEnrollment: number;
  femaleEnrollment: number;
  ccCredits: boolean;
  ethnicity: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    international: number;
  };
  raw: Record<string, string>;
}

function parseCsvRows(text: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentField += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentLine.push(currentField.trim());
      if (currentLine.length > 1 || currentLine[0] !== "") {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }
  return lines;
}

function normalizeHeader(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Skip title rows (e.g. "School Selection Core Stats") and find the real header row. */
export function findHeaderRowIndex(lines: string[][]): number {
  const lookAhead = Math.min(lines.length, 8);
  for (let i = 0; i < lookAhead; i++) {
    const row = lines[i] || [];
    const normalized = row.map(normalizeHeader);
    const hasSchool = normalized.some(
      (h) => h === "school" || h === "schoolname" || h.endsWith("school"),
    );
    const hasLocation = normalized.some(
      (h) => h === "location" || h.includes("location") || h === "state",
    );
    const hasApplicants = normalized.some((h) => h.includes("applicant"));
    if (hasSchool && (hasLocation || hasApplicants)) {
      return i;
    }
  }
  return 0;
}

export function parseDentalSchoolsCsv(text: string): DentalSchool[] {
  const lines = parseCsvRows(text);
  if (lines.length < 2) return [];

  const headerIdx = findHeaderRowIndex(lines);
  const headers = lines[headerIdx];
  const dataRows = lines.slice(headerIdx + 1);

  const findIdx = (keys: readonly string[]) => {
    for (const key of keys) {
      const normalizedKey = normalizeHeader(key);
      // Prefer exact header matches first
      let idx = headers.findIndex((h) => normalizeHeader(h) === normalizedKey);
      if (idx !== -1) return idx;
      idx = headers.findIndex((h) => {
        const nh = normalizeHeader(h);
        return nh.includes(normalizedKey) || normalizedKey.includes(nh);
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // School name column: prefer exact "School", then headers ending in "school"
  const nameIdxExact = headers.findIndex((h) => normalizeHeader(h) === "school");
  const nameIdxEnds = headers.findIndex((h) => {
    const nh = normalizeHeader(h);
    return nh.endsWith("school") && nh !== "school";
  });
  const indices = {
    name: nameIdxExact !== -1 ? nameIdxExact : nameIdxEnds !== -1 ? nameIdxEnds : findIdx(COL_MAP.name),
    location: findIdx(COL_MAP.location),
    applicants: findIdx(COL_MAP.applicants),
    acceptanceRate: findIdx(COL_MAP.acceptanceRate),
    isAcceptanceRate: findIdx(COL_MAP.isAcceptanceRate),
    oosAcceptanceRate: findIdx(COL_MAP.oosAcceptanceRate),
    classSize: findIdx(COL_MAP.classSize),
    type: findIdx(COL_MAP.type),
    lengthOfSchool: findIdx(COL_MAP.lengthOfSchool),
    acceptsCanadianDat: findIdx(COL_MAP.acceptsCanadianDat),
    cgpa: findIdx(COL_MAP.cgpa),
    sgpa: findIdx(COL_MAP.sgpa),
    datAA: findIdx(COL_MAP.datAA),
    datPAT: findIdx(COL_MAP.datPAT),
    datTS: findIdx(COL_MAP.datTS),
    shadowing: findIdx(COL_MAP.shadowing),
    tuitionRes: findIdx(COL_MAP.tuitionRes),
    tuitionNonRes: findIdx(COL_MAP.tuitionNonRes),
    deadline: findIdx(COL_MAP.deadline),
    canadians: findIdx(COL_MAP.canadians),
    housing: findIdx(COL_MAP.housing),
    additionalInfo: findIdx(COL_MAP.additionalInfo),
    interview: findIdx(COL_MAP.interview),
    prereqs: findIdx(COL_MAP.prereqs),
    links: findIdx(COL_MAP.links),
    website: findIdx(COL_MAP.website),
    email: findIdx(COL_MAP.email),
    phone: findIdx(COL_MAP.phone),
    secondaryFee: findIdx(COL_MAP.secondaryFee),
    deposit: findIdx(COL_MAP.deposit),
    casper: findIdx(COL_MAP.casper),
    letters: findIdx(COL_MAP.letters),
    mission: findIdx(COL_MAP.mission),
    podcast: findIdx(COL_MAP.podcast),
    minCgpa5th: findIdx(COL_MAP.minCgpa5th),
    minDat5th: findIdx(COL_MAP.minDat5th),
    inStateEnrollment: findIdx(COL_MAP.inStateEnrollment),
    outOfStateEnrollment: findIdx(COL_MAP.outOfStateEnrollment),
    maleEnrollment: findIdx(COL_MAP.maleEnrollment),
    femaleEnrollment: findIdx(COL_MAP.femaleEnrollment),
    whiteEnrollment: findIdx(COL_MAP.whiteEnrollment),
    blackEnrollment: findIdx(COL_MAP.blackEnrollment),
    hispanicEnrollment: findIdx(COL_MAP.hispanicEnrollment),
    asianEnrollment: findIdx(COL_MAP.asianEnrollment),
    internationalEnrollment: findIdx(COL_MAP.internationalEnrollment),
    ccCredits: findIdx(COL_MAP.ccCredits),
  };

  return dataRows
    .map((row, i) => {
      const getVal = (idx: number) => (idx !== -1 ? row[idx] || "" : "");
      const parseNum = (val: string) => {
        if (!val) return 0;
        const cleanVal = val.replace(/,/g, "");
        const match = cleanVal.match(/[0-9.]+/);
        if (!match) return 0;
        return parseFloat(match[0]) || 0;
      };
      const parseBool = (val: string) => {
        if (!val) return false;
        const v = val.toLowerCase();
        return v === "yes" || v === "true" || v === "y" || v.includes("accept");
      };

      const raw: Record<string, string> = {};
      headers.forEach((h, idx) => {
        raw[h] = row[idx] || "";
      });

      const name = getVal(indices.name);
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      return {
        id: slug ? `sheet-${slug}` : `school-${i}`,
        name: name || "Unknown School",
        location: getVal(indices.location) || "Unknown Location",
        applicants: parseNum(getVal(indices.applicants)),
        acceptanceRate: parseNum(getVal(indices.acceptanceRate)),
        isAcceptanceRate: parseNum(getVal(indices.isAcceptanceRate)),
        oosAcceptanceRate: parseNum(getVal(indices.oosAcceptanceRate)),
        classSize: parseNum(getVal(indices.classSize)),
        type: getVal(indices.type) || "Unknown",
        lengthOfSchool: (() => {
          const val = getVal(indices.lengthOfSchool);
          if (!val) return "";
          const n = parseNum(val);
          return n ? String(n) : val;
        })(),
        acceptsCanadianDat: parseBool(getVal(indices.acceptsCanadianDat)),
        cgpa: parseNum(getVal(indices.cgpa)),
        sgpa: parseNum(getVal(indices.sgpa)),
        datAA: parseNum(getVal(indices.datAA)),
        datPAT: parseNum(getVal(indices.datPAT)),
        datTS: parseNum(getVal(indices.datTS)),
        shadowing: parseNum(getVal(indices.shadowing)),
        tuitionRes: parseNum(getVal(indices.tuitionRes)),
        tuitionNonRes: parseNum(getVal(indices.tuitionNonRes)),
        deadline: getVal(indices.deadline),
        canadians: parseBool(getVal(indices.canadians)),
        housing: parseBool(getVal(indices.housing)),
        additionalInfo: getVal(indices.additionalInfo),
        interview: getVal(indices.interview),
        prereqs: getVal(indices.prereqs),
        links: getVal(indices.links),
        website: getVal(indices.website),
        email: getVal(indices.email),
        phone: getVal(indices.phone),
        secondaryFee: getVal(indices.secondaryFee),
        deposit: getVal(indices.deposit),
        casper: getVal(indices.casper),
        letters: getVal(indices.letters),
        mission: getVal(indices.mission),
        podcast: getVal(indices.podcast),
        minCgpa5th: parseNum(getVal(indices.minCgpa5th)),
        minDat5th: parseNum(getVal(indices.minDat5th)),
        inStateEnrollment: parseNum(getVal(indices.inStateEnrollment)),
        outOfStateEnrollment: parseNum(getVal(indices.outOfStateEnrollment)),
        maleEnrollment: parseNum(getVal(indices.maleEnrollment)),
        femaleEnrollment: parseNum(getVal(indices.femaleEnrollment)),
        ccCredits: parseBool(getVal(indices.ccCredits)),
        ethnicity: {
          white: parseNum(getVal(indices.whiteEnrollment)),
          black: parseNum(getVal(indices.blackEnrollment)),
          hispanic: parseNum(getVal(indices.hispanicEnrollment)),
          asian: parseNum(getVal(indices.asianEnrollment)),
          international: parseNum(getVal(indices.internationalEnrollment)),
        },
        raw,
      } satisfies DentalSchool;
    })
    .filter((s) => s.name !== "Unknown School" && !/^school selection/i.test(s.name));
}

export async function fetchDentalSchoolsCatalog(): Promise<DentalSchool[]> {
  const response = await fetch(DENTAL_SCHOOLS_CSV_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch sheet data");
  }
  const csvText = await response.text();
  if (csvText.includes("Sign in") && csvText.includes("accounts.google.com")) {
    throw new Error("Sheet is not publicly accessible");
  }
  return parseDentalSchoolsCsv(csvText);
}

export function mapDentalSchoolToHubSchool(
  dentalSchool: DentalSchool,
  category = "Target",
): School {
  const lengthRaw = dentalSchool.lengthOfSchool?.trim();
  const lengthYears = lengthRaw
    ? lengthRaw.match(/[0-9.]+/)?.[0] || lengthRaw
    : null;

  return {
    id: dentalSchool.id,
    name: dentalSchool.name,
    location: dentalSchool.location,
    type: category,
    strengthScoreAvg: 0,
    datAvg: dentalSchool.datAA,
    avgGPA: dentalSchool.cgpa,
    acceptanceRate: dentalSchool.acceptanceRate,
    isAcceptanceRate: dentalSchool.isAcceptanceRate,
    oosAcceptanceRate: dentalSchool.oosAcceptanceRate,
    ccCredits: dentalSchool.ccCredits,
    tuition: `${dentalSchool.tuitionRes}`,
    notes: "",
    inStateEnrollment: dentalSchool.inStateEnrollment,
    outOfStateEnrollment: dentalSchool.outOfStateEnrollment,
    maleEnrollment: dentalSchool.maleEnrollment,
    femaleEnrollment: dentalSchool.femaleEnrollment,
    minDat5th: dentalSchool.minDat5th,
    minCgpa5th: dentalSchool.minCgpa5th,
    lengthOfSchool: lengthYears,
    publicPrivate: dentalSchool.type || null,
    acceptsCanadianDat: dentalSchool.acceptsCanadianDat,
    acceptsCanadians: dentalSchool.canadians,
  };
}
