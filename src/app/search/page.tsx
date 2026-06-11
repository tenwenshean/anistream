import AnimeCard, { AnimeCardProps } from "@/components/AnimeCard";
import { jikan } from "@/lib/api/jikan";

export const dynamic = "force-dynamic";

async function searchAnime(query: string): Promise<AnimeCardProps[]> {
  if (!query.trim()) return [];

  try {
    const results = await jikan.search(query);
    return results.map((anime) => ({
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url:
        anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
      type: anime.type,
      episodes: anime.episodes,
      score: anime.score,
      airing: anime.status?.toLowerCase().includes("airing") ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = await searchAnime(query);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Search
          </p>
          <h1 className="text-3xl font-semibold">Results</h1>
          <p className="text-sm text-neutral-400">
            {query ? `Showing results for "${query}".` : "Enter a search above."}
          </p>
        </header>

        {query && results.length === 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-400">
            No results found.
          </div>
        ) : null}

        {results.length > 0 ? (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((anime) => (
              <AnimeCard key={anime.mal_id} {...anime} />
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}