#!/usr/bin/env bash
# CurXor OS — ensure per-app FRE state directory exists with dashboard write access.
# Used by install-all.sh, post-update.sh, and patch-app-fre-dir.sh.
set -euo pipefail

APP_FRE_DIR="${CURXOR_APP_FRE_DIR:-/etc/curxor/app-fre}"
CURXOR_USER="${CURXOR_USER:-curxor}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if ! id "${CURXOR_USER}" &>/dev/null; then
  useradd --system --home /var/lib/curxor --shell /usr/sbin/nologin "${CURXOR_USER}"
fi

mkdir -p "${APP_FRE_DIR}"
chmod 755 "${APP_FRE_DIR}"
chown -R "${CURXOR_USER}:${CURXOR_USER}" "${APP_FRE_DIR}"

echo "[ensure-app-fre-dir] ${APP_FRE_DIR} ready (${CURXOR_USER}:${CURXOR_USER}, mode 755)"
