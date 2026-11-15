// Kuhi anime API (kuhi-anime-api) — streams are looked up by AniList id,
// while the rest of the site uses MAL ids from Jikan.

export const KUHI_API_URL =
  process.env.NEXT_PUBLIC_KUHI_API_URL ?? "http://127.0.0.1:8000";

// The only provider whose streams reliably play in the browser. Auto mode
// often picks reanime, whose playlists are encrypted and never play.
export const KUHI_PROVIDER = "anikoto";

export interface KuhiStream {
  url: string;
  type: "hls" | "mp4" | "embed" | "dash";
  server?: string;
  referer?: string;
}

export interface KuhiSubtitle {
  url: string;
  label: string;
  srclang: string;
  default?: boolean;
  // the server name the file came from, e.g. "HD-1"
  source?: string;
}

export interface KuhiExtract {
  provider: string;
  streams: KuhiStream[];
  subtitles?: KuhiSubtitle[];
}

export function kuhiExtractUrl(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  provider: string
): string {
  return `${KUHI_API_URL}/anime/extract/${anilistId}?e=${episode}&type=${audio}&provider=${provider}`;
}

// kuhi's proxy adds the Referer/Origin headers the video hosts require
export function kuhiProxyUrl(stream: KuhiStream): string {
  return `${KUHI_API_URL}/proxy_m3u8?url=${encodeURIComponent(stream.url)}&referer=${encodeURIComponent(stream.referer ?? "")}`;
}

// subtitle hosts refuse requests without the video site's Referer, so the
// .vtt files go through the same proxy as the video
export function kuhiSubtitleUrl(subtitle: KuhiSubtitle, referer: string): string {
  return `${KUHI_API_URL}/proxy_segment?url=${encodeURIComponent(subtitle.url)}&referer=${encodeURIComponent(referer)}`;
}
