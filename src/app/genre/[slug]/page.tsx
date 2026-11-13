import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import { GENRE_MAP } from "@/lib/api/jikan";
import { getByGenre } from "@/lib/api/anilist";
import type { AnimeCardProps } from "@/components/AnimeCard";

interface GenrePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return Object.keys(GENRE_MAP).map((slug) => ({ slug }));
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  const genre = GENRE_MAP[slug];
  if (!genre) notFound();

  const page = Math.max(1, Number(pageParam) || 1);

  let results: AnimeCardProps[] = [];
  let fetchError = false;

  try {
    results = await getByGenre(genre.label, page);
  } catch {
    fetchError = true;
  }

  const allGenres = Object.entries(GENRE_MAP);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-10 space-y-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Link href="/" className="hover:text-purple-400 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/genre/action" className="hover:text-purple-400 transition-colors">Genres</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-300 font-semibold">{genre.label}</span>
        </nav>

        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">
            Genre
          </p>
          <h1 className="text-4xl font-black tracking-tight">{genre.label}</h1>
          <p className="text-sm text-neutral-400">
            Top-rated {genre.label.toLowerCase()} anime, sorted by score.
          </p>
        </header>

        {/* Genre Pills */}
        <section className="flex flex-wrap gap-2">
          {allGenres.map(([s, g]) => (
            <Link
              key={s}
              href={`/genre/${s}`}
              className={`rounded-full border px-3.5 py-1 text-xs font-bold tracking-wide transition-all ${
                s === slug
                  ? "border-purple-500 bg-purple-500/20 text-purple-200"
                  : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-purple-500/50 hover:text-purple-300"
              }`}
            >
              {g.label}
            </Link>
          ))}
        </section>

        {/* Error */}
        {fetchError && (
          <div className="rounded-2xl border border-red-900 bg-red-900/20 p-4 text-red-300 text-sm">
            Failed to load anime. The Jikan API may be rate-limiting. Try again in a moment.
          </div>
        )}

        {/* Grid */}
        {!fetchError && results.length === 0 && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-neutral-500 text-sm">
            No results found for this genre.
          </div>
        )}

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
                href={`/genre/${slug}?page=${page - 1}`}
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
                  href={`/genre/${slug}?page=${p}`}
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
                href={`/genre/${slug}?page=${page + 1}`}
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
