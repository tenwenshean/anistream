import type { AnimeCardProps } from "@/components/AnimeCard";

// AniList answers far faster than Jikan. Results keep the MAL id,
// since the watch pages are keyed by it.
const ANILIST_URL = "https://graphql.anilist.co";

// AniList ignores any filter passed as null
const BROWSE_QUERY = `
  query (
    $page: Int, $perPage: Int, $sort: [MediaSort], $search: String,
    $genre: String, $format: MediaFormat, $status: MediaStatus,
    $season: MediaSeason, $seasonYear: Int, $minPopularity: Int
  ) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: ANIME, isAdult: false, sort: $sort, search: $search,
        genre: $genre, format: $format, status: $status,
        season: $season, seasonYear: $seasonYear, popularity_greater: $minPopularity
      ) {
        idMal
        title { english romaji }
        coverImage { large medium }
        format
        episodes
        averageScore
        status
      }
    }
  }
`;

interface AniListMedia {
  idMal: number | null;
  title: { english: string | null; romaji: string };
  coverImage: { large: string; medium: string };
  format: string | null;
  episodes: number | null;
  averageScore: number | null;
  status: string | null;
}

const FORMAT_LABELS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

export interface SearchResult extends AnimeCardProps {
  thumbnail_url: string;
}

interface BrowseOptions {
  sort: string[];
  page?: number;
  perPage?: number;
  search?: string;
  genre?: string;
  format?: string;
  status?: string;
  season?: string;
  seasonYear?: number;
  // keeps score-sorted lists from filling up with barely-watched titles
  minPopularity?: number;
}

async function browseAnime(
  { page = 1, perPage = 24, ...filters }: BrowseOptions,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: BROWSE_QUERY, variables: { page, perPage, ...filters } }),
    signal,
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`AniList ${response.status}`);

  const json = (await response.json()) as { data: { Page: { media: AniListMedia[] } } };
  return json.data.Page.media
    // entries without a MAL id have no watch page
    .filter((m): m is AniListMedia & { idMal: number } => m.idMal !== null)
    .map((m) => ({
      mal_id: m.idMal,
      title: m.title.english || m.title.romaji,
      image_url: m.coverImage.large,
      thumbnail_url: m.coverImage.medium,
      type: m.format ? FORMAT_LABELS[m.format] ?? m.format : null,
      episodes: m.episodes,
      score: m.averageScore !== null ? m.averageScore / 10 : null,
      airing: m.status === "RELEASING",
    }));
}

export function searchAnime(query: string, limit = 24, signal?: AbortSignal) {
  return browseAnime({ search: query, perPage: limit, sort: ["SEARCH_MATCH"] }, signal);
}

export function getTopAiring(limit = 12) {
  return browseAnime({
    status: "RELEASING",
    sort: ["SCORE_DESC"],
    perPage: limit,
    minPopularity: 10000,
  });
}

function currentSeason(): { season: string; seasonYear: number } {
  const now = new Date();
  const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];
  return { season: seasons[Math.floor(now.getMonth() / 3)], seasonYear: now.getFullYear() };
}

export function getSeasonal(limit = 12) {
  return browseAnime({ ...currentSeason(), sort: ["POPULARITY_DESC"], perPage: limit });
}

export function getPopular(page = 1, limit = 20) {
  return browseAnime({ sort: ["POPULARITY_DESC"], page, perPage: limit });
}

// genre names match AniList's own (Action, Slice of Life, Sci-Fi, ...)
export function getByGenre(genre: string, page = 1) {
  return browseAnime({ genre, sort: ["SCORE_DESC"], page, minPopularity: 5000 });
}

export function getByFormat(format: string, page = 1) {
  return browseAnime({
    format: format.toUpperCase(),
    sort: ["SCORE_DESC"],
    page,
    minPopularity: 5000,
  });
}

const ANIME_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      id
      title { english romaji }
      coverImage { extraLarge large }
      format
      episodes
      nextAiringEpisode { episode }
      averageScore
      status
      seasonYear
      description(asHtml: false)
      recommendations(perPage: 8, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            idMal
            title { english romaji }
            coverImage { medium }
          }
        }
      }
    }
  }
`;

const STATUS_LABELS: Record<string, string> = {
  FINISHED: "Finished Airing",
  RELEASING: "Currently Airing",
  NOT_YET_RELEASED: "Not yet aired",
  CANCELLED: "Cancelled",
  HIATUS: "On Hiatus",
};

export interface AnimeRecommendation {
  mal_id: number;
  title: string;
  image_url: string;
}

export interface AnimeInfo {
  anilist_id: number;
  title: string;
  image_url: string;
  type: string | null;
  isMovie: boolean;
  // aired so far for shows still airing, total otherwise
  episodes: number | null;
  score: number | null;
  status: string | null;
  year: number | null;
  synopsis: string | null;
  recommendations: AnimeRecommendation[];
}

interface AniListAnime {
  id: number;
  title: { english: string | null; romaji: string };
  coverImage: { extraLarge: string | null; large: string };
  format: string | null;
  episodes: number | null;
  nextAiringEpisode: { episode: number } | null;
  averageScore: number | null;
  status: string | null;
  seasonYear: number | null;
  description: string | null;
  recommendations: {
    nodes: Array<{
      mediaRecommendation: {
        idMal: number | null;
        title: { english: string | null; romaji: string };
        coverImage: { medium: string };
      } | null;
    }>;
  };
}

// AniList descriptions can still carry <br> and <i> tags
function stripTags(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

export async function getAnimeByMalId(malId: number): Promise<AnimeInfo | null> {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANIME_QUERY, variables: { idMal: malId } }),
    next: { revalidate: 3600 },
  });
  // AniList answers 404 for an unknown id
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`AniList ${response.status}`);

  const json = (await response.json()) as { data: { Media: AniListAnime | null } };
  const m = json.data.Media;
  if (!m) return null;

  return {
    anilist_id: m.id,
    title: m.title.english || m.title.romaji,
    image_url: m.coverImage.extraLarge || m.coverImage.large,
    type: m.format ? FORMAT_LABELS[m.format] ?? m.format : null,
    isMovie: m.format === "MOVIE",
    episodes: m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null),
    score: m.averageScore !== null ? m.averageScore / 10 : null,
    status: m.status ? STATUS_LABELS[m.status] ?? m.status : null,
    year: m.seasonYear,
    synopsis: m.description ? stripTags(m.description) : null,
    recommendations: m.recommendations.nodes.flatMap(({ mediaRecommendation: r }) =>
      r?.idMal
        ? [{ mal_id: r.idMal, title: r.title.english || r.title.romaji, image_url: r.coverImage.medium }]
        : []
    ),
  };
}
