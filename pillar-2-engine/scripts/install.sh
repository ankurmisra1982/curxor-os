#!/usr/bin/env bash
# CurXor OS — Install Pillar 2 Engine on Ubuntu 24.04 appliance
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALL_ROOT="${CURXOR_INSTALL_ROOT:-/opt/curxor/pillar-2-engine}"
ENV_FILE="/etc/curxor/engine.env"
SERVICE_USER="${CURXOR_USER:-curxor}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

echo "==> CurXor Pillar 2: Engine install"

id "${SERVICE_USER}" &>/dev/null || useradd --system --home /var/lib/curxor --shell /usr/sbin/nologin "${SERVICE_USER}"

apt-get update -qq
apt-get install -y --no-install-recommends curl ca-certificates

if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@9
fi

mkdir -p "${INSTALL_ROOT}" /etc/curxor
rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  "${PILLAR_DIR}/" "${INSTALL_ROOT}/"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${INSTALL_ROOT}/.env.example" "${ENV_FILE}"
fi

mkdir -p /etc/curxor/engine.env.d
chmod 755 /etc/curxor/engine.env.d

cd "${INSTALL_ROOT}"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

cp "${INSTALL_ROOT}/systemd/curxor-engine.service" /etc/systemd/system/
systemctl daemon-reload
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_ROOT}" /var/lib/curxor /etc/curxor/engine.env.d

echo ""
echo "==> Install complete."
echo "    Edit ${ENV_FILE}"
echo "    sudo systemctl enable --now curxor-engine"
