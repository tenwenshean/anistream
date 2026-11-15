"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";

export default function VerificationToast() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");

    if (error === "login_failed") {
      setMessage({
        type: "error",
        text: "Sign-in failed, please try again.",
      });
    } else if (!error && searchParams.has("verified")) {
      setMessage({
        type: "success",
        text: "Email verified, you're signed in.",
      });
    }

    // Auto-dismiss after 8 seconds
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000] animate-in slide-in-from-top-2 duration-300">
      <div
        className={`
          flex items-start gap-3 max-w-md rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm
          ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }
        `}
      >
        {message.type === "success" ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
        )}

        <p className="text-sm font-medium flex-1">{message.text}</p>

        <button
          type="button"
          onClick={() => setMessage(null)}
          className="shrink-0 rounded-lg p-1 hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
