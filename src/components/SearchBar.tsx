"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Star, Tv } from "lucide-react";
import Image from "next/image";

interface SuggestionAnime {
  mal_id: number;
  title: string;
  image_url: string;
  type: string | null;
  score: number | null;
  episodes: number | null;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionAnime[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query.trim())}&limit=5&order_by=score&sort=desc`
        );
        const json = await res.json();
        const results: SuggestionAnime[] = (json.data ?? []).map((a: {
          mal_id: number;
          title_english: string | null;
          title: string;
          images: { jpg: { image_url: string } };
          type: string | null;
          score: number | null;
          episodes: number | null;
        }) => ({
          mal_id: a.mal_id,
          title: a.title_english || a.title,
          image_url: a.images.jpg.image_url,
          type: a.type,
          score: a.score,
          episodes: a.episodes,
        }));
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSelect(mal_id: number) {
    setOpen(false);
    setQuery("");
    router.push(`/watch/${mal_id}/1`);
  }

  function highlightMatch(text: string, search: string) {
    if (!search.trim()) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-purple-400 font-bold">{text.slice(idx, idx + search.length)}</span>
        {text.slice(idx + search.length)}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full max-w-md relative hidden sm:block">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="Search anime title, genres..."
          className={`w-full bg-neutral-900 border transition-all rounded-full pl-4 pr-10 py-1.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none ${
            focused
              ? "border-purple-500/50 ring-1 ring-purple-500/30"
              : "border-neutral-800"
          }`}
          aria-label="Search anime"
          autoComplete="off"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <div className="w-4 h-4 border-2 border-neutral-600 border-t-purple-400 rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-neutral-500 hover:text-purple-400 transition-colors" />
          )}
        </button>
      </form>

      {/* Suggestions dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-neutral-800 bg-neutral-950/98 shadow-2xl backdrop-blur-md overflow-hidden z-50">
          {suggestions.map((anime, i) => (
            <button
              key={anime.mal_id}
              onClick={() => handleSelect(anime.mal_id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-900 transition-colors text-left group ${
                i !== suggestions.length - 1 ? "border-b border-neutral-900" : ""
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-8 h-11 shrink-0 rounded-md overflow-hidden bg-neutral-800">
                <Image
                  src={anime.image_url}
                  alt={anime.title}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-neutral-200 group-hover:text-white truncate leading-tight">
                  {highlightMatch(anime.title, query)}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  {anime.type && (
                    <span className="flex items-center gap-0.5">
                      <Tv className="w-2.5 h-2.5" /> {anime.type}
                    </span>
                  )}
                  {anime.episodes && (
                    <span>{anime.episodes} eps</span>
                  )}
                  {anime.score && (
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <Star className="w-2.5 h-2.5 fill-current" /> {anime.score.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow hint */}
              <span className="text-[10px] text-neutral-600 group-hover:text-purple-400 shrink-0 transition-colors">
                Watch →
              </span>
            </button>
          ))}

          {/* View all results */}
          <button
            onClick={() => {
              setOpen(false);
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-purple-400 hover:bg-neutral-900 transition-colors text-center border-t border-neutral-800"
          >
            See all results for &quot;{query}&quot;
          </button>
        </div>
      )}
    </div>
  );
}
