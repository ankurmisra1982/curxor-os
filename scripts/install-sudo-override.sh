#!/usr/bin/env bash
# CurXor OS — install passwordless sudo rules for the dashboard service user.
# Covers /opt/curxor scripts, curxor systemd units, and appliance power commands.
#
# Usage: sudo /opt/curxor/scripts/install-sudo-override.sh
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
CURXOR_USER="${CURXOR_USER:-curxor}"
SUDOERS_DROPIN="/etc/sudoers.d/curxor-dashboard"
TEMPLATE="${CURXOR_ROOT}/config/sudo/curxor-dashboard.sudoers.in"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if ! id "${CURXOR_USER}" &>/dev/null; then
  echo "ERROR: user '${CURXOR_USER}' does not exist" >&2
  exit 1
fi

if [[ ! -d "${CURXOR_ROOT}/scripts" ]]; then
  echo "ERROR: missing ${CURXOR_ROOT}/scripts" >&2
  exit 1
fi

SYSTEMCTL="$(command -v systemctl)"
REBOOT="$(command -v reboot)"
SHUTDOWN="$(command -v shutdown)"

for bin in "${SYSTEMCTL}" "${REBOOT}" "${SHUTDOWN}"; do
  if [[ -z "${bin}" || ! -x "${bin}" ]]; then
    echo "ERROR: required command not found (${bin:-missing})" >&2
    exit 1
  fi
done

tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

render_sudoers() {
  if [[ -f "${TEMPLATE}" ]]; then
    sed \
      -e "s|__CURXOR_ROOT__|${CURXOR_ROOT}|g" \
      -e "s|__CURXOR_USER__|${CURXOR_USER}|g" \
      -e "s|__SYSTEMCTL__|${SYSTEMCTL}|g" \
      -e "s|__REBOOT__|${REBOOT}|g" \
      -e "s|__SHUTDOWN__|${SHUTDOWN}|g" \
      "${TEMPLATE}"
  else
    cat <<EOF
# CurXor OS — dashboard service sudo override (managed by install-sudo-override.sh)
Cmnd_Alias CURXOR_SCRIPTS = ${CURXOR_ROOT}/scripts/*
Cmnd_Alias CURXOR_PILLAR_SCRIPTS = ${CURXOR_ROOT}/pillar-1-compute/scripts/*, \\
                                   ${CURXOR_ROOT}/pillar-2-engine/scripts/*, \\
                                   ${CURXOR_ROOT}/pillar-3-telemetry/scripts/*, \\
                                   ${CURXOR_ROOT}/pillar-4-dashboard/scripts/*
Cmnd_Alias CURXOR_SYSTEMCTL = ${SYSTEMCTL} start curxor-*, \\
                              ${SYSTEMCTL} stop curxor-*, \\
                              ${SYSTEMCTL} restart curxor-*, \\
                              ${SYSTEMCTL} try-restart curxor-*, \\
                              ${SYSTEMCTL} reload curxor-*, \\
                              ${SYSTEMCTL} start curxor-os.target, \\
                              ${SYSTEMCTL} stop curxor-os.target, \\
                              ${SYSTEMCTL} restart curxor-os.target, \\
                              ${SYSTEMCTL} daemon-reload, \\
                              ${SYSTEMCTL} reboot, \\
                              ${SYSTEMCTL} poweroff
Cmnd_Alias CURXOR_POWER = ${REBOOT}, ${SHUTDOWN} -h now, ${SHUTDOWN} -r now

${CURXOR_USER} ALL=(root) NOPASSWD: CURXOR_SCRIPTS, CURXOR_PILLAR_SCRIPTS, CURXOR_SYSTEMCTL, CURXOR_POWER
EOF
  fi
}

render_sudoers > "${tmp}"

if ! visudo -cf "${tmp}" >/dev/null; then
  echo "ERROR: sudoers validation failed for ${SUDOERS_DROPIN}" >&2
  visudo -cf "${tmp}" || true
  exit 1
fi

install -m 0440 "${tmp}" "${SUDOERS_DROPIN}"

if [[ -f /etc/sudoers.d/curxor-claw ]]; then
  rm -f /etc/sudoers.d/curxor-claw
fi

echo "[install-sudo-override] ${SUDOERS_DROPIN} installed for ${CURXOR_USER}"
echo "  scripts:     ${CURXOR_ROOT}/scripts/* (+ pillar install scripts)"
echo "  systemctl:   curxor-* units, curxor-os.target, daemon-reload, reboot, poweroff"
echo "  power:       ${REBOOT}, ${SHUTDOWN}"
