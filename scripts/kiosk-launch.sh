#!/usr/bin/env bash
# CurXor OS — Chromium kiosk launcher (waits for Flight Command, then fullscreen)
set -euo pipefail

DASHBOARD_URL="${CURXOR_KIOSK_URL:-http://127.0.0.1:3080}"
STATUS_URL="${CURXOR_KIOSK_STATUS_URL:-http://127.0.0.1:3080/api/setup/status}"
WAIT_SEC="${CURXOR_KIOSK_WAIT_SEC:-300}"
CHROMIUM_BIN="${CURXOR_CHROMIUM_BIN:-}"

resolve_chromium() {
  if [[ -n "${CHROMIUM_BIN}" ]] && [[ -x "${CHROMIUM_BIN}" ]]; then
    return 0
  fi
  for candidate in chromium chromium-browser google-chrome-stable google-chrome; do
    if command -v "${candidate}" &>/dev/null; then
      CHROMIUM_BIN="$(command -v "${candidate}")"
      return 0
    fi
  done
  if [[ -x /snap/bin/chromium ]]; then
    CHROMIUM_BIN="/snap/bin/chromium"
    return 0
  fi
  return 1
}

if ! resolve_chromium; then
  echo "curxor-kiosk: no Chromium binary found" >&2
  exit 1
fi

if command -v xset &>/dev/null; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

echo "curxor-kiosk: waiting for ${STATUS_URL} (max ${WAIT_SEC}s)..."
deadline=$((SECONDS + WAIT_SEC))
until curl -sf "${STATUS_URL}" >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "curxor-kiosk: dashboard not ready after ${WAIT_SEC}s — opening ${DASHBOARD_URL} anyway" >&2
    break
  fi
  sleep 2
done

echo "curxor-kiosk: launching ${CHROMIUM_BIN} → ${DASHBOARD_URL}"
# Do not exec — xinitrc restarts this script when Chromium exits.
"${CHROMIUM_BIN}" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  "${DASHBOARD_URL}"
