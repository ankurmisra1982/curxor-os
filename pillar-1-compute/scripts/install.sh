#!/usr/bin/env bash
# CurXor OS — Install Pillar 1 Compute on Ubuntu 24.04 appliance
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALL_ROOT="${CURXOR_INSTALL_ROOT:-/opt/curxor/pillar-1-compute}"
ENV_FILE="/etc/curxor/compute.env"
SERVICE_USER="${CURXOR_USER:-curxor}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

echo "==> CurXor Pillar 1: Compute install"

id "${SERVICE_USER}" &>/dev/null || useradd --system --home /var/lib/curxor --shell /usr/sbin/nologin "${SERVICE_USER}"

if [[ "${PILLAR_DIR}" != "${INSTALL_ROOT}" ]]; then
  mkdir -p "${INSTALL_ROOT}"
  rsync -a --delete \
    --exclude '.env' \
    "${PILLAR_DIR}/" "${INSTALL_ROOT}/"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${INSTALL_ROOT}/.env.example" "${ENV_FILE}"
fi

ln -sfn "${ENV_FILE}" "${INSTALL_ROOT}/.env"

chmod +x "${INSTALL_ROOT}/scripts/"*.sh "${INSTALL_ROOT}/config/vllm/entrypoint.sh" 2>/dev/null || true

echo "==> Running host ROCm + Docker setup..."
"${INSTALL_ROOT}/scripts/setup-rocm-host.sh"

cp "${INSTALL_ROOT}/systemd/curxor-compute.service" /etc/systemd/system/
systemctl daemon-reload

chown -R "${SERVICE_USER}:${SERVICE_USER}" /var/lib/curxor "${INSTALL_ROOT}" 2>/dev/null || true

echo ""
echo "==> Pillar 1 install complete."
echo "    Configure ${ENV_FILE} and BIOS UMA, then deploy inference:"
echo "    ${INSTALL_ROOT}/scripts/deploy.sh --pull-models"
