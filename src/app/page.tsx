import React from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, ChevronRight } from 'lucide-react';
import AnimeCard, { AnimeCardProps } from '@/components/AnimeCard';
import { jikan } from '@/lib/api/jikan';
import HeroBanner from "@/components/HeroBanner";

async function getTopAiring(): Promise<AnimeCardProps[]> {
  try {
    const results = await jikan.getTopAiring();
    return results.map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url:
        anime.images.webp?.large_image_url || anime.images.jpg.large_image_url,
      type: anime.type,
      episodes: anime.episodes,
      score: anime.score,
      airing: true,
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getSeasonalAnime(): Promise<AnimeCardProps[]> {
  try {
    const results = await jikan.getSeasonal();
    return results.slice(0, 12).map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url:
        anime.images.webp?.large_image_url || anime.images.jpg.large_image_url,
      type: anime.type,
      episodes: anime.episodes,
      score: anime.score,
      airing: anime.status?.toLowerCase().includes("airing") ?? null,
    }));
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
            {topAiring.map((anime) => (
              <AnimeCard key={anime.mal_id} {...anime} />
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
            {seasonal.map((anime) => (
              <AnimeCard key={anime.mal_id} {...anime} />
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