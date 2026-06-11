'use client';

import { useEffect, useState } from 'react';
import { jikan } from '@/lib/api/jikan';
import AnimeCard from '@/components/AnimeCard';
import type { Anime } from '@/types/anime';

export default function PopularPage() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopular = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await jikan.getRecentUpdates(currentPage, 20);
        setAnime(data);
      } catch (err) {
        setError('Failed to fetch popular anime. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopular();
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            AniWatch
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Most Popular</h1>
          <p className="text-sm text-neutral-400">
            Most viewed and popular anime series.
          </p>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-900 bg-red-900/20 p-4 text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
          </div>
        ) : anime.length > 0 ? (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {anime.map((item) => (
                <AnimeCard
                  key={item.mal_id}
                  mal_id={item.mal_id}
                  title={item.title_english || item.title}
                  image_url={item.images.jpg.image_url}
                  type={item.type}
                  episodes={item.episodes}
                  score={item.score}
                  airing={item.airing}
                />
              ))}
            </section>

            <div className="flex justify-center gap-2 mt-8">
              {[1, 2, 3, 4].map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    currentPage === page
                      ? 'bg-purple-500 text-neutral-950 shadow-lg'
                      : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-purple-500 hover:text-purple-400'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </>
        ) : (
          <section className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-300">
            No popular anime available.
          </section>
        )}
      </main>
    </div>
  );
}
