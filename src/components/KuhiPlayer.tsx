"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { Loader2, Play } from "lucide-react";
import {
  KUHI_PROVIDER,
  kuhiExtractUrl,
  kuhiProxyUrl,
  type KuhiExtract,
  type KuhiStream,
} from "@/lib/api/kuhi";

interface KuhiPlayerProps {
  anilistId: number | null;
  episode: number;
}

type Audio = "sub" | "dub";

// a stream that never buffers a fragment counts as dead
const STREAM_TIMEOUT_MS = 15000;

export default function KuhiPlayer({ anilistId, episode }: KuhiPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audio, setAudio] = useState<Audio>("sub");
  const [status, setStatus] = useState("Finding stream...");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!anilistId) {
      setFailed(true);
      setStatus("This anime isn't on AniList, so no stream could be found.");
      return;
    }

    let cancelled = false;
    const player: { hls: Hls | null } = { hls: null };
    const controller = new AbortController();

    setPlaying(false);
    setFailed(false);
    setEmbedUrl(null);

    // resolves true once the stream buffers its first fragment
    const tryHls = (HlsClass: typeof Hls, stream: KuhiStream) =>
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

    const fetchStreams = async (lang: Audio): Promise<KuhiStream[]> => {
      try {
        const response = await fetch(kuhiExtractUrl(anilistId, episode, lang, KUHI_PROVIDER), {
          signal: controller.signal,
        });
        if (!response.ok) return [];
        const data: KuhiExtract = await response.json();
        return data.streams ?? [];
      } catch {
        return [];
      }
    };

    // mp4 results from anikoto are download pages, not playable video
    const isPlayable = (s: KuhiStream) => s.type === "hls" || s.type === "embed";

    (async () => {
      setStatus("Finding stream...");
      // load the player library while kuhi looks up the episode
      const [{ default: HlsClass }, firstStreams] = await Promise.all([
        import("hls.js"),
        fetchStreams(audio),
      ]);
      if (cancelled) return;
      let streams = firstStreams;

      // some titles exist in only one language (Digimon tri. Loss is dub-only)
      let note = "";
      if (!streams.some(isPlayable)) {
        const other: Audio = audio === "sub" ? "dub" : "sub";
        const otherStreams = await fetchStreams(other);
        if (cancelled) return;
        if (otherStreams.some(isPlayable)) {
          streams = otherStreams;
          note = `${audio === "sub" ? "Sub" : "Dub"} not available, playing ${other}`;
        }
      }

      const fallbackEmbed = streams.find((s) => s.type === "embed")?.url ?? null;
      // anikoto lists the same playlist under several server names
      const hlsStreams = streams.filter(
        (s, i) => s.type === "hls" && streams.findIndex((o) => o.url === s.url) === i
      );

      if (HlsClass.isSupported()) {
        for (const stream of hlsStreams) {
          if (cancelled) return;
          setStatus("Loading video...");
          if (await tryHls(HlsClass, stream)) {
            if (cancelled) return;
            setPlaying(true);
            setStatus(
              [note, stream.server ? `Server: ${stream.server}` : ""].filter(Boolean).join(" · ")
            );
            return;
          }
        }
      }

      if (cancelled) return;
      player.hls?.destroy();
      player.hls = null;
      if (fallbackEmbed) {
        setEmbedUrl(fallbackEmbed);
        setStatus(note ? `${note} · backup player` : "Showing backup player");
      } else {
        setFailed(true);
        setStatus(`No stream found for episode ${episode}.`);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      player.hls?.destroy();
    };
  }, [anilistId, episode, audio]);

  const searching = !playing && !embedUrl && !failed;

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Watch</h2>
        <div className="flex gap-2">
          {(["sub", "dub"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setAudio(option)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                audio === option
                  ? "bg-purple-500 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {option}
            </button>
          ))}
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
          />
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

      {(playing || embedUrl) && <p className="mt-3 text-xs text-neutral-500">{status}</p>}
    </div>
  );
}
