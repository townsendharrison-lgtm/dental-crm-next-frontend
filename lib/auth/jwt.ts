import type { UserRole } from "@/lib/types";

export interface DecodedToken {
  sub?: string;
  email?: string;
  exp?: number; // seconds since epoch
  user_metadata?: { role?: UserRole; name?: string; avatar?: string };
  app_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Base64url decode that works in both Edge runtime and the browser. */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    // Edge runtime + browser
    const binary = atob(padded);
    try {
      return decodeURIComponent(
        binary
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""),
      );
    } catch {
      return binary;
    }
  }
  // Node fallback
  return Buffer.from(padded, "base64").toString("utf-8");
}

/** Decode a JWT payload WITHOUT verifying the signature. */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as DecodedToken;
  } catch {
    return null;
  }
}

export function getRoleFromToken(token: string): UserRole | undefined {
  return decodeToken(token)?.user_metadata?.role;
}

/** True if the token is expired (or unparseable). Optional skew in seconds. */
export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return Date.now() >= (decoded.exp - skewSeconds) * 1000;
}
