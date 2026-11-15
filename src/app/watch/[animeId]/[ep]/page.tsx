import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnimeByMalId } from "@/lib/api/anilist";
import KuhiPlayer from "@/components/KuhiPlayer";
import EpisodeGrid from "@/components/EpisodeGrid";
import LibraryButtons from "@/components/LibraryButtons";

interface WatchPageProps {
  params: Promise<{
    animeId: string;
    ep: string;
  }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { animeId, ep } = await params;
  const activeEpisode = Number(ep) || 1;

  // URLs use MAL ids; AniList also gives the AniList id the kuhi player needs
  const anime = await getAnimeByMalId(Number(animeId));
  if (!anime) notFound();

  // for shows still airing this is the number aired so far
  const totalEpisodes = anime.episodes ?? 0;
  const { isMovie, recommendations } = anime;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">

        <section className="flex w-full flex-col gap-6 lg:flex-[3]">

          {/* Anime Info Card */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-6 shadow-2xl">
            <div className="flex gap-6">
              {/* Poster */}
              <div className="relative h-48 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
                <Image
                  src={anime.image_url}
                  alt={anime.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <h1 className="text-3xl font-bold text-white">
                  {anime.title}
                </h1>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
                  {isMovie ? "Movie" : `Episode ${activeEpisode}`}
                </h2>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  {anime.type && <span>{anime.type}</span>}
                  {anime.score && <span className="text-amber-400">★ {anime.score}</span>}
                  {anime.status && <span>{anime.status}</span>}
                  {anime.year && <span>{anime.year}</span>}
                  {!isMovie && totalEpisodes > 0 && (
                    <span className="text-purple-400">{totalEpisodes} episodes</span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed line-clamp-4">
                  {anime.synopsis || "No synopsis available."}
                </p>
                <LibraryButtons
                  malId={Number(animeId)}
                  title={anime.title}
                  imageUrl={anime.image_url}
                />
              </div>
            </div>
          </div>

          {/* Video Player */}
          {/* keyed so every episode starts with a fresh player */}
          <KuhiPlayer
            key={`${anime.anilist_id}-${activeEpisode}`}
            anilistId={anime.anilist_id}
            episode={isMovie ? 1 : activeEpisode}
            anime={{ malId: Number(animeId), title: anime.title, imageUrl: anime.image_url }}
            nextEpisode={!isMovie && activeEpisode < totalEpisodes ? activeEpisode + 1 : null}
          />

          {/* Episode Grid — hide for movies */}
          {!isMovie && totalEpisodes > 0 && (
            <EpisodeGrid
              animeId={animeId}
              totalEpisodes={totalEpisodes}
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
              {recommendations.length === 0 && (
                <p className="text-sm text-neutral-500">No recommendations yet.</p>
              )}
              {recommendations.map((entry) => (
                <Link
                  key={entry.mal_id}
                  href={`/watch/${entry.mal_id}/1`}
                  className="flex items-center gap-3 group"
                >
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
                    <Image
                      src={entry.image_url}
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
              ))}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}
