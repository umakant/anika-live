#!/usr/bin/env bash
# Fix FFmpeg snap/PM2 conflict — install apt version instead.
set -euo pipefail

echo "Removing snap FFmpeg (breaks PM2/Node)..."
sudo snap remove ffmpeg 2>/dev/null || true

echo "Installing FFmpeg from apt..."
sudo apt update
sudo apt install -y ffmpeg

echo ""
echo "FFmpeg path: $(which ffmpeg)"
ffmpeg -version | head -n 1

ENV_FILE="${1:-/var/www/apps/anika-live/.env}"
if [[ -f "$ENV_FILE" ]]; then
  if ! grep -q "^FFMPEG_PATH=" "$ENV_FILE"; then
    echo "FFMPEG_PATH=/usr/bin/ffmpeg" >> "$ENV_FILE"
    echo "FFPROBE_PATH=/usr/bin/ffprobe" >> "$ENV_FILE"
    echo "Added FFMPEG_PATH to $ENV_FILE"
  fi
fi

echo ""
echo "Done. Restart app: pm2 restart anika-live-studio --update-env"
