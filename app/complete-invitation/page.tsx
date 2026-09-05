"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";
import { USER_KEY, persistTokens } from "@/lib/auth/cookies";
import { syncUserTimezone } from "@/lib/auth/syncTimezone";
import { getInitialRouteForRole } from "@/lib/navigation";
import { supabaseClient } from "@/lib/utils/supabase";
import type { UserRole } from "@/lib/types";

const LOGO_URL =
  "https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  MENTOR_MANAGER: "Mentor Manager",
  MENTOR: "Mentor",
  STUDENT: "Student",
  LETTER_WRITER: "Letter Writer",
  SETTER: "Setter",
};

interface ParsedJwt {
  email?: string;
  user_metadata?: {
    name?: string;
    role?: UserRole;
    invited_by_name?: string;
  };
}

function parseJwtPayload(token: string): ParsedJwt | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractHashParam(href: string, key: string): string | null {
  const match = href.match(new RegExp(`[#&?]${key}=([^&#]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function CompleteInvitationPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [inviterName, setInviterName] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function initToken() {
      const href = window.location.href;

      // 1. Check if Supabase passed an error in the hash/query
      const errorDesc =
        extractHashParam(href, "error_description") || extractHashParam(href, "error");
      if (errorDesc) {
        setError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
        setIsInitializing(false);
        return;
      }

      // 2. Extract access_token from hash (Supabase default invite redirect)
      let token = extractHashParam(href, "access_token");

      // 3. Fallback: check if PKCE auth code is present in query parameters
      if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          try {
            const { data, error: exchangeError } =
              await supabaseClient.auth.exchangeCodeForSession(code);
            if (!exchangeError && data.session?.access_token) {
              token = data.session.access_token;
            }
          } catch (e) {
            console.error("Failed to exchange auth code:", e);
          }
        }
      }

      // 4. Fallback: check active session in Supabase client
      if (!token) {
        try {
          const {
            data: { session },
          } = await supabaseClient.auth.getSession();
          if (session?.access_token) {
            token = session.access_token;
          }
        } catch {
          // ignore
        }
      }

      if (token) {
        setAccessToken(token);
        const payload = parseJwtPayload(token);
        if (payload?.email) {
          setEmail(payload.email);
        }
        if (payload?.user_metadata?.role) {
          setRole(payload.user_metadata.role);
        }
        if (payload?.user_metadata?.name) {
          setName(payload.user_metadata.name);
        }
        if (payload?.user_metadata?.invited_by_name) {
          setInviterName(payload.user_metadata.invited_by_name);
        }
      } else {
        setError(
          "Invalid or missing invitation token. The link may have expired or already been used. Please ask your administrator to resend your invitation.",
        );
      }

      setIsInitializing(false);
    }

    initToken();
  }, []);

  const roleLabel = useMemo(() => ROLE_LABELS[role] || role, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!accessToken) {
      setError("Missing invitation token. Please request a new invitation link.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.completeInvitation(accessToken, name.trim(), password);

      // Clean up token from URL hash so it's not exposed
      window.history.replaceState(null, "", "/complete-invitation");

      if (result.autoSignIn && result.token && result.user) {
        persistTokens(result.token, result.refreshToken);
        const synced = await syncUserTimezone(result.user);
        localStorage.setItem(USER_KEY, JSON.stringify(synced));
        setUser(synced);
        setSuccess(true);

        setTimeout(() => {
          router.replace(getInitialRouteForRole(synced.role));
        }, 1200);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.replace("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to complete invitation setup. The link may have expired. Please contact your admin.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    window.location.assign("/login");
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
          <div className="login-bg-grid" />
        </div>
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="login-glass-card w-full max-w-md space-y-8 p-12 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-600/20 text-emerald-400 shadow-2xl shadow-emerald-500/10 animate-in zoom-in-50 duration-500">
              <CheckCircle className="h-12 w-12" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-white">Account Activated!</h2>
              <p className="text-slate-300">
                Welcome to Dental School Guide, <strong className="text-white">{name}</strong>! Your
                password has been set and your account is ready.
              </p>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 pt-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" /> Redirecting you to
                your dashboard…
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />
      </div>

      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="login-glass-card w-full max-w-lg space-y-8 p-8 sm:p-10">
          {/* Header */}
          <div className="space-y-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="Dental School Guide"
              className="mx-auto h-16 w-16 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Complete Your Account
            </h2>
            <p className="text-slate-400 text-sm">
              {inviterName && !/^(admin|admin user|administrator)$/i.test(inviterName.trim())
                ? `You've been invited by ${inviterName} to join Dental School Guide`
                : "You've been invited to join Dental School Guide"}
            </p>

            {email && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
                <Mail className="h-3.5 w-3.5 text-indigo-400" />
                <span>{email}</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-indigo-400 font-semibold">{roleLabel}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="login-alert login-alert-error">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed">{error}</div>
            </div>
          )}

          {isInitializing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-400">Verifying your invitation…</p>
            </div>
          ) : !accessToken ? (
            <div className="space-y-6 pt-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center text-sm text-slate-400 space-y-2">
                <p>
                  We were unable to verify this invitation link. It may have expired or already been
                  used to set up an account.
                </p>
                <p className="text-xs text-slate-500">
                  Please check with your administrator to send a fresh invitation link.
                </p>
              </div>
              <button
                type="button"
                onClick={goToLogin}
                className="login-submit w-full justify-center"
              >
                Go to Sign In <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="login-field">
                <label className="login-label">Full Name</label>
                <div className="login-input-wrapper">
                  <UserIcon className="login-input-icon" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="login-input"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="login-field">
                <label className="login-label">Choose a Password</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="login-input"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-input-toggle"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Must be at least 8 characters long.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="login-field">
                <label className="login-label">Confirm Password</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="login-input"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-rose-400">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !password || password !== confirmPassword}
                className="login-submit w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Complete Setup & Sign In <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <button type="button" onClick={goToLogin} className="login-link text-sm">
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
