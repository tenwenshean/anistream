"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, History, Loader2, Play, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  currentUserId,
  listLocalProgress,
  removeLocalProgress,
  setLibraryFlag,
  type LibraryRow,
} from "@/lib/library";

type Tab = "continue" | "watchlist" | "favorites";

interface Entry {
  malId: number;
  title: string;
  imageUrl: string | null;
  inWatchlist: boolean;
  favorite: boolean;
  episode: number | null;
  position: number;
  duration: number | null;
  updatedAt: number;
}

function fromRow(row: LibraryRow): Entry {
  return {
    malId: row.mal_id,
    title: row.title,
    imageUrl: row.image_url,
    inWatchlist: row.in_watchlist,
    favorite: row.favorite,
    episode: row.last_episode,
    position: row.position_seconds,
    duration: row.duration_seconds,
    updatedAt: Date.parse(row.updated_at),
  };
}

// the account's list, topped up with anything watched on this device that
// hasn't reached the account yet (or everything, when signed out)
function mergeWithLocal(entries: Entry[]): Entry[] {
  const byId = new Map(entries.map((e) => [e.malId, e]));
  for (const p of listLocalProgress()) {
    const existing = byId.get(p.malId);
    if (!existing) {
      byId.set(p.malId, {
        ...p,
        inWatchlist: false,
        favorite: false,
      });
    } else if (!existing.episode || p.updatedAt > existing.updatedAt) {
      byId.set(p.malId, {
        ...existing,
        episode: p.episode,
        position: p.position,
        duration: p.duration,
        updatedAt: p.updatedAt,
      });
    }
  }
  return [...byId.values()];
}

const finished = (e: Entry) => Boolean(e.duration && e.position >= e.duration - 60);

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("continue");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const userId = await currentUserId();
    let rows: Entry[] = [];
    if (userId) {
      const { data } = await createClient()
        .from("library")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      rows = ((data as LibraryRow[] | null) ?? []).map(fromRow);
    }
    setSignedIn(Boolean(userId));
    setEntries(mergeWithLocal(rows));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data once mounted
    void load();
    if (!isSupabaseConfigured()) return;
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange(() => void load());
    return () => subscription.unsubscribe();
  }, [load]);

  async function removeFrom(entry: Entry, list: Tab) {
    if (list === "continue") {
      removeLocalProgress(entry.malId);
      const userId = await currentUserId();
      if (userId) {
        await createClient()
          .from("library")
          .update({ last_episode: null, position_seconds: 0 })
          .eq("user_id", userId)
          .eq("mal_id", entry.malId);
      }
      setEntries((all) => all.map((e) => (e.malId === entry.malId ? { ...e, episode: null } : e)));
      return;
    }
    const flag = list === "watchlist" ? "in_watchlist" : "favorite";
    if (await setLibraryFlag(entry, flag, false)) {
      setEntries((all) =>
        all.map((e) =>
          e.malId === entry.malId
            ? { ...e, [list === "watchlist" ? "inWatchlist" : "favorite"]: false }
            : e
        )
      );
    }
  }

  const lists: Record<Tab, Entry[]> = {
    continue: entries
      .filter((e) => e.episode)
      .sort((a, b) => b.updatedAt - a.updatedAt),
    watchlist: entries.filter((e) => e.inWatchlist),
    favorites: entries.filter((e) => e.favorite),
  };

  const tabs: { id: Tab; label: string; icon: typeof History }[] = [
    { id: "continue", label: "Continue watching", icon: History },
    { id: "watchlist", label: "Watchlist", icon: Bookmark },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  const shown = lists[tab];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            AniWatch
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">My List</h1>
          <p className="text-sm text-neutral-400">
            Pick up where you left off, and keep track of what you want to watch.
          </p>
        </header>

        {signedIn === false && (
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-200">
            You&apos;re not logged in. Your progress is saved on this device only. Log in
            (top right) to keep a watchlist and favorites, and continue on any device.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                tab === id
                  ? "border-purple-500 bg-purple-500 text-white"
                  : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="text-xs opacity-70">{lists[id].length}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-10 text-center text-sm text-neutral-500">
            {tab === "continue"
              ? "Nothing here yet. Start an episode and it shows up here."
              : tab === "watchlist"
                ? "Your watchlist is empty. Use “Add to watchlist” on any anime page."
                : "No favorites yet. Use the heart on any anime page."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shown.map((entry) => {
              const done = finished(entry);
              // a finished episode continues with the next one
              const episode = entry.episode ? (done ? entry.episode + 1 : entry.episode) : 1;
              const percent =
                entry.duration && !done ? Math.min(100, (entry.position / entry.duration) * 100) : 0;
              return (
                <div
                  key={entry.malId}
                  className="group relative overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900"
                >
                  <Link href={`/watch/${entry.malId}/${episode}`} className="block">
                    <div className="relative aspect-3/4 w-full bg-neutral-950">
                      {entry.imageUrl && (
                        <Image
                          src={entry.imageUrl}
                          alt={entry.title}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-10 w-10 fill-white text-white" />
                      </div>
                      {percent > 0 && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-neutral-800">
                          <div className="h-full bg-purple-500" style={{ width: `${percent}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-neutral-100">
                        {entry.title}
                      </p>
                      {entry.episode && (
                        <p className="text-xs text-neutral-500">
                          {done
                            ? `Up next: episode ${episode}`
                            : `Episode ${entry.episode} · ${formatTime(entry.position)}`}
                        </p>
                      )}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFrom(entry, tab)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-neutral-300 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                    aria-label={`Remove ${entry.title} from this list`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
