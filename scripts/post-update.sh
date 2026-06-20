#!/usr/bin/env bash
# CurXor OS — post-update hook (runs from updated payload root, e.g. /opt/curxor)
# Invoked by ota-updater.sh after a successful extract, before systemd restart.
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
LOG_TAG="[post-update]"

log() {
  echo "${LOG_TAG} $*"
}

log "CurXor OS post-update starting (root=${CURXOR_ROOT})"

chmod +x "${CURXOR_ROOT}/scripts/"*.sh 2>/dev/null || true
chmod +x "${CURXOR_ROOT}/pillar-"*/scripts/*.sh 2>/dev/null || true
chmod +x "${CURXOR_ROOT}/pillar-1-compute/config/vllm/entrypoint.sh" 2>/dev/null || true

if [[ -x "${CURXOR_ROOT}/scripts/setup-mesh-network.sh" ]]; then
  log "Re-applying mesh network (eno2)"
  "${CURXOR_ROOT}/scripts/setup-mesh-network.sh" || log "WARNING: mesh setup returned non-zero"
fi

systemctl daemon-reload
log "Post-update complete"
