#!/usr/bin/env bash
# Install ops bridge credentials from a laptop staging dir into /etc/curxor.
# Invoked by post-update.sh --ops-bridge-only (passwordless sudo on box).
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

STAGING="${1:-/tmp/curxor-ops-staging}"
ETC="${CURXOR_ETC:-/etc/curxor}"
CURXOR_USER="${CURXOR_USER:-curxor}"

die() { echo "box-install-ops-bridge: $*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || die "must run as root"

[[ -d "${STAGING}" ]] || die "staging dir missing: ${STAGING}"

install_file() {
  local src="$1"
  local dst="$2"
  [[ -f "${src}" ]] || return 0
  sed -i 's/\r$//' "${src}"
  install -m 600 -o "${CURXOR_USER}" -g "${CURXOR_USER}" "${src}" "${dst}"
  echo "  installed ${dst}"
}

echo "==> box-install-ops-bridge from ${STAGING}"
mkdir -p "${ETC}"

install_file "${STAGING}/ops-digital.env" "${ETC}/digital.env"
install_file "${STAGING}/work-google-oauth.json" "${ETC}/work-google-oauth.json"

rm -rf "${STAGING}"
echo "==> ops bridge files installed"

if systemctl is-active --quiet curxor-dashboard.service; then
  systemctl restart curxor-dashboard.service
  sleep 2
fi

curl -sf "http://127.0.0.1:3080/api/setup/status" >/dev/null && echo "  dashboard OK" || echo "  dashboard not ready yet"
