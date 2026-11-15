"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Heart, Loader2 } from "lucide-react";
import { getLibraryEntry, setLibraryFlag, type AnimeMeta } from "@/lib/library";

type Flag = "in_watchlist" | "favorite";

// Watchlist / Favorite toggles. Loads after the page, so it never holds up
// the video.
export default function LibraryButtons(meta: AnimeMeta) {
  const [flags, setFlags] = useState<Record<Flag, boolean>>({
    in_watchlist: false,
    favorite: false,
  });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<Flag | null>(null);
  const [hint, setHint] = useState("");

  useEffect(() => {
    let cancelled = false;
    getLibraryEntry(meta.malId)
      .then((row) => {
        if (cancelled || !row) return;
        setFlags({ in_watchlist: row.in_watchlist, favorite: row.favorite });
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [meta.malId]);

  async function toggle(flag: Flag) {
    const value = !flags[flag];
    setBusy(flag);
    setHint("");
    // show the change straight away, undo it if saving fails
    setFlags((f) => ({ ...f, [flag]: value }));
    const saved = await setLibraryFlag(meta, flag, value);
    if (!saved) {
      setFlags((f) => ({ ...f, [flag]: !value }));
      setHint("Log in to save anime to your list.");
    }
    setBusy(null);
  }

  const base =
    "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => toggle("in_watchlist")}
        disabled={!ready || busy !== null}
        className={`${base} ${
          flags.in_watchlist
            ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
        }`}
      >
        {busy === "in_watchlist" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : flags.in_watchlist ? (
          <BookmarkCheck className="h-3.5 w-3.5" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" />
        )}
        {flags.in_watchlist ? "In watchlist" : "Add to watchlist"}
      </button>

      <button
        type="button"
        onClick={() => toggle("favorite")}
        disabled={!ready || busy !== null}
        aria-pressed={flags.favorite}
        className={`${base} ${
          flags.favorite
            ? "border-pink-500/50 bg-pink-500/15 text-pink-200"
            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
        }`}
      >
        {busy === "favorite" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Heart className={`h-3.5 w-3.5 ${flags.favorite ? "fill-current" : ""}`} />
        )}
        {flags.favorite ? "Favorited" : "Favorite"}
      </button>

      {hint && <span className="text-xs text-amber-300">{hint}</span>}
    </div>
  );
}
