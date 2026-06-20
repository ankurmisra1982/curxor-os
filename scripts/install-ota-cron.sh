#!/usr/bin/env bash
# CurXor OS — install nightly OTA cron (03:00 local time)
set -euo pipefail

OTA_SCRIPT="/opt/curxor/scripts/ota-updater.sh"
CRON_D="/etc/cron.d/curxor-ota"
CRON_DAILY="/etc/cron.daily/curxor-ota"
DAILY_SRC="/opt/curxor/config/ota/cron.daily-curxor-ota"
ENV_SRC="/opt/curxor/config/ota/ota.env.example"
ENV_DST="/etc/curxor/ota.env"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if [[ ! -x "${OTA_SCRIPT}" ]]; then
  echo "ERROR: Missing ${OTA_SCRIPT}" >&2
  exit 1
fi

mkdir -p /var/log/curxor /var/backups/curxor /var/lib/curxor/ota/staging

if [[ ! -f "${ENV_DST}" ]]; then
  install -m 0644 "${ENV_SRC}" "${ENV_DST}"
  echo "==> Installed ${ENV_DST} (edit CURXOR_OTA_VERSION_URL before production)"
fi

# Exact 03:00 nightly check (preferred)
cat > "${CRON_D}" <<EOF
# CurXor OS — automated OTA update check (03:00 daily)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3 * * * root ${OTA_SCRIPT} >> /var/log/curxor/ota-update.log 2>&1
EOF
chmod 644 "${CRON_D}"

# cron.daily wrapper (distro-dependent timing; kept for compatibility)
install -m 0755 "${DAILY_SRC}" "${CRON_DAILY}"

echo "==> OTA cron installed"
echo "    Exact schedule: ${CRON_D} (03:00 daily)"
echo "    cron.daily:     ${CRON_DAILY}"
echo "    Log file:       /var/log/curxor/ota-update.log"
echo ""
echo "Manual test:"
echo "  sudo ${OTA_SCRIPT} --dry-run"
echo "  sudo tail -f /var/log/curxor/ota-update.log"
