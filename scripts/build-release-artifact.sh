#!/usr/bin/env bash
# CurXor OS — build OTA release tarball + version manifest (UP1)
#
# Usage:
#   ./scripts/build-release-artifact.sh [version] [output-dir]
#
# Defaults: version from repo root version.json, output-dir ./dist/release
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_DIR="${2:-${REPO_ROOT}/dist/release}"

read_version() {
  if [[ -n "${1:-}" ]]; then
    echo "$1"
    return 0
  fi
  if command -v jq >/dev/null 2>&1; then
    jq -r '.version' "${REPO_ROOT}/version.json"
  else
    python3 - "${REPO_ROOT}/version.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["version"])
PY
  fi
}

VERSION="$(read_version "${1:-}")"
if [[ -z "${VERSION}" || "${VERSION}" == "null" ]]; then
  echo "ERROR: could not determine release version" >&2
  exit 1
fi

ARTIFACT_NAME="curxor-os-${VERSION}.tar.gz"
ARTIFACT_PATH="${OUT_DIR}/${ARTIFACT_NAME}"
MANIFEST_PATH="${OUT_DIR}/version.json"
STAGING="${OUT_DIR}/.staging-${VERSION}"

mkdir -p "${OUT_DIR}"
rm -rf "${STAGING}"
mkdir -p "${STAGING}/curxor-os"

echo "==> Building OTA artifact ${ARTIFACT_NAME}"

tar -C "${REPO_ROOT}" \
  --exclude=".git" \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude="dist" \
  --exclude=".cursor" \
  --exclude="pillar-4-dashboard/.env.local" \
  --exclude="config/local" \
  -cf - . | tar -C "${STAGING}/curxor-os" -xf -

tar -czf "${ARTIFACT_PATH}" -C "${STAGING}" curxor-os
rm -rf "${STAGING}"

SHA256="$(sha256sum "${ARTIFACT_PATH}" | awk '{print $1}')"
RELEASED="$(date +%Y-%m-%d)"
BASE_URL="${CURXOR_RELEASE_BASE_URL:-https://github.com/curxor/curxor-os/releases/download/v${VERSION}}"

echo "==> SHA256 ${SHA256}"
echo "==> Writing manifest ${MANIFEST_PATH}"

node "${SCRIPT_DIR}/sign-release-manifest.mjs" \
  --version "${VERSION}" \
  --released "${RELEASED}" \
  --artifact-url "${BASE_URL}/${ARTIFACT_NAME}" \
  --sha256 "${SHA256}" \
  --out "${MANIFEST_PATH}"

echo "==> Done"
echo "    Artifact: ${ARTIFACT_PATH}"
echo "    Manifest: ${MANIFEST_PATH}"
