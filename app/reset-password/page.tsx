"use client";

import { useEffect, useState } from "react";
import {
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

function extractRecoveryToken(href: string): string | null {
  // Supabase recovery links may look like:
  // /reset-password#access_token=...&type=recovery
  // /login?next=/dashboard#/reset-password#access_token=...&type=recovery (legacy)
  const tokenMatch = href.match(/access_token=([^&#]+)/);
  return tokenMatch?.[1] ? decodeURIComponent(tokenMatch[1]) : null;
}

/** Hard navigate so the recovery hash is not carried over to /login. */
function goToLogin() {
  window.location.assign("/login");
}

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    const href = window.location.href;
    const token = extractRecoveryToken(href);
    if (token) {
      setAccessToken(token);
    } else {
      setError("Invalid or missing reset token. Please request a new reset link.");
    }
    setTokenReady(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!accessToken) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePassword(password, accessToken);
      if (result.success) {
        // Drop recovery tokens from the URL so Sign In doesn't bounce back here.
        window.history.replaceState(null, "", "/reset-password");
        setSuccess(true);
      } else {
        setError(result.error || "Failed to update password.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
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
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-600/20 text-emerald-400 shadow-2xl shadow-emerald-500/10">
              <CheckCircle className="h-12 w-12" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-white">Password Updated</h2>
              <p className="text-slate-400">
                Your password has been successfully updated. You can now sign in with your new
                password.
              </p>
            </div>
            <button type="button" onClick={goToLogin} className="login-submit w-full">
              Go to Sign In <ArrowRight className="h-5 w-5" />
            </button>
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
        <div className="login-glass-card w-full max-w-md space-y-8 p-10">
          <div className="space-y-3 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-600/10 text-indigo-400">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black text-white">Set New Password</h2>
            <p className="text-slate-400">Choose a strong password for your account</p>
          </div>

          {error && (
            <div className="login-alert login-alert-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!tokenReady ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="login-field">
                <label className="login-label">New Password</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="login-input"
                    required
                    minLength={8}
                    disabled={!accessToken}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-input-toggle"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Confirm Password</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="login-input"
                    required
                    disabled={!accessToken}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-rose-400">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !accessToken}
                className="login-submit w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Update Password <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center">
            <button type="button" onClick={goToLogin} className="login-link text-sm">
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
