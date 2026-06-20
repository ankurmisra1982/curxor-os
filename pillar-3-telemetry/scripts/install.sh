#!/usr/bin/env bash
# CurXor OS — Install Pillar 3 Telemetry Broker on Ubuntu 24.04 appliance
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALL_ROOT="${CURXOR_INSTALL_ROOT:-/opt/curxor/pillar-3-telemetry}"
ENV_FILE="/etc/curxor/telemetry-broker.env"
SERVICE_USER="${CURXOR_USER:-curxor}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

echo "==> CurXor Pillar 3: Telemetry Broker install"

id "${SERVICE_USER}" &>/dev/null || useradd --system --home /var/lib/curxor --shell /usr/sbin/nologin "${SERVICE_USER}"

apt-get update -qq
apt-get install -y --no-install-recommends python3 python3-venv python3-pip iproute2

mkdir -p "${INSTALL_ROOT}" /etc/curxor /var/lib/curxor
rsync -a --delete \
  --exclude '.venv' \
  --exclude '__pycache__' \
  "${PILLAR_DIR}/" "${INSTALL_ROOT}/"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${INSTALL_ROOT}/.env.example" "${ENV_FILE}"
  echo "==> Wrote ${ENV_FILE} — verify CURXOR_MESH_IFACE=eno2"
fi

DIGITAL_ENV="/etc/curxor/digital.env"
DIGITAL_EXAMPLE="$(cd "${PILLAR_DIR}/.." && pwd)/config/digital/digital.env.example"
if [[ ! -f "${DIGITAL_ENV}" ]] && [[ -f "${DIGITAL_EXAMPLE}" ]]; then
  install -m 0640 "${DIGITAL_EXAMPLE}" "${DIGITAL_ENV}"
  chown root:"${SERVICE_USER}" "${DIGITAL_ENV}"
  echo "==> Wrote ${DIGITAL_ENV} — add Alpaca / X credentials"
fi

python3 -m venv "${INSTALL_ROOT}/.venv"
"${INSTALL_ROOT}/.venv/bin/pip" install --upgrade pip
"${INSTALL_ROOT}/.venv/bin/pip" install --no-cache-dir "${INSTALL_ROOT}"

cp "${INSTALL_ROOT}/systemd/curxor-telemetry-broker.service" /etc/systemd/system/
systemctl daemon-reload

chown -R "${SERVICE_USER}:${SERVICE_USER}" /var/lib/curxor "${INSTALL_ROOT}"

echo ""
echo "==> Install complete."
echo "    1. Ensure eno2 is configured on robotics mesh subnet (Port 2)"
echo "    2. Edit ${ENV_FILE} if needed"
echo "    3. sudo systemctl enable --now curxor-telemetry-broker"
echo "    4. ${INSTALL_ROOT}/scripts/verify-mesh.sh"
