"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, ExternalLink } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  episodeId?: string; // AnimePahe episode ID for iframe embed
  onEnded?: () => void;
}

export default function VideoPlayer({ src, poster, title, episodeId, onEnded }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(false);

  useEffect(() => {
    // If src is a Kwik URL or we have episodeId, use iframe embed
    if (src.includes('kwik.cx') || episodeId) {
      console.log('[VideoPlayer] Using iframe embed for AnimePahe player');
      setUseIframe(true);
      setIsLoading(false);
    } else {
      console.log('[VideoPlayer] Using direct video URL:', src.substring(0, 60));
      setUseIframe(false);
    }
  }, [src, episodeId]);

  const handleIframeLoad = () => {
    console.log('[VideoPlayer] Iframe loaded successfully');
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    console.error('[VideoPlayer] Iframe failed to load');
    setIsLoading(false);
    setError("Failed to load video player. Try opening in a new tab.");
  };

  // If using iframe embed
  if (useIframe) {
    // Construct AnimePahe embed URL
    const embedUrl = episodeId
      ? `https://animepahe.pw/play/${episodeId}`
      : src;

    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 gap-4 p-6">
            <div className="text-red-400 text-lg font-semibold">Playback Error</div>
            <p className="text-sm text-neutral-400 max-w-md text-center">{error}</p>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        )}

        {title && !error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
            <div className="text-sm font-semibold text-white">{title}</div>
          </div>
        )}
      </div>
    );
  }

  // Fallback to direct video (if we ever get real URLs)
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
      <div className="text-center space-y-4 p-6">
        <Play className="w-16 h-16 text-neutral-600 mx-auto" />
        <div className="space-y-2">
          <p className="text-neutral-400 text-sm">Direct video playback not available</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Watch on AnimePahe
          </a>
        </div>
      </div>
    </div>
  );
}
