"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setValidToken(false);
        setError("Invalid or expired reset link. Please request a new password reset.");
      } else {
        setValidToken(true);
      }
    };

    checkSession();
  }, []);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);

      // Redirect to home page after 3 seconds
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (validToken === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-neutral-100">
                  Invalid Reset Link
                </h1>
                <p className="text-sm text-neutral-400">
                  {error || "This password reset link is invalid or has expired."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full rounded-full bg-purple-500 hover:bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-neutral-100">
                  Password Reset Successful!
                </h1>
                <p className="text-sm text-neutral-400">
                  Your password has been updated successfully. Redirecting you to the home page...
                </p>
              </div>

              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-neutral-100">
            Reset Your Password
          </h1>
          <p className="text-sm text-neutral-400">
            Enter your new password below
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-2xl">
          <form onSubmit={handleResetPassword} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-semibold text-neutral-300">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-11 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 transition-all"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-neutral-300">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-11 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-linear-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating Password..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full text-center text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
