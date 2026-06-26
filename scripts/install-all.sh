#!/usr/bin/env bash

# CurXor OS — Meta-installer: orchestrate all four pillars

set -euo pipefail



CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"



if [[ "${EUID}" -ne 0 ]]; then

  echo "Run as root: sudo $0" >&2

  exit 1

fi



echo "==> CurXor OS Meta-Installer"

echo "    Root: ${CURXOR_ROOT}"



mkdir -p "${CURXOR_ROOT}/scripts" /etc/curxor/engine.env.d

chmod +x "${SCRIPT_DIR}/setup-mesh-network.sh" "${SCRIPT_DIR}/apply-active-claw.sh" "${SCRIPT_DIR}/ota-updater.sh" "${SCRIPT_DIR}/install-ota-cron.sh" "${SCRIPT_DIR}/post-update.sh" "${SCRIPT_DIR}/ensure-app-fre-dir.sh" "${SCRIPT_DIR}/patch-app-fre-dir.sh" "${SCRIPT_DIR}/install-kiosk-mode.sh" "${SCRIPT_DIR}/kiosk-launch.sh" "${SCRIPT_DIR}/verify-kiosk-mode.sh" 2>/dev/null || true
chmod +x "${CURXOR_ROOT}/docs/scripts/export-guides-pdf.sh" 2>/dev/null || true

echo ""
echo "==> Preparing /etc/curxor (global + per-app FRE directories)..."
"${SCRIPT_DIR}/ensure-app-fre-dir.sh"



PILLARS=(

  "pillar-1-compute"

  "pillar-2-engine"

  "pillar-3-telemetry"

  "pillar-4-dashboard"

)



for pillar in "${PILLARS[@]}"; do

  pillar_dir="${CURXOR_ROOT}/${pillar}"

  install_script="${pillar_dir}/scripts/install.sh"



  echo ""

  echo "==> Installing ${pillar}..."



  if [[ ! -d "${pillar_dir}" ]]; then

    echo "ERROR: Missing ${pillar_dir}" >&2

    exit 1

  fi



  if [[ ! -x "${install_script}" ]]; then

    if [[ -f "${install_script}" ]]; then

      chmod +x "${install_script}"

    else

      echo "ERROR: Missing ${install_script}" >&2

      exit 1

    fi

  fi



  (cd "${pillar_dir}" && "${install_script}")

done



echo ""

echo "==> Configuring robotics mesh (eno2)..."

"${SCRIPT_DIR}/setup-mesh-network.sh"



TARGET_SRC="${CURXOR_ROOT}/systemd/curxor-os.target"

TARGET_DST="/etc/systemd/system/curxor-os.target"



if [[ ! -f "${TARGET_SRC}" ]]; then

  echo "ERROR: Missing ${TARGET_SRC}" >&2

  exit 1

fi



echo ""

echo "==> Installing master target -> ${TARGET_DST}"

install -m 0644 "${TARGET_SRC}" "${TARGET_DST}"



systemctl daemon-reload



echo ""

echo "==> Enabling CurXor OS master target"

systemctl enable --now curxor-os.target



echo ""

echo "==> CurXor OS stack online"

systemctl status curxor-os.target --no-pager || true

echo ""

systemctl list-dependencies curxor-os.target --no-pager || true

echo ""
echo "==> Optional: enable nightly OTA updates (03:00)"
echo "    ${SCRIPT_DIR}/install-ota-cron.sh"
echo ""
echo "==> Optional: monitor-first kiosk (Flight Command on boot)"
echo "    ${SCRIPT_DIR}/install-kiosk-mode.sh"
echo "    or: CURXOR_ENABLE_KIOSK=1 ${SCRIPT_DIR}/install-all.sh"

if [[ "${CURXOR_ENABLE_KIOSK:-0}" == "1" ]]; then
  echo ""
  echo "==> CURXOR_ENABLE_KIOSK=1 — installing kiosk mode"
  "${SCRIPT_DIR}/install-kiosk-mode.sh"
fi

