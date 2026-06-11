import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star } from 'lucide-react';

// Define the data structural blueprint for type safety
export interface AnimeCardProps {
  mal_id: number;
  title: string;
  image_url: string;
  type?: string | null;
  episodes?: number | null;
  score?: number | null;
  airing?: boolean | null;
}

export default function AnimeCard({
  mal_id,
  title,
  image_url,
  type,
  episodes,
  score,
  airing,
}: AnimeCardProps) {
  return (
    <Link
      href={`/watch/${mal_id}/1`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-neutral-900 border border-neutral-900 transition-all duration-300 hover:-translate-y-1.5 hover:border-neutral-800 hover:shadow-2xl hover:shadow-black/60"
      aria-label={`Open ${title} episode 1`}
    >
      
      {/* Aspect Ratio Container for Poster Image */}
      <div className="relative aspect-3/4 w-full overflow-hidden bg-neutral-950">
        <Image
          src={image_url}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
        />
        
        {/* Floating Absolute Tags */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-1 z-20">
          <span className="w-fit rounded-md bg-purple-500 px-1.5 py-0.5 text-[10px] font-black text-neutral-950 tracking-wider uppercase shadow-md">
            EP {episodes || '??'}
          </span>
          {typeof airing === 'boolean' ? (
            <span className="w-fit rounded-md bg-neutral-900/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold text-neutral-300 border border-neutral-800 shadow-md">
              {airing ? 'Airing' : 'Finished'}
            </span>
          ) : null}
        </div>

        {/* Rating Score Badge */}
        {score ? (
          <span className="absolute top-2 right-2 rounded-md bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-neutral-800 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-current" /> {score.toFixed(1)}
          </span>
        ) : null}

        {/* Play Button Interactive Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <div className="bg-purple-500 text-neutral-950 p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current" />
          </div>
        </div>
      </div>

      {/* Title Details Area */}
      <div className="p-3 space-y-1">
        <h3 className="truncate text-sm font-semibold text-neutral-200 group-hover:text-purple-400 transition-colors duration-200" title={title}>
          {title}
        </h3>
        {type ? (
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
            <span>{type}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}