import React from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, ChevronRight } from 'lucide-react';
import AnimeCard, { AnimeCardProps } from '@/components/AnimeCard';
import { getTopAiring as fetchTopAiring, getSeasonal } from '@/lib/api/anilist';
import HeroBanner from "@/components/HeroBanner";

async function getTopAiring(): Promise<AnimeCardProps[]> {
  try {
    return await fetchTopAiring();
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getSeasonalAnime(): Promise<AnimeCardProps[]> {
  try {
    return await getSeasonal();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function AnimeSugeLanding() {
  const [topAiring, seasonal] = await Promise.all([
    getTopAiring(),
    getSeasonalAnime(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 antialiased font-sans">

      <HeroBanner animeList={topAiring} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-12">

        {/* TOP AIRING */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
              <Flame className="w-5 h-5 text-amber-500 fill-current" /> Top Airing
            </h2>
            <Link href="/popular" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-5">
            {topAiring.map((anime, index) => (
              <AnimeCard key={`top-${anime.mal_id}-${index}`} {...anime} />
            ))}
          </div>
        </section>

        {/* THIS SEASON */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-purple-400" /> This Season
            </h2>
            <Link href="/seasonal" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-5">
            {seasonal.map((anime, index) => (
              <AnimeCard key={`seasonal-${anime.mal_id}-${index}`} {...anime} />
            ))}
          </div>
        </section>

      </main>

      <footer className="w-full bg-neutral-950 border-t border-neutral-900 py-8 px-4 mt-20 text-center text-xs text-neutral-600">
        <p className="font-bold text-neutral-500 mb-2">AniWatch</p>
        Data fetched in real-time via Jikan API (MyAnimeList).
      </footer>
    </div>
  );
}