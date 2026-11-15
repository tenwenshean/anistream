"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { Loader2, Play } from "lucide-react";
import {
  KUHI_PROVIDER,
  forgetKuhiBase,
  resolveKuhiBase,
  kuhiExtractUrl,
  kuhiProxyUrl,
  kuhiSubtitleUrl,
  type KuhiExtract,
  type KuhiStream,
  type KuhiSubtitle,
} from "@/lib/api/kuhi";
import {
  getBestProgress,
  saveLocalProgress,
  saveRemoteProgress,
  type AnimeMeta,
  type Progress,
} from "@/lib/library";

// start looking up kuhi's address as soon as the player code loads
if (typeof window !== "undefined") void resolveKuhiBase();

interface KuhiPlayerProps {
  anilistId: number | null;
  episode: number;
  anime: AnimeMeta;
  // pre-loaded near the end of this one so it starts straight away
  nextEpisode: number | null;
}

type Audio = "sub" | "dub";

interface SubtitleTrack {
  src: string;
  label: string;
  srclang: string;
  default: boolean;
}

// a stream that never buffers a fragment counts as dead
const STREAM_TIMEOUT_MS = 15000;
const AUDIO_STORAGE_KEY = "anistream-audio";

// mp4 results from anikoto are download pages, not playable video
const isPlayable = (s: KuhiStream) => s.type === "hls" || s.type === "embed";
const hasPlayable = (extract: KuhiExtract | null | undefined) =>
  Boolean(extract?.streams?.some(isPlayable));

// several servers carry the same subtitle file: keep one per language,
// preferring the copy from the server that is playing
function pickSubtitles(subtitles: KuhiSubtitle[], server?: string): KuhiSubtitle[] {
  const byLabel = new Map<string, KuhiSubtitle>();
  for (const sub of subtitles) {
    if (!sub.url) continue;
    const current = byLabel.get(sub.label);
    if (!current || (sub.source === server && current.source !== server)) {
      byLabel.set(sub.label, sub);
    }
  }
  return [...byLabel.values()];
}

function readSavedAudio(): Audio {
  try {
    return localStorage.getItem(AUDIO_STORAGE_KEY) === "dub" ? "dub" : "sub";
  } catch {
    return "sub";
  }
}

function saveAudio(audio: Audio) {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, audio);
  } catch {
    // private windows can block storage; the choice just isn't remembered
  }
}

// kuhi takes several seconds to find an episode's streams; keeping the answer
// for a few minutes makes going back, and the pre-loaded next episode, instant
const EXTRACT_CACHE_MS = 10 * 60 * 1000;
const extractCacheKey = (anilistId: number, episode: number, lang: Audio) =>
  `kuhi-extract:${anilistId}:${episode}:${lang}`;

function readCachedExtract(key: string): KuhiExtract | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw);
    if (Date.now() - savedAt < EXTRACT_CACHE_MS) return data;
    sessionStorage.removeItem(key);
  } catch {
    // storage blocked: just ask kuhi again
  }
  return null;
}

function dropCachedExtract(anilistId: number, episode: number, lang: Audio) {
  try {
    sessionStorage.removeItem(extractCacheKey(anilistId, episode, lang));
  } catch {}
}

async function fetchExtract(
  anilistId: number,
  episode: number,
  lang: Audio
): Promise<KuhiExtract | null> {
  // the video and subtitle URLs built later need the address too
  await resolveKuhiBase();
  const key = extractCacheKey(anilistId, episode, lang);
  const cached = readCachedExtract(key);
  if (cached) return cached;
  try {
    const response = await fetch(kuhiExtractUrl(anilistId, episode, lang, KUHI_PROVIDER)).catch(
      (error) => {
        // kuhi unreachable: its address may have changed since it was looked up
        forgetKuhiBase();
        throw error;
      }
    );
    if (!response.ok) return null;
    const data: KuhiExtract = await response.json();
    if (hasPlayable(data)) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {}
    }
    return data;
  } catch {
    return null;
  }
}

// the server that worked last time is tried first, skipping dead ones
const SERVER_STORAGE_KEY = "anistream-server";

