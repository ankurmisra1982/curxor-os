#!/usr/bin/env bash
# CurXor OS — Install Pillar 4 Dashboard (Next.js captive portal)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALL_ROOT="${CURXOR_INSTALL_ROOT:-/opt/curxor/pillar-4-dashboard}"
ENV_FILE="/etc/curxor/dashboard.env"
SERVICE_USER="${CURXOR_USER:-curxor}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

echo "==> CurXor Pillar 4: Dashboard install"

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

mkdir -p "${INSTALL_ROOT}" /etc/curxor /var/log/curxor
SEED_SCRIPT="${CURXOR_ROOT:-/opt/curxor}/scripts/seed-appliance-data.sh"
if [[ -x "${SEED_SCRIPT}" ]]; then
  CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}" CURXOR_USER="${SERVICE_USER}" bash "${SEED_SCRIPT}"
else
  FRE_STATE="/etc/curxor/fre-state.json"
  CLAW_PROFILES="/etc/curxor/claw-profiles.json"
  if [[ ! -f "${FRE_STATE}" ]]; then
    printf '%s\n' '{"initialized":false,"selectedApps":[],"provisionedAt":null}' > "${FRE_STATE}"
  fi
  if [[ ! -f "${CLAW_PROFILES}" ]]; then
    printf '%s\n' '{"claws":[],"activeClawId":null}' > "${CLAW_PROFILES}"
  fi
  chmod 644 "${FRE_STATE}" "${CLAW_PROFILES}"
fi
if [[ -x "${CURXOR_ROOT:-/opt/curxor}/scripts/ensure-app-fre-dir.sh" ]]; then
  "${CURXOR_ROOT:-/opt/curxor}/scripts/ensure-app-fre-dir.sh"
else
  mkdir -p /etc/curxor/app-fre
  chmod 755 /etc/curxor/app-fre
  chown -R "${SERVICE_USER}:${SERVICE_USER}" /etc/curxor/app-fre
fi
rsync -a --delete \
  --exclude node_modules \
  --exclude .next \
  "${PILLAR_DIR}/" "${INSTALL_ROOT}/"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${INSTALL_ROOT}/.env.example" "${ENV_FILE}"
fi

cd "${INSTALL_ROOT}"
npm ci 2>/dev/null || npm install
npm run build

mkdir -p /etc/curxor/engine.env.d
SUDOERS="/etc/sudoers.d/curxor-claw"
if [[ ! -f "${SUDOERS}" ]]; then
  printf '%s\n' "curxor ALL=(root) NOPASSWD: /opt/curxor/scripts/apply-active-claw.sh" > "${SUDOERS}"
  chmod 440 "${SUDOERS}"
fi

cp "${INSTALL_ROOT}/systemd/curxor-dashboard.service" /etc/systemd/system/
systemctl daemon-reload
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_ROOT}" /var/lib/curxor /etc/curxor
chown -R "${SERVICE_USER}:${SERVICE_USER}" /var/log/curxor 2>/dev/null || true

echo ""
echo "==> Install complete."
echo "    Portal: http://<appliance-ip>:3080"
echo "    Edit ${ENV_FILE}"
echo "    sudo systemctl enable --now curxor-dashboard"
