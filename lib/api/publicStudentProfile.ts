import { API_BASE_URL } from "./config";

export type PublicStudentSnapshot = {
  sharedAt?: string;
  readOnly: boolean;
  student: {
    id: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
    state?: string | null;
    zip_code?: string | null;
    country?: string | null;
    ethnicity?: string | null;
    gender?: string | null;
    age?: number | null;
    gpa?: number | null;
    dat_score?: number | null;
    dat_aa?: number | null;
    dat_ts?: number | null;
    gpa_verified?: boolean;
    dat_verified?: boolean;
    undergrad_institution?: string | null;
    undergrad_degree?: string | null;
    undergrad_grad_year?: string | null;
    strength_score?: number | null;
    status?: string | null;
    is_reapplicant?: boolean;
    application_cycle?: string | null;
    timezone?: string | null;
    post_bac?: string | null;
    masters?: string | null;
  };
  experiences: Array<{
    id: string;
    title?: string | null;
    category?: string | null;
    organization?: string | null;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
  documents: Array<{
    id: string;
    title?: string | null;
    type?: string | null;
    status?: string | null;
    uploaded_at?: string | null;
  }>;
  dexterity: Array<{
    id: string;
    activity?: string | null;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_ongoing?: boolean;
  }>;
};

/** Unauthenticated fetch of a shared student profile snapshot. */
export async function fetchPublicStudentProfile(
  token: string,
): Promise<PublicStudentSnapshot> {
  const res = await fetch(
    `${API_BASE_URL}/api/public/student-profile/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error || "Share link not found or revoked",
    );
  }
  return data as PublicStudentSnapshot;
}
