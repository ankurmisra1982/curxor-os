#!/usr/bin/env bash
# CurXor OS — Kiosk mode install smoke (post-install, no reboot required for most checks)
#
# Usage:
#   sudo /opt/curxor/scripts/verify-kiosk-mode.sh
#   sudo /opt/curxor/scripts/verify-kiosk-mode.sh --session   # Xvfb launch test (VM/Linux with X)
#
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -d "${CURXOR_ROOT}/config/kiosk" ]] && [[ -d "${SCRIPT_DIR}/../config/kiosk" ]]; then
  CURXOR_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi

KIOSK_USER="${CURXOR_KIOSK_USER:-curxor-display}"
GETTY_DROPIN="/etc/systemd/system/getty@tty1.service.d/curxor-kiosk.conf"
KIOSK_FLAG="/etc/curxor/kiosk-enabled"
DASHBOARD_STATUS="http://127.0.0.1:3080/api/setup/status"
SESSION_TEST=false

for arg in "$@"; do
  case "${arg}" in
    --session) SESSION_TEST=true ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: ${arg}" >&2; exit 2 ;;
  esac
done

RED='\033[0;31m'
GRN='\033[0;32m'
YL='\033[1;33m'
NC='\033[0m'
FAIL=0
pass() { echo -e "${GRN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=1; }
warn() { echo -e "${YL}[WARN]${NC} $*"; }

section() {
  echo ""
  echo "══════════════════════════════════════════════════════════"
  echo "  $*"
  echo "══════════════════════════════════════════════════════════"
}

section "Kiosk artifacts"
[[ -f "${KIOSK_FLAG}" ]] && pass "kiosk flag ${KIOSK_FLAG}" || fail "missing ${KIOSK_FLAG} — run install-kiosk-mode.sh"
[[ -f "${GETTY_DROPIN}" ]] && pass "getty drop-in ${GETTY_DROPIN}" || fail "missing ${GETTY_DROPIN}"
[[ -x "${CURXOR_ROOT}/scripts/kiosk-launch.sh" ]] && pass "kiosk-launch.sh executable" || fail "kiosk-launch.sh missing or not executable"
[[ -f "/home/${KIOSK_USER}/.xinitrc" ]] && pass "${KIOSK_USER} .xinitrc" || fail "missing /home/${KIOSK_USER}/.xinitrc"
[[ -f "/home/${KIOSK_USER}/.bash_profile" ]] && pass "${KIOSK_USER} .bash_profile" || fail "missing /home/${KIOSK_USER}/.bash_profile"
id "${KIOSK_USER}" &>/dev/null && pass "user ${KIOSK_USER} exists" || fail "user ${KIOSK_USER} missing"

section "Packages"
for pkg in xorg xinit curl; do
  if dpkg -s "${pkg}" &>/dev/null; then
    pass "package ${pkg}"
  else
    fail "package ${pkg} not installed"
  fi
done
if command -v chromium &>/dev/null || command -v chromium-browser &>/dev/null || [[ -x /snap/bin/chromium ]]; then
  pass "Chromium binary available"
else
  fail "Chromium not found — reinstall kiosk mode"
fi

section "Dashboard (kiosk waits on this)"
if curl -sf "${DASHBOARD_STATUS}" >/dev/null 2>&1; then
  pass "GET ${DASHBOARD_STATUS}"
else
  warn "dashboard not responding — kiosk will wait up to CURXOR_KIOSK_WAIT_SEC (default 300s) on boot"
fi
if systemctl is-active --quiet curxor-dashboard.service 2>/dev/null; then
  pass "curxor-dashboard.service active"
else
  warn "curxor-dashboard.service not active"
fi

if [[ "${SESSION_TEST}" == true ]]; then
  section "X session smoke (--session)"
  if ! command -v Xvfb &>/dev/null; then
    warn "Xvfb not installed — apt install xvfb for VM session test"
  else
    export DISPLAY="${CURXOR_KIOSK_TEST_DISPLAY:-:199}"
    Xvfb "${DISPLAY}" -screen 0 1280x720x24 &
    XVFB_PID=$!
    cleanup() { kill "${XVFB_PID}" 2>/dev/null || true; }
    trap cleanup EXIT
    sleep 1
    if CURXOR_KIOSK_WAIT_SEC=15 timeout 45 "${CURXOR_ROOT}/scripts/kiosk-launch.sh"; then
      pass "kiosk-launch exited cleanly within 45s"
    else
      rc=$?
      if [[ "${rc}" -eq 124 ]]; then
        pass "kiosk-launch ran 45s under Xvfb (Chromium likely opened)"
      else
        fail "kiosk-launch failed under Xvfb (exit ${rc})"
      fi
    fi
  fi
fi

section "Reboot check (manual)"
echo "After reboot with monitor on tty1:"
echo "  → curxor-display autologin → startx → Chromium fullscreen at http://127.0.0.1:3080"
echo "  Expert escape: Ctrl+Alt+F3 → sudo ${CURXOR_ROOT}/scripts/install-kiosk-mode.sh --uninstall"

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo -e "${GRN}Kiosk smoke: PASS${NC}"
  exit 0
fi
echo -e "${RED}Kiosk smoke: FAIL${NC}"
exit 1
