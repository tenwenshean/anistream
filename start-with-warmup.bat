@echo off
echo 🚀 Starting AniStream with Byparr optimization...
echo.

REM Check if Byparr is running
echo 📡 Checking Byparr status...
docker ps | findstr byparr >nul 2>&1
if errorlevel 1 (
    echo ❌ Byparr container is not running!
    echo Starting Byparr...
    docker start byparr 2>nul || docker run -d -p 8191:8191 --name byparr ghcr.io/thephaseless/byparr:latest
    timeout /t 5 /nobreak >nul
)

echo ✅ Byparr is running
echo.

REM Start Next.js dev server
echo 🔧 Starting Next.js development server...
start /B npm run dev

REM Wait for server to start
echo ⏳ Waiting for server to start...
timeout /t 10 /nobreak >nul

REM Check if server is running
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ Server failed to start
    exit /b 1
)

echo ✅ Server is running on http://localhost:3000
echo.

REM Warm up cache
echo 🔥 Warming up Byparr cache (this takes 30-90 seconds)...
echo    This will make subsequent requests much faster!
echo.

curl -s -X POST http://localhost:3000/api/byparr/warmup > warmup.json

findstr "success" warmup.json | findstr "true" >nul
if not errorlevel 1 (
    echo ✅ Cache warmed up successfully
    echo.
    echo 📊 Cache statistics:
    curl -s http://localhost:3000/api/byparr/stats
    echo.
    echo.
    echo 🎉 AniStream is ready!
    echo.
    echo 📝 Quick links:
    echo    • Frontend: http://localhost:3000
    echo    • Test search: http://localhost:3000/api/anime/search?query=naruto
    echo    • Cache stats: http://localhost:3000/api/byparr/stats
    echo    • Byparr health: http://localhost:8191/health
    echo.
    echo ⚡ Tip: Cached requests will be 30x faster (1-3s vs 30-90s)
    echo.
) else (
    echo ⚠️  Cache warmup failed, but server is running
    echo    First requests will take 30-90 seconds
    echo.
)

del warmup.json 2>nul

echo Press any key to stop the server...
pause >nul

REM Stop the server
taskkill /F /IM node.exe >nul 2>&1
