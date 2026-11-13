"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 50;

interface EpisodeGridProps {
  animeId: string;
  totalEpisodes: number;
  activeEpisode: number;
}

export default function EpisodeGrid({
  animeId,
  totalEpisodes,
  activeEpisode,
}: EpisodeGridProps) {
  const lastPage = Math.max(1, Math.ceil(totalEpisodes / PER_PAGE));
  // open on the page holding the episode being watched
  const [page, setPage] = useState(
    Math.min(lastPage, Math.max(1, Math.ceil(activeEpisode / PER_PAGE)))
  );

  const start = (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, totalEpisodes);
  const episodes = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const arrowClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/60 text-neutral-400 transition-colors hover:border-purple-500/60 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Episodes</h3>
        {lastPage > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className={arrowClass}
              aria-label={`Previous ${PER_PAGE} episodes`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs text-neutral-500">
              {start}–{end}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === lastPage}
              className={arrowClass}
              aria-label={`Next ${PER_PAGE} episodes`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
        {episodes.map((episode) => (
          <Link
            key={episode}
            href={`/watch/${animeId}/${episode}`}
            aria-current={episode === activeEpisode ? "page" : undefined}
            className={`flex h-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
              episode === activeEpisode
                ? "bg-purple-500 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
            }`}
          >
            {episode}
          </Link>
        ))}
      </div>
    </div>
  );
}
