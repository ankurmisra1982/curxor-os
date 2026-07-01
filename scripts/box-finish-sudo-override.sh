#!/usr/bin/env bash
# CurXor OS — finish sudo override install on the appliance (run on box with sudo).
# Stages from /tmp/curxor-sudo-sync/ if present (laptop scp), else uses /opt/curxor.
#
# Usage:
#   sudo bash /tmp/box-finish-sudo-override.sh
#   sudo bash /opt/curxor/scripts/box-finish-sudo-override.sh
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
STAGE="/tmp/curxor-sudo-sync"
REMOTE_OPT="${CURXOR_ROOT}"

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
  echo "Run as root: sudo $0" >&2
  exit 1
fi

mkdir -p "${REMOTE_OPT}/scripts" "${REMOTE_OPT}/config/sudo"

install_if_staged "install-sudo-override.sh" "${REMOTE_OPT}/scripts/install-sudo-override.sh" 0755
install_if_staged "verify-sudo-override.sh" "${REMOTE_OPT}/scripts/verify-sudo-override.sh" 0755
install_if_staged "curxor-dashboard.sudoers.in" "${REMOTE_OPT}/config/sudo/curxor-dashboard.sudoers.in" 0644
install_if_staged "curxor-dashboard.service" "/etc/systemd/system/curxor-dashboard.service" 0644

if [[ ! -x "${REMOTE_OPT}/scripts/install-sudo-override.sh" ]]; then
  echo "ERROR: ${REMOTE_OPT}/scripts/install-sudo-override.sh missing" >&2
  echo "  From laptop: .\\scripts\\box-install-sudo-override.ps1" >&2
  exit 1
fi

"${REMOTE_OPT}/scripts/install-sudo-override.sh"

if [[ -f /etc/systemd/system/curxor-dashboard.service ]]; then
  sed -i '/^NoNewPrivileges=true/d' /etc/systemd/system/curxor-dashboard.service
fi

systemctl daemon-reload
systemctl restart curxor-dashboard

if [[ -x "${REMOTE_OPT}/scripts/verify-sudo-override.sh" ]]; then
  "${REMOTE_OPT}/scripts/verify-sudo-override.sh"
else
  sudo -u curxor sudo -n "${REMOTE_OPT}/scripts/apply-active-claw.sh" && echo "sudo override OK"
fi

echo "[finish] sudo override complete"
