import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import { jikan, TYPE_MAP } from "@/lib/api/jikan";
import type { AnimeCardProps } from "@/components/AnimeCard";
import type { Anime } from "@/types/anime";

interface TypePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

function toCard(anime: Anime): AnimeCardProps {
  return {
    mal_id: anime.mal_id,
    title: anime.title_english || anime.title,
    image_url:
      anime.images.webp?.large_image_url || anime.images.jpg.large_image_url,
    type: anime.type,
    episodes: anime.episodes,
    score: anime.score,
    airing: anime.airing ?? null,
  };
}

export async function generateStaticParams() {
  return Object.keys(TYPE_MAP).map((slug) => ({ slug }));
}

export default async function TypePage({ params, searchParams }: TypePageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  const typeEntry = TYPE_MAP[slug];
  if (!typeEntry) notFound();

  const page = Math.max(1, Number(pageParam) || 1);

  let results: AnimeCardProps[] = [];
  let fetchError = false;

  try {
    const data = await jikan.getByType(typeEntry.param, page);
    results = data.map(toCard);
  } catch {
    fetchError = true;
  }

  const allTypes = Object.entries(TYPE_MAP);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-10 space-y-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Link href="/" className="hover:text-purple-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/type/tv" className="hover:text-purple-400 transition-colors">Types</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-300 font-semibold">{typeEntry.label}</span>
        </nav>

        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">
            Type
          </p>
          <h1 className="text-4xl font-black tracking-tight">{typeEntry.label}</h1>
          <p className="text-sm text-neutral-400">{typeEntry.description}</p>
        </header>

        {/* Type Pills */}
        <section className="flex flex-wrap gap-2">
          {allTypes.map(([s, t]) => (
            <Link
              key={s}
              href={`/type/${s}`}
              className={`rounded-full border px-3.5 py-1 text-xs font-bold tracking-wide transition-all ${
                s === slug
                  ? "border-purple-500 bg-purple-500/20 text-purple-200"
                  : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-purple-500/50 hover:text-purple-300"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </section>

        {/* Error */}
        {fetchError && (
          <div className="rounded-2xl border border-red-900 bg-red-900/20 p-4 text-red-300 text-sm">
            Failed to load anime. The Jikan API may be rate-limiting. Try again in a moment.
          </div>
        )}

        {/* Empty */}
        {!fetchError && results.length === 0 && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-neutral-500 text-sm">
            No results found for this type.
          </div>
        )}

        {/* Grid */}
        {results.length > 0 && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-5">
            {results.map((anime) => (
              <AnimeCard key={anime.mal_id} {...anime} />
            ))}
          </section>
        )}

        {/* Pagination */}
        {results.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {page > 1 && (
              <Link
                href={`/type/${slug}?page=${page - 1}`}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-400 hover:border-purple-500/60 hover:text-purple-200 transition-all"
              >
                ← Prev
              </Link>
            )}
            {[page - 1, page, page + 1]
              .filter((p) => p >= 1)
              .map((p) => (
                <Link
                  key={p}
                  href={`/type/${slug}?page=${p}`}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${
                    p === page
                      ? "border-purple-500 bg-purple-500/20 text-purple-200"
                      : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-purple-500/60 hover:text-purple-200"
                  }`}
                >
                  {p}
                </Link>
              ))}
            {results.length === 24 && (
              <Link
                href={`/type/${slug}?page=${page + 1}`}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-400 hover:border-purple-500/60 hover:text-purple-200 transition-all"
              >
                Next →
              </Link>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
