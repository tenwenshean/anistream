"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface EpisodeGridProps {
  animeId: string;
  totalEpisodes: number;
  lastPage: number;
  activeEpisode: number;
}

export default function EpisodeGrid({
  animeId,
  totalEpisodes,
  lastPage,
  activeEpisode,
}: EpisodeGridProps) {
  const initialPage = Math.ceil(activeEpisode / 100);
  const [page, setPage] = useState(Math.max(1, initialPage));

  const start = (page - 1) * 100 + 1;
  const end = Math.min(page * 100, totalEpisodes);
  const episodes = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-500">
          Episodes
        </h3>
        <span className="text-xs text-neutral-600">
          {start}–{end} of {totalEpisodes}
        </span>
      </div>

      {/* Episode buttons */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
        {episodes.map((episode) => (
          <Link
            key={episode}
            href={`/watch/${animeId}/${episode}`}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold text-center transition-all ${
              activeEpisode === episode
                ? "border-purple-500 bg-purple-500/20 text-purple-200"
                : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-purple-500/60 hover:text-purple-200"
            }`}
            aria-current={activeEpisode === episode ? "page" : undefined}
          >
            {episode}
          </Link>
        ))}
      </div>

      {/* Pagination controls */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between pt-2">

          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs font-semibold text-neutral-400 transition-all hover:border-purple-500/60 hover:text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          {/* Page range pills e.g. 1-100, 101-200 */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => {
              const rangeStart = (p - 1) * 100 + 1;
              const rangeEnd = Math.min(p * 100, totalEpisodes);

              const show =
                p === 1 ||
                p === lastPage ||
                Math.abs(p - page) <= 1;

              const showDotsBefore = p === page - 2 && page > 3;
              const showDotsAfter = p === page + 2 && page < lastPage - 2;

              if (showDotsBefore || showDotsAfter) {
                return (
                  <span key={p} className="text-neutral-600 text-xs px-1">
                    ...
                  </span>
                );
              }

              if (!show) return null;

              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    p === page
                      ? "border-purple-500 bg-purple-500/20 text-purple-200"
                      : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-purple-500/60 hover:text-purple-200"
                  }`}
                >
                  {rangeStart}–{rangeEnd}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs font-semibold text-neutral-400 transition-all hover:border-purple-500/60 hover:text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>

        </div>
      )}
    </section>
  );
}