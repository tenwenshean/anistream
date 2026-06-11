export interface AnimeImageSet {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface AnimeImages {
  jpg: AnimeImageSet;
  webp: AnimeImageSet;
}

export interface Anime {
  mal_id: number;
  url: string;
  images: AnimeImages;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  episodes: number | null;
  airing: boolean;
  status: string | null;
  year: number | null;
  score: number | null;
  synopsis: string | null;
}

export interface AnimeDetail extends Anime {
  trailer: {
    youtube_id: string | null;
    url: string | null;
    embed_url: string | null;
  };
  genres: Array<{ mal_id: number; name: string }>;
  aired_episodes: number | null;
  duration: string | null;
  rating: string | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  background: string | null;
  studios: Array<{ mal_id: number; name: string }>;
}

export interface Episode {
  mal_id: number;
  title: string;
  title_japanese: string | null;
  title_romanji: string | null;
  aired: string | null;
  filler: boolean;
  recap: boolean;
}

export interface Genre {
  mal_id: number;
  name: string;
}

export interface RecommendationEntry {
  mal_id: number;
  title: string;
  images: AnimeImages;
}

export interface Recommendation {
  entry: RecommendationEntry[];
  content: string;
  date: string;
  user: {
    username: string;
  };
}