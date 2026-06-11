import PQueue from "p-queue";
import type {
  Anime,
  AnimeDetail,
  Episode,
  Genre,
  Recommendation,
} from "@/types/anime";

const queue = new PQueue({ interval: 1000, intervalCap: 3 });
const BASE_URL = "https://api.jikan.moe/v4";

async function jikanFetch<T>(path: string): Promise<T> {
  return queue.add(async () => {
    const response = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Jikan ${response.status}: ${path}`);
    }

    const json = (await response.json()) as { data: T };
    return json.data;
  });
}

async function fetchEpisodeMeta(
  id: number
): Promise<{ total: number; lastPage: number; latestEpisode: number }> {
  const firstPageResult = await queue.add(async () => {
    const response = await fetch(
      `${BASE_URL}/anime/${id}/episodes?page=1`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    return response.json() as Promise<{
      data: Episode[];
      pagination: {
        last_visible_page: number;
        has_next_page: boolean;
        items: { count: number; total: number; per_page: number };
      };
    }>;
  });

  if (!firstPageResult) return { total: 1, lastPage: 1, latestEpisode: 1 };

  const lastPage = firstPageResult.pagination.last_visible_page;
  const total = firstPageResult.pagination.items?.total || lastPage * 100;

  const lastPageResult = await queue.add(async () => {
    const response = await fetch(
      `${BASE_URL}/anime/${id}/episodes?page=${lastPage}`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    return response.json() as Promise<{ data: Episode[] }>;
  });

  const latestEpisode =
    lastPageResult?.data && lastPageResult.data.length > 0
      ? Math.max(...lastPageResult.data.map((ep) => ep.mal_id))
      : total;

  return { total, lastPage, latestEpisode };
}

// Genre map: slug -> MAL genre ID + label
export const GENRE_MAP: Record<string, { id: number; label: string }> = {
  action:          { id: 1,  label: "Action" },
  adventure:       { id: 2,  label: "Adventure" },
  comedy:          { id: 4,  label: "Comedy" },
  drama:           { id: 8,  label: "Drama" },
  fantasy:         { id: 10, label: "Fantasy" },
  horror:          { id: 14, label: "Horror" },
  mystery:         { id: 7,  label: "Mystery" },
  romance:         { id: 22, label: "Romance" },
  "sci-fi":        { id: 24, label: "Sci-Fi" },
  "slice-of-life": { id: 36, label: "Slice of Life" },
  sports:          { id: 30, label: "Sports" },
  supernatural:    { id: 37, label: "Supernatural" },
  thriller:        { id: 41, label: "Thriller" },
  mecha:           { id: 18, label: "Mecha" },
};

// Type map: slug -> Jikan type param + label
export const TYPE_MAP: Record<string, { param: string; label: string; description: string }> = {
  tv:      { param: "tv",      label: "TV",      description: "Full-length TV series airing on television." },
  movie:   { param: "movie",   label: "Movie",   description: "Standalone anime films released in theatres or direct." },
  ova:     { param: "ova",     label: "OVA",     description: "Original Video Animation — released direct to video." },
  ona:     { param: "ona",     label: "ONA",     description: "Original Net Animation — released online." },
  special: { param: "special", label: "Special", description: "Side stories, recap episodes and bonus content." },
};

export const jikan = {
  getTopAiring: () => jikanFetch<Anime[]>("/top/anime?filter=airing&limit=12"),
  getSeasonal: () => jikanFetch<Anime[]>("/seasons/now"),
  getAnime: (id: number) => jikanFetch<AnimeDetail>(`/anime/${id}`),
  getEpisodes: (id: number, page = 1) =>
    jikanFetch<Episode[]>(`/anime/${id}/episodes?page=${page}`),
  getEpisodeMeta: (id: number) => fetchEpisodeMeta(id),
  search: (query: string, genres?: string) =>
    jikanFetch<Anime[]>(
      `/anime?q=${encodeURIComponent(query)}${
        genres ? `&genres=${genres}` : ""
      }&order_by=score&sort=desc`
    ),
  getByGenre: (genreId: number, page = 1) =>
    jikanFetch<Anime[]>(
      `/anime?genres=${genreId}&order_by=score&sort=desc&limit=24&page=${page}`
    ),
  getByType: (type: string, page = 1) =>
    jikanFetch<Anime[]>(
      `/anime?type=${type}&order_by=score&sort=desc&limit=24&page=${page}`
    ),
  getGenres: () => jikanFetch<Genre[]>("/genres/anime"),
  getSchedule: (day: string) => jikanFetch<Anime[]>(`/schedules/${day}`),
  getRecommendations: (limit = 12) =>
    jikanFetch<Recommendation[]>(`/recommendations/anime?limit=${limit}`),
  getRecentUpdates: (page = 1, limit = 20) =>
    jikanFetch<Anime[]>(`/anime?order_by=score&sort=desc&limit=${limit}&page=${page}`),
};
