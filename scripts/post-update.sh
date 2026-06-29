#!/usr/bin/env bash
# CurXor OS — post-update hook (runs from updated payload root, e.g. /opt/curxor)
# Invoked by ota-updater.sh after a successful extract, before systemd restart.
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
LOG_TAG="[post-update]"

log() {
  echo "${LOG_TAG} $*"
}

log "CurXor OS post-update starting (root=${CURXOR_ROOT})"

CURXOR_USER="${CURXOR_USER:-curxor}"
# Laptop scp/rsync often lands as the SSH user with 0700 — curxor service must traverse and read.
if [[ "${EUID}" -eq 0 ]] && id "${CURXOR_USER}" &>/dev/null; then
  chmod 755 "${CURXOR_ROOT}" 2>/dev/null || true
  for pillar in pillar-2-engine pillar-4-dashboard; do
    if [[ -d "${CURXOR_ROOT}/${pillar}" ]]; then
      log "Fixing ownership for ${pillar} → ${CURXOR_USER}"
      chown -R "${CURXOR_USER}:${CURXOR_USER}" "${CURXOR_ROOT}/${pillar}"
      find "${CURXOR_ROOT}/${pillar}" -type d -exec chmod 755 {} + 2>/dev/null || true
    fi
  done
fi

# Dev-only Next env must never run on the appliance (Windows paths → mkdir('.') EACCES).
for env_local in \
  "${CURXOR_ROOT}/pillar-4-dashboard/.env.local" \
  "${CURXOR_ROOT}/pillar-2-engine/.env.local"; do
  if [[ -f "${env_local}" ]]; then
    log "Removing dev-only ${env_local}"
    rm -f "${env_local}"
  fi
done

chmod +x "${CURXOR_ROOT}/scripts/"*.sh 2>/dev/null || true
chmod +x "${CURXOR_ROOT}/pillar-"*/scripts/*.sh 2>/dev/null || true
chmod +x "${CURXOR_ROOT}/pillar-1-compute/config/vllm/entrypoint.sh" 2>/dev/null || true

if [[ -x "${CURXOR_ROOT}/scripts/ensure-app-fre-dir.sh" ]]; then
  log "Ensuring per-app FRE directory (/etc/curxor/app-fre)"
  "${CURXOR_ROOT}/scripts/ensure-app-fre-dir.sh" || log "WARNING: ensure-app-fre-dir returned non-zero"
fi

if [[ -x "${CURXOR_ROOT}/scripts/setup-mesh-network.sh" ]]; then
  log "Re-applying mesh network (Egress Port)"
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
  local ok=0
  if [[ "${EUID}" -eq 0 ]] && id "${CURXOR_USER}" &>/dev/null; then
    rm -rf "${dir}/.next" 2>/dev/null || true
    chown -R "${CURXOR_USER}:${CURXOR_USER}" "${dir}"
    if sudo -u "${CURXOR_USER}" bash <<EOF
set -euo pipefail
cd '${dir}'
if command -v pnpm &>/dev/null; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm build
elif command -v npm &>/dev/null; then
  npm ci 2>/dev/null || npm install
  npm run build
else
  exit 0
fi
EOF
    then
      ok=1
    fi
    chown -R "${CURXOR_USER}:${CURXOR_USER}" "${dir}"
  elif (
    cd "${dir}"
    if command -v pnpm &>/dev/null; then
      pnpm install --frozen-lockfile 2>/dev/null || pnpm install
      pnpm build
    elif command -v npm &>/dev/null; then
      npm ci 2>/dev/null || npm install
      npm run build
    fi
  ); then
    ok=1
  fi
  if [[ "${ok}" -eq 0 ]]; then
    log "WARNING: ${label} rebuild failed"
  fi
}

rebuild_node_project "${CURXOR_ROOT}/pillar-2-engine" "pillar-2-engine"
rebuild_node_project "${CURXOR_ROOT}/pillar-4-dashboard" "pillar-4-dashboard"

systemctl daemon-reload
if systemctl is-active --quiet curxor-dashboard.service; then
  log "Restarting curxor-dashboard.service (target restart does not recycle Wants units)"
  systemctl restart curxor-dashboard.service
fi
log "Post-update complete"
