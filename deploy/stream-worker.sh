#!/usr/bin/env bash
# Standalone FFmpeg stream worker with auto-restart (optional alternative to in-app stream manager)
set -euo pipefail

LIVE_ROOT="${LIVE_DATA_ROOT:-/var/live/anika}"
PLAYLIST="${PLAYLIST_FILE:-$LIVE_ROOT/playlist.txt}"
LOG_FILE="${LOG_FILE:-$LIVE_ROOT/data/stream-logs.txt}"
RTMP_URL="${RTMP_URL:-rtmp://a.rtmp.youtube.com/live2}"
STREAM_KEY="${YOUTUBE_STREAM_KEY:?Set YOUTUBE_STREAM_KEY}"
RESTART_DELAY="${RESTART_DELAY:-3}"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date -Is)] $*" | tee -a "$LOG_FILE"
}

while true; do
  log "Starting FFmpeg stream loop..."
  ffmpeg -re -stream_loop -1 -f concat -safe 0 -i "$PLAYLIST" \
    -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k \
    -s 1080x1920 -pix_fmt yuv420p -r 30 -g 60 \
    -c:a aac -b:a 128k -ar 44100 \
    -f flv "${RTMP_URL%/}/${STREAM_KEY}" 2>&1 | tee -a "$LOG_FILE" || true

  log "FFmpeg exited. Restarting in ${RESTART_DELAY}s..."
  sleep "$RESTART_DELAY"
done
