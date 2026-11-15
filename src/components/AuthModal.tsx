"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Mail, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  isSupabaseConfigured,
  SUPABASE_SETUP_MESSAGE,
} from "@/lib/supabase/config";

type AuthMode = "sign-in" | "sign-up" | "verify-email" | "forgot-password" | "reset-sent";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      // Don't reset mode if in verify-email state, user might need to see the message
      setTimeout(() => {
        setMode("sign-in");
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setError(null);
        setMessage(null);
        setLoading(false);
        setVerificationEmail("");
      }, 300);
    }
  }, [open]);

  if (!open || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setError(SUPABASE_SETUP_MESSAGE);
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "sign-in") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          // Check if it's an email not confirmed error
          if (signInError.message.includes("Email not confirmed") ||
              signInError.message.includes("not confirmed")) {
            setError("Please verify your email before signing in. Check your inbox for the verification link.");
          } else {
            setError(signInError.message);
          }
          return;
        }

        // Check if email is verified
        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError("Please verify your email before signing in. Check your inbox for the verification link.");
          return;
        }

        onSuccess();
        onClose();
      } else if (mode === "sign-up") {
        // Sign up with email confirmation required
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/?verified=true")}`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // Check if email confirmation is required
        if (data.user && !data.user.email_confirmed_at) {
          setVerificationEmail(email.trim());
          setMode("verify-email");
          setName("");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        // If somehow they got a session immediately (email confirmation disabled)
        if (data.session) {
          onSuccess();
          onClose();
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerificationEmail() {
    if (!verificationEmail) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/?verified=true")}`,
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Verification email sent! Check your inbox.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(SUPABASE_SETUP_MESSAGE);
      return;
    }
    setLoading(true);
    // come back to the page the viewer was on
    const next = window.location.pathname + window.location.search;
    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // on success the browser is already on its way to Google
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setError(SUPABASE_SETUP_MESSAGE);
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setVerificationEmail(email.trim());
      setMode("reset-sent");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setName("");
    setPassword("");
    setConfirmPassword("");
    setVerificationEmail("");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 id="auth-modal-title" className="text-lg font-bold text-neutral-100">
            {mode === "sign-in" ? "Sign in" :
             mode === "sign-up" ? "Create account" :
             mode === "forgot-password" ? "Reset password" :
             mode === "reset-sent" ? "Check your email" :
             "Verify your email"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === "verify-email" ? (
          <div className="space-y-5 px-6 py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-purple-500/10 p-4">
                <Mail className="w-8 h-8 text-purple-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-neutral-100">
                  Check your email
                </h3>
                <p className="text-sm text-neutral-400 max-w-sm">
                  We sent a verification link to{" "}
                  <span className="font-semibold text-neutral-200">{verificationEmail}</span>
                </p>
              </div>

              {message && (
                <div className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {message}
                </div>
              )}

              {error && (
                <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="w-full space-y-3 pt-2">
                <p className="text-xs text-neutral-500">
                  Click the verification link in your email to activate your account.
                </p>

                <button
                  type="button"
                  onClick={resendVerificationEmail}
                  disabled={loading}
                  className="w-full rounded-full bg-purple-500/10 border border-purple-500/30 px-4 py-2.5 text-sm font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Resend verification email"}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className="w-full rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        ) : mode === "reset-sent" ? (
          <div className="space-y-5 px-6 py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-purple-500/10 p-4">
                <Mail className="w-8 h-8 text-purple-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-neutral-100">
                  Password reset email sent
                </h3>
                <p className="text-sm text-neutral-400 max-w-sm">
                  We sent a password reset link to{" "}
                  <span className="font-semibold text-neutral-200">{verificationEmail}</span>
                </p>
              </div>

              {error && (
                <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="w-full space-y-3 pt-2">
                <p className="text-xs text-neutral-500">
                  Click the link in your email to reset your password. The link will expire in 1 hour.
                </p>

                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className="w-full rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        ) : mode === "forgot-password" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4 px-6 py-5">
            {!isSupabaseConfigured() && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {SUPABASE_SETUP_MESSAGE}
              </p>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <p className="text-sm text-neutral-400">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="text-xs font-semibold text-neutral-400">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className="w-full text-center text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {!isSupabaseConfigured() && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {SUPABASE_SETUP_MESSAGE}
                </p>
              )}

              {message && (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {message}
                </p>
              )}

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleLogo />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <div className="h-px flex-1 bg-neutral-800" />
                or with email
                <div className="h-px flex-1 bg-neutral-800" />
              </div>

              {mode === "sign-up" && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="text-xs font-semibold text-neutral-400">
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-xs font-semibold text-neutral-400">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="text-xs font-semibold text-neutral-400">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>

              {mode === "sign-up" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-confirm-password"
                    className="text-xs font-semibold text-neutral-400"
                  >
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-linear-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Sign up"}
              </button>

              {mode === "sign-in" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot-password")}
                  className="w-full text-center text-sm text-neutral-400 hover:text-purple-400 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </form>

            <div className="border-t border-neutral-800 px-6 py-4 text-center text-sm text-neutral-400">
              {mode === "sign-in" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("sign-up")}
                    className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("sign-in")}
                    className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
