#!/usr/bin/env bash
# Apply a laptop deploy tarball on the MS-S1 box. Run ON THE BOX with sudo.
# Safe: refuses to rsync into /opt/curxor unless extracted payload looks valid.
# CRLF: self-heals this file; also strips all *.sh under /opt/curxor via sed -i 's/\r$//'
# After rsync, re-execs from disk (--post-rsync) so post-update/smoke use the new script tree.
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

REMOTE_TAR="${1:-/tmp/curxor-deploy.tar.gz}"
REMOTE_TMP="${2:-/tmp/curxor-os}"
REMOTE_OPT="${3:-/opt/curxor}"

die() { echo "box-apply-deploy: $*" >&2; exit 1; }

install_prebuilt_next() {
  local prebuilt="/tmp/curxor-prebuilt-next.tar.gz"
  [[ -f "${prebuilt}" ]] || return 0

  echo "==> Install prebuilt .next from ${prebuilt}"
  rm -rf "${REMOTE_OPT}/pillar-4-dashboard/.next"
  tar -xzf "${prebuilt}" -C "${REMOTE_OPT}/pillar-4-dashboard"
  if id curxor &>/dev/null; then
    chown -R curxor:curxor "${REMOTE_OPT}/pillar-4-dashboard/.next"
  fi
  export CURXOR_SKIP_DASHBOARD_BUILD=1
  rm -f "${prebuilt}"
}

run_post_rsync() {
  local opt="${1:-/opt/curxor}"
  install_prebuilt_next

  echo "==> post-update (rebuild + restart dashboard)"
  bash "${opt}/scripts/post-update.sh"

  echo "==> smoke"
  if [[ -x "${opt}/scripts/box-smoke.sh" ]]; then
    bash "${opt}/scripts/box-smoke.sh" || true
  else
    curl -sf http://127.0.0.1:3080/api/setup/status && echo " dashboard OK" || echo "dashboard not ready yet"
  fi
  systemctl is-active curxor-dashboard.service || true
}

if [[ "${1:-}" == "--post-rsync" ]]; then
  REMOTE_OPT="${2:-/opt/curxor}"
  run_post_rsync "${REMOTE_OPT}"
  exit 0
fi

[[ -f "${REMOTE_TAR}" ]] || die "missing tarball: ${REMOTE_TAR} (run deploy-to-box.ps1 from laptop first)"

echo "==> Extract ${REMOTE_TAR} -> ${REMOTE_TMP}"
rm -rf "${REMOTE_TMP}"
mkdir -p "${REMOTE_TMP}"
tar -xzf "${REMOTE_TAR}" -C "${REMOTE_TMP}"

[[ -f "${REMOTE_TMP}/scripts/post-update.sh" ]] || die "bad payload: ${REMOTE_TMP}/scripts/post-update.sh missing — NOT touching ${REMOTE_OPT}"
[[ -f "${REMOTE_TMP}/pillar-4-dashboard/package.json" ]] || die "bad payload: pillar-4-dashboard missing — NOT touching ${REMOTE_OPT}"

echo "==> Payload OK — rsync -> ${REMOTE_OPT}"
rsync -a --delete \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude 'dist/' \
  "${REMOTE_TMP}/" "${REMOTE_OPT}/"
find "${REMOTE_OPT}" -name '*.sh' -exec sed -i 's/\r$//' {} +

echo "==> Re-exec from disk (post-rsync)"
exec bash "${REMOTE_OPT}/scripts/box-apply-deploy.sh" --post-rsync "${REMOTE_OPT}"
