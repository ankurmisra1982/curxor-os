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

if [[ -x "${CURXOR_ROOT}/scripts/ensure-app-fre-dir.sh" ]]; then
  log "Ensuring per-app FRE directory (/etc/curxor/app-fre)"
  "${CURXOR_ROOT}/scripts/ensure-app-fre-dir.sh" || log "WARNING: ensure-app-fre-dir returned non-zero"
fi

if [[ -x "${CURXOR_ROOT}/scripts/setup-mesh-network.sh" ]]; then
  log "Re-applying mesh network (eno2)"
  "${CURXOR_ROOT}/scripts/setup-mesh-network.sh" || log "WARNING: mesh setup returned non-zero"
fi

rebuild_node_project() {
  local dir="$1"
  local label="$2"
  if [[ ! -f "${dir}/package.json" ]]; then
    log "Skip rebuild ${label}: no package.json"
    return 0
  fi
  log "Rebuilding ${label}…"
  (
    cd "${dir}"
    if command -v pnpm &>/dev/null; then
      pnpm install --frozen-lockfile 2>/dev/null || pnpm install
      pnpm build
    elif command -v npm &>/dev/null; then
      npm ci 2>/dev/null || npm install
      npm run build
    else
      log "WARNING: no pnpm/npm — skip ${label} rebuild"
      exit 0
    fi
  ) || log "WARNING: ${label} rebuild failed"
}

rebuild_node_project "${CURXOR_ROOT}/pillar-2-engine" "pillar-2-engine"
rebuild_node_project "${CURXOR_ROOT}/pillar-4-dashboard" "pillar-4-dashboard"

systemctl daemon-reload
log "Post-update complete"
