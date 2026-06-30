#!/usr/bin/env bash
# One-shot: install Linux Next SWC from /tmp tarballs + offline pnpm build + restart dashboard.
set -euo pipefail

NEXT_VERSION="${1:-15.5.19}"
ROOT="/opt/curxor/pillar-4-dashboard"
CURXOR_USER="${CURXOR_USER:-curxor}"

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo" >&2; exit 1; }

mkdir -p "${ROOT}/node_modules/@next"
resolve_swc_tgz() {
  local spec="$1"
  local candidates=(
    "/tmp/next-${spec}-${NEXT_VERSION}.tgz"
    "/tmp/${spec}-${NEXT_VERSION}.tgz"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -f "${c}" ]]; then
      echo "${c}"
      return 0
    fi
  done
  echo "missing SWC tarball for ${spec} (tried: ${candidates[*]})" >&2
  return 1
}

for spec in swc-linux-x64-gnu swc-wasm-nodejs; do
  tgz="$(resolve_swc_tgz "${spec}")"
  rm -rf "${ROOT}/node_modules/@next/${spec}" /tmp/curxor-swc-extract
  mkdir -p /tmp/curxor-swc-extract
  tar -xzf "${tgz}" -C /tmp/curxor-swc-extract
  mv /tmp/curxor-swc-extract/package "${ROOT}/node_modules/@next/${spec}"
  echo "==> installed @next/${spec}"
done
rm -rf /tmp/curxor-swc-extract

find "${ROOT}/node_modules/.bin" -type f -exec chmod +x {} + 2>/dev/null || true
chown -R "${CURXOR_USER}:${CURXOR_USER}" "${ROOT}/node_modules/@next"

echo "==> pnpm build (5-8 min, offline)"
sudo -u "${CURXOR_USER}" bash -c "cd '${ROOT}' && pnpm build"

echo "==> restart curxor-dashboard"
systemctl restart curxor-dashboard
sleep 2
if curl -sf http://127.0.0.1:3080/api/setup/status; then
  echo ""
  echo "==> dashboard OK"
else
  echo "==> dashboard not responding yet — check: journalctl -u curxor-dashboard -n 30 --no-pager" >&2
  exit 1
fi
