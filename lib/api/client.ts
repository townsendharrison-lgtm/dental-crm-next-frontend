import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  persistTokens,
} from "@/lib/auth/cookies";

/** Normalised application error surfaced to callers. */
export class ApiRequestError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Request interceptor: attach bearer token -------------------------------
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? new AxiosHeaders();
    (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  }
  // Let the browser set multipart boundary — never force application/json on FormData.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers = config.headers ?? new AxiosHeaders();
    (config.headers as AxiosHeaders).delete("Content-Type");
  }
  return config;
});

// --- Token refresh (single-flight) ------------------------------------------
let refreshPromise: Promise<string | null> | null = null;

/** Exchange the refresh token for a new access token via Supabase. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const res = await axios.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      { refresh_token: refreshToken },
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
      },
    );
    const accessToken: string | undefined = res.data?.access_token;
    const newRefresh: string | undefined = res.data?.refresh_token;
    if (!accessToken) return null;
    persistTokens(accessToken, newRefresh ?? refreshToken);
    return accessToken;
  } catch {
    return null;
  }
}

function onAuthFailure() {
  clearAuthStorage();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
}

// --- Response interceptor: refresh on 401, normalise errors -----------------
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    // Attempt one transparent refresh on 401.
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        original.headers = original.headers ?? new AxiosHeaders();
        (original.headers as AxiosHeaders).set("Authorization", `Bearer ${newToken}`);
        return apiClient(original);
      }
      onAuthFailure();
    }

    const data = error.response?.data as { error?: string } | undefined;
    const message =
      data?.error || error.message || "An unexpected error occurred.";
    return Promise.reject(new ApiRequestError(message, status ?? 0, error.response?.data));
  },
);

// --- Typed convenience wrappers ---------------------------------------------
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.get<T>(url, config);
  return data;
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.post<T>(url, body, config);
  return data;
}
export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.put<T>(url, body, config);
  return data;
}
export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.patch<T>(url, body, config);
  return data;
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.delete<T>(url, config);
  return data;
}
