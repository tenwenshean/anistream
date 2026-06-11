"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimeCardProps } from "@/components/AnimeCard";

interface HeroBannerProps {
  animeList: AnimeCardProps[];
}

export default function HeroBanner({ animeList }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-slide every 3 seconds unless hovered
  useEffect(() => {
    if (paused || animeList.length === 0) return;
    const timer = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % animeList.length);
    }, 3000);
    return () => clearTimeout(timer);
  }, [current, paused, animeList.length]);

  const prev = () => setCurrent((c) => (c - 1 + animeList.length) % animeList.length);
  const next = () => setCurrent((c) => (c + 1) % animeList.length);

  const hero = animeList[current];
  if (!hero) return null;

  return (
    <section
      className="relative w-full h-72 md:h-96 lg:h-[420px] bg-neutral-900 flex items-end overflow-hidden border-b border-neutral-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image — fades between slides */}
      {animeList.map((anime, i) => (
        <div
          key={anime.mal_id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={anime.image_url}
            alt={anime.title}
            fill
            className="object-cover object-center scale-105 blur-xs opacity-30"
            sizes="100vw"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/20 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 lg:px-8 pb-8 md:pb-12 space-y-3">
        
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">
            Top Airing
          </span>
          {hero.score && (
            <span className="bg-neutral-800 text-amber-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">
              ★ {hero.score.toFixed(1)}
            </span>
          )}
          {hero.type && (
            <span className="bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">
              {hero.type}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-2xl leading-none drop-shadow-md line-clamp-2">
          {hero.title}
        </h1>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <Link
            href={`/watch/${hero.mal_id}/1`}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-neutral-950 font-bold text-sm px-6 py-2.5 rounded-full shadow-lg shadow-purple-500/20 transition-all"
          >
            <Play className="w-4 h-4 fill-current" /> Watch Now
          </Link>
          <Link
            href={`/anime/${hero.mal_id}`}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm px-6 py-2.5 rounded-full transition-all"
          >
            More Info
          </Link>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 p-2 rounded-full transition-all"
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 p-2 rounded-full transition-all"
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5">
        {animeList.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "bg-purple-400 w-5 h-1.5"
                : "bg-neutral-600 hover:bg-neutral-400 w-1.5 h-1.5"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}