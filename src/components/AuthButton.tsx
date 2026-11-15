"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthModal from "@/components/AuthModal";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="h-8 w-24 rounded-full bg-neutral-900 border border-neutral-800 animate-pulse" />
    );
  }

  if (user) {
    const name: string = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "";
    const avatar: string | undefined = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/library"
          title="My List"
          className="flex items-center gap-2 rounded-full transition-colors hover:text-purple-300"
        >
          {avatar && (
            // Google avatar hosts vary, so a plain img avoids listing them in next.config
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-full border border-neutral-800"
            />
          )}
          <span className="hidden sm:inline text-xs font-medium text-neutral-400 truncate max-w-32">
            {name}
          </span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-purple-400" /> Log out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all"
      >
        <LogIn className="w-3.5 h-3.5 text-purple-400" /> Login
      </button>

      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setModalOpen(false)}
      />
    </>
  );
}
