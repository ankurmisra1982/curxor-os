#!/usr/bin/env bash
# CurXor OS — Optional Flight Command kiosk (monitor-first boot)
#
# Installs minimal X11 + Chromium, curxor-display autologin on tty1, kiosk launcher.
# Does NOT replace laptop-on-eno1 operator path.
#
# Usage:
#   sudo /opt/curxor/scripts/install-kiosk-mode.sh
#   sudo /opt/curxor/scripts/install-kiosk-mode.sh --uninstall
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
if [[ ! -d "${CURXOR_ROOT}/config/kiosk" ]] && [[ -d "${SCRIPT_DIR}/../config/kiosk" ]]; then
  CURXOR_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi

KIOSK_USER="${CURXOR_KIOSK_USER:-curxor-display}"
KIOSK_CONFIG="${CURXOR_ROOT}/config/kiosk"
GETTY_DROPIN="/etc/systemd/system/getty@tty1.service.d/curxor-kiosk.conf"
KIOSK_FLAG="/etc/curxor/kiosk-enabled"
CHROMIUM_ENV="/etc/curxor/kiosk-chromium.env"

usage() {
  cat <<EOF
Usage: install-kiosk-mode.sh [--uninstall]

  Default: install minimal X + Chromium kiosk on tty1 (${KIOSK_USER} autologin)
  --uninstall: remove autologin drop-in and flag (packages remain)

  Smoke after install: ${CURXOR_ROOT}/scripts/verify-kiosk-mode.sh
EOF
}

uninstall_kiosk() {
  echo "==> Removing CurXor kiosk autologin"
  rm -f "${GETTY_DROPIN}" "${CHROMIUM_ENV}"
  rmdir /etc/systemd/system/getty@tty1.service.d 2>/dev/null || true
  rm -f "${KIOSK_FLAG}"
  systemctl daemon-reload
  systemctl restart "getty@tty1.service" 2>/dev/null || true
  echo "==> Kiosk autologin disabled (X/Chromium packages not removed)"
}

install_chromium() {
  if command -v chromium &>/dev/null || command -v chromium-browser &>/dev/null || [[ -x /snap/bin/chromium ]]; then
    echo "    Chromium already present"
    return 0
  fi
  # Prefer deb chromium; Ubuntu 24.04 may only offer snap — both work with kiosk-launch.sh
  if ! apt-get install -y --no-install-recommends chromium 2>/dev/null; then
    apt-get install -y --no-install-recommends chromium-browser 2>/dev/null || true
  fi
  if ! command -v chromium &>/dev/null && ! command -v chromium-browser &>/dev/null && [[ ! -x /snap/bin/chromium ]]; then
    echo "    Installing Chromium via snap (deb unavailable)"
    if command -v snap &>/dev/null; then
      snap install chromium
    else
      echo "ERROR: Could not install Chromium (apt or snap)" >&2
      exit 1
    fi
  fi
}

write_chromium_env() {
  local bin=""
  for candidate in chromium chromium-browser /snap/bin/chromium; do
    if command -v "${candidate}" &>/dev/null; then
      bin="$(command -v "${candidate}")"
      break
    fi
    if [[ -x "${candidate}" ]]; then
      bin="${candidate}"
      break
    fi
  done
  mkdir -p /etc/curxor
  if [[ -n "${bin}" ]]; then
    printf 'CURXOR_CHROMIUM_BIN=%q\n' "${bin}" > "${CHROMIUM_ENV}"
    chmod 644 "${CHROMIUM_ENV}"
  fi
}

install_kiosk() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root: sudo $0" >&2
    exit 1
  fi

  if [[ ! -d "${KIOSK_CONFIG}" ]]; then
    echo "ERROR: Missing ${KIOSK_CONFIG}" >&2
    exit 1
  fi

  echo "==> CurXor kiosk mode install"
  echo "    Root: ${CURXOR_ROOT}"
  echo "    User: ${KIOSK_USER}"
  echo "    URL : http://127.0.0.1:3080"

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends \
    xorg \
    xinit \
    x11-xserver-utils \
    dbus-x11 \
    fonts-liberation \
    curl \
    ca-certificates

  install_chromium
  write_chromium_env

  chmod +x "${CURXOR_ROOT}/scripts/kiosk-launch.sh"
  chmod +x "${CURXOR_ROOT}/scripts/verify-kiosk-mode.sh" 2>/dev/null || true

  if ! id "${KIOSK_USER}" &>/dev/null; then
    useradd -m -s /bin/bash "${KIOSK_USER}"
  fi
  for grp in video render input; do
    if getent group "${grp}" &>/dev/null; then
      usermod -aG "${grp}" "${KIOSK_USER}" 2>/dev/null || true
    fi
  done

  install -m 0755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" \
    "${KIOSK_CONFIG}/xinitrc" "/home/${KIOSK_USER}/.xinitrc"

  # Source chromium path + CURXOR_ROOT before startx
  {
    cat "${KIOSK_CONFIG}/bash_profile"
    echo ""
    echo "# CurXor kiosk env (written by install-kiosk-mode.sh)"
    echo "export CURXOR_ROOT=${CURXOR_ROOT@Q}"
    if [[ -f "${CHROMIUM_ENV}" ]]; then
      echo "[[ -f ${CHROMIUM_ENV@Q} ]] && . ${CHROMIUM_ENV@Q}"
    fi
  } > "/home/${KIOSK_USER}/.bash_profile"
  chown "${KIOSK_USER}:${KIOSK_USER}" "/home/${KIOSK_USER}/.bash_profile"
  chmod 0644 "/home/${KIOSK_USER}/.bash_profile"

  mkdir -p /etc/systemd/system/getty@tty1.service.d
  sed "s/curxor-display/${KIOSK_USER}/g" "${KIOSK_CONFIG}/getty-autologin.conf" > "${GETTY_DROPIN}"
  chmod 0644 "${GETTY_DROPIN}"

  mkdir -p /etc/curxor
  printf '%s\n' "enabled=true" "installedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" "user=${KIOSK_USER}" > "${KIOSK_FLAG}"
  chmod 644 "${KIOSK_FLAG}"

  systemctl daemon-reload

  echo ""
  echo "==> Kiosk mode installed"
  echo "    Smoke:  sudo ${CURXOR_ROOT}/scripts/verify-kiosk-mode.sh"
  echo "    VM X:   sudo ${CURXOR_ROOT}/scripts/verify-kiosk-mode.sh --session"
  echo "    Reboot with monitor + keyboard on MS-S1 → Flight Command fullscreen on tty1"
  echo "    Expert escape: Ctrl+Alt+F3 → sudo ${CURXOR_ROOT}/scripts/install-kiosk-mode.sh --uninstall"
  echo "    Requires: curxor-dashboard.service running (install-all.sh)"
}

case "${1:-}" in
  --uninstall) uninstall_kiosk ;;
  -h|--help) usage ;;
  "") install_kiosk ;;
  *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
esac
