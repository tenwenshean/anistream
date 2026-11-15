// Kuhi anime API (kuhi-anime-api) — streams are looked up by AniList id,
// while the rest of the site uses MAL ids from Jikan.

const BUILD_KUHI_URL = process.env.NEXT_PUBLIC_KUHI_API_URL ?? "http://127.0.0.1:8000";

// The kuhi machine's tunnel address changes on restart, so it publishes the
// current one to Supabase (app_config) and the site looks it up at runtime.
// The build-time value is only a fallback, or what local dev uses.
let KUHI_API_URL = BUILD_KUHI_URL;
let basePromise: Promise<string> | null = null;
const BASE_CACHE_KEY = "kuhi-base-url";
const BASE_CACHE_MS = 2 * 60 * 1000;

function isLocal(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
}

async function lookUpKuhiBase(): Promise<string> {
  if (typeof window === "undefined") return BUILD_KUHI_URL;
  // local dev talks to the local kuhi directly
  if (isLocal(BUILD_KUHI_URL) && ["localhost", "127.0.0.1"].includes(location.hostname)) {
    return BUILD_KUHI_URL;
  }
  try {
    const cached = JSON.parse(sessionStorage.getItem(BASE_CACHE_KEY) ?? "null");
    if (cached && Date.now() - cached.savedAt < BASE_CACHE_MS) return cached.url;
  } catch {}

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return BUILD_KUHI_URL;
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/app_config?key=eq.kuhi_api_url&select=value`,
      { headers: { apikey: key }, signal: AbortSignal.timeout(2500) }
    );
    const rows: { value: string }[] = response.ok ? await response.json() : [];
    const url = rows[0]?.value;
    if (!url) return BUILD_KUHI_URL;
    try {
      sessionStorage.setItem(BASE_CACHE_KEY, JSON.stringify({ url, savedAt: Date.now() }));
    } catch {}
    return url;
  } catch {
    return BUILD_KUHI_URL;
  }
}

// resolves the kuhi address once per page; call before building any kuhi URL
export function resolveKuhiBase(): Promise<string> {
  basePromise ??= lookUpKuhiBase().then((url) => (KUHI_API_URL = url));
  return basePromise;
}

// after a failed request: look the address up again next time
export function forgetKuhiBase() {
  basePromise = null;
  try {
    sessionStorage.removeItem(BASE_CACHE_KEY);
  } catch {}
}

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
