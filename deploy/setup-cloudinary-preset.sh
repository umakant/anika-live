#!/usr/bin/env bash
# Creates the unsigned Cloudinary upload preset required for browser uploads.
set -euo pipefail

APP_DIR="${1:-/var/www/apps/anika-live}"
ENV_FILE="$APP_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -n "${CLOUDINARY_URL:-}" ]]; then
  CLOUD_NAME=$(echo "$CLOUDINARY_URL" | sed -n 's|.*@\([^/?]*\).*|\1|p')
  API_KEY=$(echo "$CLOUDINARY_URL" | sed -n 's|cloudinary://\([^:]*\):.*|\1|p')
  API_SECRET=$(echo "$CLOUDINARY_URL" | sed -n 's|cloudinary://[^:]*:\([^@]*\)@.*|\1|p')
else
  CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-}"
  API_KEY="${CLOUDINARY_API_KEY:-}"
  API_SECRET="${CLOUDINARY_API_SECRET:-}"
fi

PRESET_NAME="${CLOUDINARY_UPLOAD_PRESET:-anika_live_unsigned}"
FOLDER="${CLOUDINARY_FOLDER:-anika-live/videos}"

if [[ -z "$CLOUD_NAME" || -z "$API_KEY" || -z "$API_SECRET" ]]; then
  echo "Cloudinary credentials missing in $ENV_FILE"
  exit 1
fi

TIMESTAMP=$(date +%s)
STRING_TO_SIGN="folder=${FOLDER}&name=${PRESET_NAME}&timestamp=${TIMESTAMP}&unsigned=true"
SIGNATURE=$(printf '%s' "${STRING_TO_SIGN}${API_SECRET}" | openssl dgst -sha1 | awk '{print $2}')

echo "Creating upload preset '${PRESET_NAME}' on cloud '${CLOUD_NAME}'..."

RESPONSE=$(curl -sS -X POST "https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload_presets" \
  -d "name=${PRESET_NAME}" \
  -d "unsigned=true" \
  -d "folder=${FOLDER}" \
  -d "timestamp=${TIMESTAMP}" \
  -d "api_key=${API_KEY}" \
  -d "signature=${SIGNATURE}")

echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"name"'; then
  echo "Upload preset ready."
elif echo "$RESPONSE" | grep -qi "already exists"; then
  echo "Upload preset already exists."
else
  echo "Failed to create preset. Check credentials and cloud name."
  exit 1
fi
