import Image from "next/image";
import Link from "next/link";
import { jikan } from "@/lib/api/jikan";
import EpisodeGrid from "@/components/EpisodeGrid";

interface WatchPageProps {
  params: Promise<{
    animeId: string;
    ep: string;
  }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { animeId, ep } = await params;
  const activeEpisode = Number(ep) || 1;

  // Fetch anime detail first so we can pass type + episodes to episodeMeta
  const anime = await jikan.getAnime(Number(animeId));

  const [recommendations, episodeMeta] = await Promise.all([
    jikan.getRecommendations(8),
    jikan.getEpisodeMeta(Number(animeId), anime.episodes, anime.type),
  ]);

  const totalEpisodes = episodeMeta.latestEpisode;
  const lastPage = episodeMeta.lastPage;

  const isMovie = anime.type?.toLowerCase() === "movie";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">

        <section className="flex w-full flex-col gap-6 lg:flex-[3]">

          {/* Video Player + Info */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-3 shadow-2xl">
            <div className="aspect-video w-full rounded-xl bg-neutral-950/90 flex items-center justify-center">
              <span className="text-neutral-600 text-sm">
                ▶ {isMovie ? "Movie" : `Episode ${activeEpisode}`}
              </span>
            </div>

            <div className="mt-6 space-y-3 px-2 pb-2">
              <h1 className="text-2xl font-semibold text-white">
                {anime.title_english || anime.title}
              </h1>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
                {isMovie ? "Movie" : `Episode ${activeEpisode}`}
              </h2>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                {anime.type && <span>{anime.type}</span>}
                {anime.score && <span className="text-amber-400">★ {anime.score}</span>}
                {anime.status && <span>{anime.status}</span>}
                {anime.year && <span>{anime.year}</span>}
                {!isMovie && (
                  <span className="text-purple-400">{totalEpisodes} episodes</span>
                )}
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed line-clamp-4">
                {anime.synopsis || "No synopsis available."}
              </p>
            </div>
          </div>

          {/* Episode Grid — hide for movies */}
          {!isMovie && (
            <EpisodeGrid
              animeId={animeId}
              totalEpisodes={totalEpisodes}
              lastPage={lastPage}
              activeEpisode={activeEpisode}
            />
          )}

        </section>

        {/* Sidebar */}
        <aside className="w-full lg:flex-1">
          <div className="sticky top-24 rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-500">
              Recommended
            </h3>
            <div className="mt-4 space-y-4">
              {recommendations.map((rec) => {
                const entry = rec.entry[0];
                if (!entry) return null;
                return (
                  <Link
                    key={entry.mal_id}
                    href={`/watch/${entry.mal_id}/1`}
                    className="flex items-center gap-3 group"
                  >
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
                      <Image
                        src={entry.images.jpg.image_url}
                        alt={entry.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="48px"
                      />
                    </div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover:text-purple-400 transition-colors line-clamp-2">
                      {entry.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}
