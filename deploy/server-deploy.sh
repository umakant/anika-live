#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/apps/anika-live"

mkdir -p "$APP_DIR/live-data"/{videos,processed,data}

cat > "$APP_DIR/.env" << 'EOF'
ADMIN_PASSWORD=developer@123web
AUTH_SECRET=6646693c7134019f7b39ab17a715640e14c634c41bccfed21dc05bb5fc7ad56a
LIVE_DATA_ROOT=/var/www/apps/anika-live/live-data
PORT=3010
HOSTNAME=0.0.0.0

CLOUDINARY_URL=cloudinary://836594361147136:u_SDvwb_s5lqcgrxbBWkW1Y6rf4@dlyaexxhi
CLOUDINARY_FOLDER=anika-live/videos
CLOUDINARY_UPLOAD_PRESET=anika_live_unsigned
EOF

chmod 600 "$APP_DIR/.env"

cd "$APP_DIR"
git pull
npm ci
npm run build

echo "Setting up Cloudinary upload preset..."
if node deploy/setup-cloudinary-preset.mjs; then
  echo "Cloudinary preset OK."
else
  echo ""
  echo "Preset script failed — create preset manually in Cloudinary dashboard (see instructions above)."
  echo "Then run: pm2 restart anika-live-studio"
fi

pm2 delete anika-live-studio 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

pm2 status | grep anika || true
echo "Deploy complete."
