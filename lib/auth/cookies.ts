/**
 * Cookie/storage keys for auth tokens.
 *
 * Tokens are mirrored in cookies (so the `proxy` middleware can read them
 * server-side for route protection) and in localStorage (for fast client
 * access). The cookie is NOT httpOnly because Supabase access tokens are
 * short-lived and the refresh flow runs on the client; real authorization is
 * always enforced by the backend on every request.
 */
export const ACCESS_TOKEN_KEY = "dc_token";
export const REFRESH_TOKEN_KEY = "dc_refresh_token";
export const USER_KEY = "dc_user";

const ACCESS_MAX_AGE = 60 * 60; // 1h
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Persist tokens to both localStorage and cookies. */
export function persistTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  writeCookie(ACCESS_TOKEN_KEY, accessToken, ACCESS_MAX_AGE);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    writeCookie(REFRESH_TOKEN_KEY, refreshToken, REFRESH_MAX_AGE);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? readCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? readCookie(REFRESH_TOKEN_KEY);
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearCookie(ACCESS_TOKEN_KEY);
  clearCookie(REFRESH_TOKEN_KEY);
}
