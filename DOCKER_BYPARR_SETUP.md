# 🐳 Docker + Byparr Setup Guide

## Step 1: Install Docker Desktop

### Download and Install
1. Go to: https://www.docker.com/products/docker-desktop/
2. Download **Docker Desktop for Windows**
3. Run the installer
4. Follow the installation wizard
5. **Restart your computer** when prompted

### Verify Installation
After restart, open PowerShell or Git Bash and run:
```bash
docker --version
```

You should see something like:
```
Docker version 24.x.x, build xxxxx
```

---

## Step 2: Start Byparr Container

### Run Byparr
Open PowerShell or Git Bash and run:
```bash
docker run -d -p 8191:8191 --name byparr ghcr.io/thephaseless/byparr:latest
```

**Explanation:**
- `-d` = Run in background (detached mode)
- `-p 8191:8191` = Map port 8191 from container to your machine
- `--name byparr` = Give the container a name for easy management
- `ghcr.io/thephaseless/byparr:latest` = The Byparr image

### Verify Byparr is Running
```bash
docker ps
```

You should see:
```
CONTAINER ID   IMAGE                             STATUS         PORTS
xxxxx          ghcr.io/thephaseless/byparr:...   Up X minutes   0.0.0.0:8191->8191/tcp
```

### Test Byparr API
```bash
curl http://localhost:8191/docs
```

You should see the Byparr API documentation page.

---

## Step 3: I'll Update Your Code

Once Byparr is running, let me know and I'll:

1. ✅ Update `src/lib/providers/animepahe-fixed.ts` to use Byparr
2. ✅ Configure the API routes to proxy through Byparr
3. ✅ Test the streaming endpoints
4. ✅ Verify video playback works

---

## Byparr Management Commands

### Check Status
```bash
docker ps
```

### View Logs
```bash
docker logs byparr
```

### Stop Byparr
```bash
docker stop byparr
```

### Start Byparr (after stopping)
```bash
docker start byparr
```

### Remove Byparr (if you need to reinstall)
```bash
docker stop byparr
docker rm byparr
```

### Restart Byparr
```bash
docker restart byparr
```

---

## Expected Results After Setup

Once Docker + Byparr is configured and I update your code:

### ✅ Search will work:
```bash
curl "http://localhost:3000/api/anime/search?query=naruto"
```

**Expected response:**
```json
{
  "currentPage": 1,
  "hasNextPage": true,
  "results": [
    {
      "id": "naruto-123",
      "title": "Naruto",
      "image": "https://animepahe.pw/...",
      "type": "TV"
    }
  ]
}
```

### ✅ Video sources will work:
```bash
curl "http://localhost:3000/api/anime/watch?episodeId=EPISODE_ID"
```

**Expected response:**
```json
{
  "sources": [
    {
      "url": "https://video-cdn.com/stream.m3u8",
      "quality": "1080p",
      "isM3U8": true
    }
  ]
}
```

### ✅ UI will work:
1. Open http://localhost:3000
2. Search for anime (e.g., "Naruto")
3. Click an anime card
4. Click an episode
5. **Video player will show actual streaming video** 🎉
6. Badge will show "🟢 Consumet" confirming it's working

---

## Troubleshooting

### Docker daemon not running
```bash
# Windows: Open Docker Desktop application
# It should start automatically
```

### Port 8191 already in use
```bash
# Find what's using port 8191
netstat -ano | findstr :8191

# Or use a different port
docker run -d -p 8192:8191 --name byparr ghcr.io/thephaseless/byparr:latest
# (Then I'll update the code to use 8192)
```

### Byparr not responding
```bash
# Check logs
docker logs byparr

# Restart container
docker restart byparr
```

### Permission issues
```bash
# Run PowerShell as Administrator
# Then try docker commands again
```

---

## What Happens Behind the Scenes

### Without Byparr:
```
Your API → AnimePahe.pw → ❌ Cloudflare Challenge Page
```

### With Byparr:
```
Your API → Byparr (localhost:8191) → Solves Cloudflare → AnimePahe.pw → ✅ Anime Data
                ↓
         (Real Chrome browser)
```

Byparr uses a real Chromium browser to:
1. Visit the AnimePahe website
2. Solve the Cloudflare JavaScript challenge
3. Get valid cookies and tokens
4. Return them to your API
5. Your API uses those cookies for subsequent requests

---

## Next Steps

1. **Install Docker Desktop** (download link above)
2. **Restart your computer**
3. **Run Byparr container** (command above)
4. **Tell me when it's running** → I'll update the code
5. **Test streaming** → Videos will work! 🎬

---

## Time Estimate

- Docker Desktop installation: ~5-10 minutes
- Computer restart: ~2-3 minutes
- Byparr container pull + start: ~1-2 minutes
- Code updates (by me): ~5 minutes
- Testing: ~2 minutes

**Total: ~20 minutes** until you have working video streaming! 🚀

---

Let me know when you have Docker running and Byparr container started, and I'll immediately update your code to use it!
