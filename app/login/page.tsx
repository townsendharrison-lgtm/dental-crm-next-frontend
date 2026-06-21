"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInitialRouteForRole } from "@/lib/navigation";

const LOGO_URL =
  "https://images.squarespace-cdn.com/content/64d0277a0640507c114633ad/b8543df7-ec9e-4d64-912e-e80bb44c8757/Untitled+design-3.png?content-type=image%2Fpng";

type FormMode = "signin" | "forgot";

function LoginForm() {
  const { login, resetPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<FormMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mode change
  useEffect(() => {
    emailRef.current?.focus();
    setError("");
    setSuccess("");
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || "Login failed.");
        } else {
          const next = params.get("next");
          if (next) {
            router.replace(next);
          } else {
            router.replace(getInitialRouteForRole(result.user?.role));
          }
        }
      } else if (mode === "forgot") {
        const result = await resetPassword(email);
        if (!result.success) {
          setError(result.error || "Failed to send reset email.");
        } else {
          setSuccess("Password reset email sent! Check your inbox.");
        }
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form-wrapper">
      {/* Mobile Header (Logo and Title) - Hidden on desktop since it's in the hero panel */}
      <div className="lg:hidden flex flex-col items-center justify-center mb-8 gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="Dental School Guide Logo"
          className="w-16 h-16 object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent text-center">
          Dental School Guide
        </h1>
      </div>

      {/* Mode title */}
      <div className="login-form-header">
        <h2 className="login-form-title">
          {mode === "signin" && "Welcome Back"}
          {mode === "forgot" && "Reset Password"}
        </h2>
        <p className="login-form-desc">
          {mode === "signin" && "Sign in to access your dashboard"}
          {mode === "forgot" && "Enter your email and we'll send a reset link"}
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="login-alert login-alert-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="login-alert login-alert-success">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="login-form">
        {/* Email */}
        <div className="login-field">
          <label className="login-label">Email</label>
          <div className="login-input-wrapper">
            <Mail className="login-input-icon" />
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="login-input"
              required
            />
          </div>
        </div>

        {/* Password (signin only) */}
        {mode === "signin" && (
          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="login-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-input-toggle"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Remember me + Forgot password (signin only) */}
        {mode === "signin" && (
          <div className="login-options">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login-checkbox"
              />
              <span>Remember me</span>
            </label>
            <button type="button" onClick={() => setMode("forgot")} className="login-link">
              Forgot password?
            </button>
          </div>
        )}

        {/* Submit button */}
        <button type="submit" disabled={isLoading} className="login-submit">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {mode === "signin" && "Sign In"}
              {mode === "forgot" && "Send Reset Link"}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Mode switcher links */}
      <div className="login-mode-switch">
        {mode === "forgot" && (
          <p>
            Remember your password?{" "}
            <button onClick={() => setMode("signin")} className="login-link">
              Back to Sign In
            </button>
          </p>
        )}
        {mode === "signin" && (
          <p className="text-xs text-slate-600 mt-4">
            New users are invited by an administrator. Check your email for an invitation link.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      {/* Background animated gradient mesh */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-container">
        {/* Left decorative panel */}
        <div className="login-hero">
          <div className="login-hero-content">
            <div className="login-hero-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_URL}
                alt="Dental School Guide"
                className="login-hero-logo-img"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <h1 className="login-hero-title">Dental School Guide</h1>
            <p className="login-hero-subtitle">The #1 Guide for How to Get into Dental School</p>

            <div className="login-hero-features">
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="login-hero-feature-title">Insights Directly From Admission Members</p>
                  <p className="login-hero-feature-desc">
                    Learn how to increase your chances of getting into dental school
                  </p>
                </div>
              </div>
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="login-hero-feature-title">Application Command Center</p>
                  <p className="login-hero-feature-desc">
                    Track deadlines, hours, schools, and essays in one simple dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="login-hero-footer">
              <p className="text-xs text-slate-500">© {new Date().getFullYear()} Dental School Guide</p>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-form-panel">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