function readPreferredServer(): string | null {
  try {
    return localStorage.getItem(SERVER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function savePreferredServer(server?: string) {
  if (!server) return;
  try {
    localStorage.setItem(SERVER_STORAGE_KEY, server);
  } catch {}
}

// never let a slow lookup hold up the video
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function KuhiPlayer({ anilistId, episode, anime, nextEpisode }: KuhiPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // null until the saved choice is read, so nothing loads twice
  const [audio, setAudio] = useState<Audio | null>(null);
  const [available, setAvailable] = useState<Record<Audio, boolean | null>>({
    sub: null,
    dub: null,
  });
  const [status, setStatus] = useState("Finding stream...");
  const [note, setNote] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  // true once the viewer clicks Dub on this episode, rather than it being
  // their remembered choice from an earlier episode
  const pickedDub = useRef(false);

  // clears the old language's video before the other one loads
  const switchAudio = (option: Audio) => {
    setPlaying(false);
    setFailed(false);
    setEmbedUrl(null);
    setTracks([]);
    setAudio(option);
  };

  // each language is asked for once; the availability check and the
  // player share the same request
  const extracts = useRef(new Map<Audio, Promise<KuhiExtract | null>>());
  const getExtract = useCallback(
    (lang: Audio) => {
      let request = extracts.current.get(lang);
      if (!request) {
        request = anilistId ? fetchExtract(anilistId, episode, lang) : Promise.resolve(null);
        extracts.current.set(lang, request);
      }
      return request;
    },
    [anilistId, episode]
  );

  useEffect(() => {
    setAudio(readSavedAudio());
  }, []);

  // sub first, then check whether a dub exists
  useEffect(() => {
    if (!anilistId) return;
    let cancelled = false;
    (async () => {
      const sub = await getExtract("sub");
      if (cancelled) return;
      setAvailable((a) => ({ ...a, sub: hasPlayable(sub) }));
      const dub = await getExtract("dub");
      if (cancelled) return;
      setAvailable((a) => ({ ...a, dub: hasPlayable(dub) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [anilistId, getExtract]);

  useEffect(() => {
    if (!anilistId || !audio) return;

    let cancelled = false;
    const player: { hls: Hls | null } = { hls: null };
    const blobUrls: string[] = [];

    // resolves true once the stream buffers its first fragment
    const tryHls = (HlsClass: typeof Hls, stream: KuhiStream, startAt: number) =>
      new Promise<boolean>((resolve) => {
        const video = videoRef.current;
        if (!video) return resolve(false);
        player.hls?.destroy();
        const instance = new HlsClass({
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 2,
          // hls.js buffers up to 10 minutes ahead by default; 1 minute keeps
          // playback smooth at a fraction of the memory
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          backBufferLength: 30,
          // resuming loads the right part of the video first, not the start
          startPosition: startAt > 0 ? startAt : -1,
        });
        player.hls = instance;
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(ok);
        };
        const timer = setTimeout(() => finish(false), STREAM_TIMEOUT_MS);
        instance.on(HlsClass.Events.FRAG_BUFFERED, () => finish(true));
        instance.on(HlsClass.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          if (settled && data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
            instance.recoverMediaError();
            return;
          }
          finish(false);
        });
        instance.loadSource(kuhiProxyUrl(stream));
        instance.attachMedia(video);
      });

    // the videos are raw, so the subtitles come as separate .vtt files
    const loadSubtitles = async (extract: KuhiExtract, stream: KuhiStream) => {
      const streams = extract.streams ?? [];
      const picked = pickSubtitles(extract.subtitles ?? [], stream.server);
      const loaded = await Promise.all(
        picked.map(async (sub): Promise<SubtitleTrack | null> => {
          const referer =
            streams.find((s) => s.server === sub.source && s.referer)?.referer ??
            stream.referer ??
            "";
          try {
            const response = await fetch(kuhiSubtitleUrl(sub, referer));
            if (!response.ok) return null;
            const text = await response.text();
            if (!text.includes("-->")) return null;
            const src = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
            blobUrls.push(src);
            return { src, label: sub.label, srclang: sub.srclang, default: Boolean(sub.default) };
          } catch {
            return null;
          }
        })
      );
      const found = loaded.filter((t): t is SubtitleTrack => t !== null);
      // exactly one track starts switched on
      const defaultIndex = Math.max(0, found.findIndex((t) => t.default));
      return found.map((t, i) => ({ ...t, default: i === defaultIndex }));
    };

    (async () => {
      setStatus(audio === "dub" ? "Finding dub..." : "Finding stream...");
      // load the player library while kuhi looks up the episode
      // where the viewer stopped is looked up alongside; it is far quicker
      // than the stream lookup, and capped so it can never delay the video
      const [{ default: HlsClass }, extract, progress] = await Promise.all([
        import("hls.js"),
        getExtract(audio),
        withTimeout<Progress | null>(getBestProgress(anime), 1500, null),
      ]);
      if (cancelled) return;

      if (!extract || !hasPlayable(extract)) {
        if (audio === "dub") {
          if (!pickedDub.current) {
            // dub was only remembered from an earlier episode
            setNote("No dub for this episode, playing sub");
            switchAudio("sub");
            return;
          }
          setFailed(true);
          setStatus(`Dub not available for episode ${episode}.`);
          return;
        }
        // some titles exist only dubbed (Digimon tri. Loss)
        if (hasPlayable(await getExtract("dub"))) {
          if (cancelled) return;
          setNote("Sub not available, playing dub");
          switchAudio("dub");
          return;
        }
        if (cancelled) return;
        setFailed(true);
        setStatus(`No stream found for episode ${episode}.`);
        return;
      }

      const streams = extract.streams;
      const fallbackEmbed = streams.find((s) => s.type === "embed")?.url ?? null;
      // anikoto lists the same playlist under several server names
      const preferred = readPreferredServer();
      const hlsStreams = streams
        .filter((s, i) => s.type === "hls" && streams.findIndex((o) => o.url === s.url) === i)
        .sort((a, b) => Number(b.server === preferred) - Number(a.server === preferred));

      const resumeAt =
        progress &&
        progress.episode === episode &&
        progress.position > 15 &&
        (!progress.duration || progress.position < progress.duration - 60)
          ? progress.position
          : 0;

      if (HlsClass.isSupported()) {
        for (const stream of hlsStreams) {
          if (cancelled) return;
          setStatus("Loading video...");
          if (await tryHls(HlsClass, stream, resumeAt)) {
            if (cancelled) return;
            setPlaying(true);
            savePreferredServer(stream.server);
            const server = [
              stream.server ? `Server: ${stream.server}` : "",
              resumeAt ? `Resumed at ${formatTime(resumeAt)}` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            setStatus(server);
            // dub audio is already English
            if (audio === "sub") {
              const found = await loadSubtitles(extract, stream);
              if (cancelled) return;
              setTracks(found);
              setStatus(
                [server, found.length ? `${found[0].label} subtitles` : "No subtitles found"]
                  .filter(Boolean)
                  .join(" · ")
              );
            }
            return;
          }
        }
      }

      if (cancelled) return;
      player.hls?.destroy();
      player.hls = null;
      // the saved streams may have expired; ask kuhi afresh next time
      dropCachedExtract(anilistId, episode, audio);
      if (fallbackEmbed) {
        // the backup player shows its own subtitles
        setEmbedUrl(fallbackEmbed);
        setStatus("Showing backup player");
      } else {
        setFailed(true);
        setStatus(`No stream found for episode ${episode}.`);
      }
    })();

    return () => {
      cancelled = true;
      player.hls?.destroy();
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [anilistId, episode, audio, getExtract, anime]);

  // remember where the viewer is: on this device every few seconds, on their
  // account every 30 seconds and whenever they pause or leave
  useEffect(() => {
    const video = videoRef.current;
    if (!playing || !video || !audio) return;
    let lastLocal = 0;
    let lastRemote = 0;
    let prefetched = false;

    const save = (remote: boolean) => {
      if (video.currentTime < 1) return;
      const progress: Progress = {
        ...anime,
        episode,
        position: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : null,
        updatedAt: Date.now(),
      };
      saveLocalProgress(progress);
      if (remote) void saveRemoteProgress(progress);
    };

    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastLocal >= 5000) {
        lastLocal = now;
        const remote = now - lastRemote >= 30000;
        if (remote) lastRemote = now;
        save(remote);
      }
      // near the end, look up the next episode so it starts at once
      if (
        !prefetched &&
        nextEpisode &&
        anilistId &&
        video.duration &&
        video.currentTime / video.duration > 0.85
      ) {
        prefetched = true;
        void fetchExtract(anilistId, nextEpisode, audio);
      }
    };
    const saveNow = () => save(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save(true);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", saveNow);
    video.addEventListener("ended", saveNow);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", saveNow);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", saveNow);
      video.removeEventListener("ended", saveNow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", saveNow);
      save(true);
    };
  }, [playing, audio, anilistId, episode, nextEpisode, anime]);

  function choose(option: Audio) {
    if (option === audio) return;
    pickedDub.current = option === "dub";
    saveAudio(option);
    setNote("");
    switchAudio(option);
  }

  if (!anilistId) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-6 text-center text-sm text-neutral-400 shadow-2xl">
        This anime isn&apos;t on AniList, so no stream could be found.
      </div>
    );
  }

  const searching = !playing && !embedUrl && !failed;
  const footer = [note, status].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-6 shadow-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Watch</h2>
        <div className="flex rounded-xl border border-neutral-800 bg-neutral-950 p-1">
          {(["sub", "dub"] as const).map((option) => {
            const unavailable = available[option] === false;
            const checking = available[option] === null && option === "dub";
            return (
              <button
                key={option}
                type="button"
                onClick={() => choose(option)}
                disabled={unavailable}
                title={unavailable ? `${option === "sub" ? "Sub" : "Dub"} not available` : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                  audio === option
                    ? "bg-purple-500 text-white"
                    : unavailable
                      ? "cursor-not-allowed text-neutral-600"
                      : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {option === "sub" ? "Sub" : "Dub"}
                {unavailable && <span className="text-xs font-normal">· not available</span>}
                {checking && <Loader2 className="h-3 w-3 animate-spin opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            controls
            className={`h-full w-full ${playing ? "" : "invisible"}`}
          >
            {tracks.map((track) => (
              <track
                key={track.src}
                kind="subtitles"
                src={track.src}
                label={track.label}
                srcLang={track.srclang}
                default={track.default}
                // tracks added after load aren't always switched on by the
                // default attribute; the CC menu can still turn it off
                ref={(el) => {
                  if (el && track.default) el.track.mode = "showing";
                }}
              />
            ))}
          </video>
        )}

        {searching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <p className="text-sm text-neutral-400">{status}</p>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="rounded-full bg-neutral-800 p-6">
              <Play className="h-12 w-12 text-neutral-600" />
            </div>
            <p className="max-w-md text-sm text-neutral-400">{status}</p>
          </div>
        )}
      </div>

      {(playing || embedUrl) && <p className="mt-3 text-xs text-neutral-500">{footer}</p>}
    </div>
  );
}
