#!/bin/bash

echo "🚀 Starting AniStream with Byparr optimization..."

# Check if Byparr is running
echo "📡 Checking Byparr status..."
if ! docker ps | grep -q byparr; then
  echo "❌ Byparr container is not running!"
  echo "Starting Byparr..."
  docker start byparr 2>/dev/null || docker run -d -p 8191:8191 --name byparr ghcr.io/thephaseless/byparr:latest
  sleep 5
fi

echo "✅ Byparr is running"

# Start Next.js dev server in background
echo "🔧 Starting Next.js development server..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if curl -s http://localhost:3000 > /dev/null; then
  echo "✅ Server is running on http://localhost:3000"
else
  echo "❌ Server failed to start"
  exit 1
fi

# Warm up the cache
echo "🔥 Warming up Byparr cache (this takes 30-90 seconds)..."
echo "   This will make subsequent requests much faster!"

WARMUP_START=$(date +%s)
curl -s -X POST http://localhost:3000/api/byparr/warmup > /tmp/warmup.json
WARMUP_END=$(date +%s)
WARMUP_DURATION=$((WARMUP_END - WARMUP_START))

if grep -q '"success":true' /tmp/warmup.json 2>/dev/null; then
  echo "✅ Cache warmed up successfully in ${WARMUP_DURATION}s"

  # Show cache stats
  echo ""
  echo "📊 Cache statistics:"
  curl -s http://localhost:3000/api/byparr/stats | jq '.'

  echo ""
  echo "🎉 AniStream is ready!"
  echo ""
  echo "📝 Quick links:"
  echo "   • Frontend: http://localhost:3000"
  echo "   • Test search: http://localhost:3000/api/anime/search?query=naruto"
  echo "   • Cache stats: http://localhost:3000/api/byparr/stats"
  echo "   • Byparr health: http://localhost:8191/health"
  echo ""
  echo "⚡ Tip: Cached requests will be 30x faster (1-3s vs 30-90s)"
  echo ""
else
  echo "⚠️  Cache warmup failed, but server is running"
  echo "   First requests will take 30-90 seconds"
fi

# Keep the script running
echo "Press Ctrl+C to stop the server"
wait $DEV_PID
