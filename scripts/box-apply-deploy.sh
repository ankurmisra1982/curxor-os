#!/usr/bin/env bash
# Apply a laptop deploy tarball on the MS-S1 box. Run ON THE BOX with sudo.
# Safe: refuses to rsync into /opt/curxor unless extracted payload looks valid.
# CRLF: self-heals this file; also strips all *.sh under /opt/curxor via sed -i 's/\r$//'
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

REMOTE_TAR="${1:-/tmp/curxor-deploy.tar.gz}"
REMOTE_TMP="${2:-/tmp/curxor-os}"
REMOTE_OPT="${3:-/opt/curxor}"

die() { echo "box-apply-deploy: $*" >&2; exit 1; }

[[ -f "${REMOTE_TAR}" ]] || die "missing tarball: ${REMOTE_TAR} (run deploy-to-box.ps1 from laptop first)"

echo "==> Extract ${REMOTE_TAR} -> ${REMOTE_TMP}"
rm -rf "${REMOTE_TMP}"
mkdir -p "${REMOTE_TMP}"
tar -xzf "${REMOTE_TAR}" -C "${REMOTE_TMP}"

[[ -f "${REMOTE_TMP}/scripts/post-update.sh" ]] || die "bad payload: ${REMOTE_TMP}/scripts/post-update.sh missing — NOT touching ${REMOTE_OPT}"
[[ -f "${REMOTE_TMP}/pillar-4-dashboard/package.json" ]] || die "bad payload: pillar-4-dashboard missing — NOT touching ${REMOTE_OPT}"

echo "==> Payload OK — rsync -> ${REMOTE_OPT}"
rsync -a --delete "${REMOTE_TMP}/" "${REMOTE_OPT}/"
find "${REMOTE_OPT}" -name '*.sh' -exec sed -i 's/\r$//' {} +

echo "==> post-update (rebuild + restart dashboard)"
bash "${REMOTE_OPT}/scripts/post-update.sh"

echo "==> smoke"
curl -sf http://127.0.0.1:3080/api/setup/status && echo " dashboard OK" || echo "dashboard not ready yet"
systemctl is-active curxor-dashboard.service || true
