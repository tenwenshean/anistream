'use client';

import { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  message?: string;
  showTimer?: boolean;
}

export default function LoadingIndicator({
  message = 'Loading...',
  showTimer = false
}: LoadingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!showTimer) return;

    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-700">{message}</p>
        {showTimer && elapsed > 0 && (
          <p className="text-sm text-gray-500">
            {elapsed}s elapsed
            {elapsed > 10 && elapsed < 30 && ' - Bypassing Cloudflare...'}
            {elapsed >= 30 && ' - Almost there...'}
          </p>
        )}
      </div>

      {/* Progress hints */}
      {showTimer && (
        <div className="text-xs text-gray-400 text-center max-w-md">
          {elapsed < 10 && '⏳ Connecting to AnimePahe...'}
          {elapsed >= 10 && elapsed < 30 && '🔓 Solving Cloudflare challenge (this takes 20-60s on first request)'}
          {elapsed >= 30 && elapsed < 60 && '⚡ Processing response...'}
          {elapsed >= 60 && '🚀 Loading results (cached requests will be much faster!)'}
        </div>
      )}
    </div>
  );
}
