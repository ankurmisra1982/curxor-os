#!/usr/bin/env bash
# CurXor OS — finish deploy sudo install on the appliance (run on box with sudo).
# Stages from /tmp/curxor-deploy-sudo-sync/ (laptop scp).
#
# Usage:
#   sudo bash /tmp/curxor-deploy-sudo-sync/box-finish-deploy-sudo-override.sh
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
STAGE="/tmp/curxor-deploy-sudo-sync"
DEPLOY_USER="${CURXOR_DEPLOY_USER:-ankur}"

install_if_staged() {
  local name="$1"
  local dest="$2"
  local mode="$3"
  if [[ -f "${STAGE}/${name}" ]]; then
    sed -i 's/\r$//' "${STAGE}/${name}"
    install -m "${mode}" "${STAGE}/${name}" "${dest}"
    echo "[finish] installed ${dest}"
  fi
}

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

mkdir -p "${CURXOR_ROOT}/scripts" "${CURXOR_ROOT}/config/sudo"

install_if_staged "install-deploy-sudo-override.sh" "${CURXOR_ROOT}/scripts/install-deploy-sudo-override.sh" 0755
install_if_staged "verify-deploy-sudo-override.sh" "${CURXOR_ROOT}/scripts/verify-deploy-sudo-override.sh" 0755
install_if_staged "box-apply-deploy.sh" "${CURXOR_ROOT}/scripts/box-apply-deploy.sh" 0755
install_if_staged "box-smoke.sh" "${CURXOR_ROOT}/scripts/box-smoke.sh" 0755
install_if_staged "curxor-deploy.sudoers.in" "${CURXOR_ROOT}/config/sudo/curxor-deploy.sudoers.in" 0644

if [[ ! -x "${CURXOR_ROOT}/scripts/install-deploy-sudo-override.sh" ]]; then
  echo "ERROR: ${CURXOR_ROOT}/scripts/install-deploy-sudo-override.sh missing" >&2
  echo "  From laptop: .\\scripts\\box-install-deploy-sudo-override.ps1" >&2
  exit 1
fi

CURXOR_DEPLOY_USER="${DEPLOY_USER}" "${CURXOR_ROOT}/scripts/install-deploy-sudo-override.sh"

if [[ -x "${CURXOR_ROOT}/scripts/verify-deploy-sudo-override.sh" ]]; then
  CURXOR_DEPLOY_USER="${DEPLOY_USER}" "${CURXOR_ROOT}/scripts/verify-deploy-sudo-override.sh"
fi

echo "[finish] deploy sudo override complete"
