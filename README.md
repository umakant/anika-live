# Anika Live Studio

Self-hosted web app for uploading YouTube Shorts/videos, building a looping playlist, and running a 24/7 YouTube Live stream with FFmpeg.

No paid services. No YouTube API. Uses your RTMP stream key from YouTube Studio.

## Features

- **Video upload** — MP4 upload to **Cloudinary** with preview and delete
- **Playlist builder** — drag-and-drop ordering, FFmpeg concat `playlist.txt` generation
- **Video normalization** — converts videos to 1080x1920, 30fps, H.264/AAC before streaming
- **Stream control** — start, stop, restart live stream from the dashboard
- **Auto-restart** — FFmpeg automatically restarts on crash
- **Status dashboard** — uptime, playlist count, current file, CPU/RAM, logs
- **Password login** — admin UI protected by `ADMIN_PASSWORD`

## Tech Stack

- Next.js 15 (App Router)
- Tailwind CSS
- JSON file storage (SQLite-compatible layout, no external DB)
- FFmpeg + ffprobe on Ubuntu
- PM2 or systemd for production

## Local Development (Windows/macOS/Linux)

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set ADMIN_PASSWORD and AUTH_SECRET
npm run dev
```

Open http://localhost:3000 and sign in.

Local data defaults to `./data/live/` (videos, processed, playlist, JSON metadata).

**Note:** FFmpeg must be installed locally for normalization and streaming. Video files are stored in Cloudinary; local cache is created when saving a playlist.

## Cloudinary Setup

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Open the **Dashboard** and copy:
   - Cloud name
   - API Key
   - API Secret
3. Add to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=anika-live/videos
```

Uploaded videos are stored in Cloudinary. When you **Save Playlist**, the app downloads them to the server, normalizes with FFmpeg, and writes `playlist.txt` for live streaming.

## Ubuntu Production Deployment

### 1. Install system dependencies

```bash
sudo apt update
sudo apt install -y curl git ffmpeg build-essential

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 (optional)
sudo npm install -g pm2
```

### 2. Create directories

```bash
sudo mkdir -p /var/live/anika/{videos,processed,data,app}
sudo chown -R $USER:$USER /var/live/anika
```

### 3. Deploy application

```bash
cd /var/live/anika/app
git clone <your-repo-url> .
npm ci
cp .env.example .env
```

Edit `/var/live/anika/app/.env`:

```env
ADMIN_PASSWORD=your-strong-password
AUTH_SECRET=random-32-char-secret
LIVE_DATA_ROOT=/var/live/anika
PORT=3000
HOSTNAME=0.0.0.0
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Build and start:

```bash
npm run build
npm start
```

### 4. Run with PM2 (recommended)

```bash
cd /var/live/anika/app
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

**Important:** Use `instances: 1` so the in-process FFmpeg manager works correctly.

### 5. Run with systemd (alternative)

```bash
sudo cp deploy/anika-live.service /etc/systemd/system/anika-live.service
sudo chown www-data:www-data /var/live/anika -R
sudo systemctl daemon-reload
sudo systemctl enable anika-live
sudo systemctl start anika-live
sudo systemctl status anika-live
```

Ensure the service user can read/write `/var/live/anika` and execute FFmpeg.

### 6. Reverse proxy (recommended)

Put Nginx or Caddy in front and restrict access by IP or VPN. Example Nginx:

```nginx
server {
    listen 80;
    server_name stream.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 500M;
    }
}
```

## YouTube Setup

1. Go to [YouTube Studio](https://studio.youtube.com) → **Create** → **Go live**
2. Copy your **Stream key** (not the watch URL)
3. In Anika Live Studio → **Stream Settings**:
   - RTMP URL: `rtmp://a.rtmp.youtube.com/live2`
   - Paste your stream key
4. Upload videos → build playlist → **Save Playlist**
5. Click **Start Live**

## Directory Layout

```
/var/live/anika/
├── app/                 # Next.js application
├── videos/              # Local cache (downloaded from Cloudinary for FFmpeg)
├── processed/           # Normalized MP4s for streaming
├── playlist.txt         # FFmpeg concat list
└── data/
    ├── videos.json
    ├── playlist.json
    ├── settings.json
    ├── stream-state.json
    └── stream-logs.txt
```

## FFmpeg Commands Used

**Normalization (on playlist save):**

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset medium -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 128k -ar 44100 output.mp4
```

**Live stream:**

```bash
ffmpeg -re -stream_loop -1 -f concat -safe 0 -i /var/live/anika/playlist.txt \
  -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k \
  -s 1080x1920 -pix_fmt yuv420p -r 30 -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -f flv rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY
```

## Standalone Stream Worker (optional)

If you prefer FFmpeg outside the Next.js process:

```bash
chmod +x deploy/stream-worker.sh
YOUTUBE_STREAM_KEY=your-key ./deploy/stream-worker.sh
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Admin login password | `admin` (dev only) |
| `AUTH_SECRET` | Session signing secret | dev fallback |
| `LIVE_DATA_ROOT` | Root data directory | `./data/live` |
| `FFMPEG_PATH` | FFmpeg binary path | `ffmpeg` |
| `FFPROBE_PATH` | ffprobe binary path | `ffprobe` |
| `PORT` | HTTP port | `3000` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | required |
| `CLOUDINARY_FOLDER` | Cloudinary upload folder | `anika-live/videos` |

## Security Notes

- Change default passwords before exposing to the internet
- Use HTTPS via reverse proxy
- Restrict admin access by firewall/VPN
- Stream key is stored locally in `data/settings.json` — protect file permissions

## Troubleshooting

| Issue | Fix |
|-------|-----|
| FFmpeg not found | `sudo apt install ffmpeg` |
| Upload fails | Check Cloudinary credentials; increase `client_max_body_size` in Nginx |
| Stream won't start | Save playlist first; verify stream key in settings |
| High CPU | Lower resolution/bitrate in settings |
| Permission denied on `/var/live/anika` | `sudo chown -R $USER:$USER /var/live/anika` |

## License

MIT
