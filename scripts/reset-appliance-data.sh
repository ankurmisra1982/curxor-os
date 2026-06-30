#!/usr/bin/env bash
# CurXor OS — reset operator data on the appliance (/etc/curxor)
# Keeps *.env and kiosk flags. Backs up before wipe. FRE → /setup wizard.
#
# Usage (on box):
#   sed -i 's/\r$//' /tmp/reset-appliance-data.sh   # after scp from Windows
#   sudo bash /opt/curxor/scripts/reset-appliance-data.sh
#   sudo bash /opt/curxor/scripts/reset-appliance-data.sh --no-backup
#
# Or from laptop: .\scripts\copy-script-to-box.ps1 scripts\reset-appliance-data.sh
#
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

ETC="${CURXOR_ETC:-/etc/curxor}"
ROOT="${CURXOR_ROOT:-/opt/curxor}"
USER="${CURXOR_USER:-curxor}"
BACKUP_DIR="/var/backups/curxor"
NO_BACKUP=0

for arg in "$@"; do
  case "$arg" in
    --no-backup) NO_BACKUP=1 ;;
    -h|--help)
      echo "Usage: sudo $0 [--no-backup]"
      exit 0
      ;;
  esac
done

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if [[ ! -d "${ETC}" ]]; then
  echo "Missing ${ETC}" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
if [[ "${NO_BACKUP}" -eq 0 ]]; then
  mkdir -p "${BACKUP_DIR}"
  BACKUP="${BACKUP_DIR}/operator-reset-${TS}.tar.gz"
  echo "==> Backing up ${ETC} → ${BACKUP}"
  tar -czf "${BACKUP}" -C "$(dirname "${ETC}")" "$(basename "${ETC}")"
fi

ENV_STASH="$(mktemp -d)"
trap 'rm -rf "${ENV_STASH}"' EXIT

shopt -s nullglob
for f in "${ETC}"/*.env "${ETC}"/kiosk-*; do
  [[ -e "$f" ]] && cp -a "$f" "${ENV_STASH}/"
done
if [[ -d "${ETC}/engine.env.d" ]]; then
  cp -a "${ETC}/engine.env.d" "${ENV_STASH}/"
fi

echo "==> Clearing operator state (queues, FRE, forged apps, XP, channels…)"
rm -rf \
  "${ETC}/app-fre"/* \
  "${ETC}/agent-workspace"/* \
  "${ETC}/channels"/* \
  "${ETC}/scheduler"/*

find "${ETC}" -maxdepth 1 -type f -name '*.json' -delete

mkdir -p "${ETC}/app-fre" "${ETC}/agent-workspace" "${ETC}/channels" "${ETC}/scheduler"

for f in "${ENV_STASH}"/*; do
  [[ -e "$f" ]] && cp -a "$f" "${ETC}/"
done

SEED="${ROOT}/scripts/seed-appliance-data.sh"
if [[ -x "${SEED}" ]]; then
  echo "==> Re-seeding empty ledgers"
  CURXOR_ETC="${ETC}" CURXOR_ROOT="${ROOT}" CURXOR_USER="${USER}" bash "${SEED}"
else
  printf '%s\n' '{"initialized":false,"selectedApps":[],"provisionedAt":null}' > "${ETC}/fre-state.json"
  printf '%s\n' '{"claws":[],"activeClawId":null}' > "${ETC}/claw-profiles.json"
fi

# Always force global FRE + setup wizard (seed only writes if missing).
printf '%s\n' '{"initialized":false,"selectedApps":[],"provisionedAt":null}' > "${ETC}/fre-state.json"

chown -R "${USER}:${USER}" "${ETC}" /var/lib/curxor 2>/dev/null || true
chmod 755 "${ETC}" "${ETC}/app-fre" 2>/dev/null || true
chmod 640 "${ETC}"/*.env 2>/dev/null || true
chown root:"${USER}" "${ETC}"/*.env 2>/dev/null || true

if systemctl is-active --quiet curxor-dashboard.service 2>/dev/null; then
  echo "==> Restarting curxor-dashboard.service"
  systemctl restart curxor-dashboard.service
fi

echo "==> Reset complete"
echo "    Backup: ${BACKUP:-skipped}"
echo "    Browser: http://<BOX_IP>:3080/setup  (FRE wizard)"
echo "    Queues re-seed on first claw visit (demo defaults)"
