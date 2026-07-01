#!/usr/bin/env bash
# CurXor OS — passwordless sudo for founder deploy scripts (laptop → box rsync loop).
#
# Usage: sudo CURXOR_DEPLOY_USER=ankur /opt/curxor/scripts/install-deploy-sudo-override.sh
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
DEPLOY_USER="${CURXOR_DEPLOY_USER:-${SUDO_USER:-ankur}}"
SUDOERS_DROPIN="/etc/sudoers.d/curxor-deploy"
TEMPLATE="${CURXOR_ROOT}/config/sudo/curxor-deploy.sudoers.in"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if ! id "${DEPLOY_USER}" &>/dev/null; then
  echo "ERROR: deploy user '${DEPLOY_USER}' does not exist" >&2
  exit 1
fi

for script in box-apply-deploy.sh post-update.sh; do
  if [[ ! -x "${CURXOR_ROOT}/scripts/${script}" ]]; then
    echo "ERROR: missing ${CURXOR_ROOT}/scripts/${script}" >&2
    exit 1
  fi
done

tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

render_sudoers() {
  if [[ -f "${TEMPLATE}" ]]; then
    sed \
      -e "s|__CURXOR_ROOT__|${CURXOR_ROOT}|g" \
      -e "s|__DEPLOY_USER__|${DEPLOY_USER}|g" \
      "${TEMPLATE}"
  else
    cat <<EOF
# CurXor OS — deploy sudo override (managed by install-deploy-sudo-override.sh)
Cmnd_Alias CURXOR_DEPLOY = ${CURXOR_ROOT}/scripts/box-apply-deploy.sh, \\
                           ${CURXOR_ROOT}/scripts/post-update.sh, \\
                           ${CURXOR_ROOT}/scripts/install-deploy-sudo-override.sh, \\
                           ${CURXOR_ROOT}/scripts/verify-deploy-sudo-override.sh

${DEPLOY_USER} ALL=(root) NOPASSWD: CURXOR_DEPLOY
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

echo "[install-deploy-sudo-override] ${SUDOERS_DROPIN} installed for ${DEPLOY_USER}"
echo "  NOPASSWD: box-apply-deploy.sh, post-update.sh (+ install/verify self)"
