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

if [[ "${1:-}" == "--ops-bridge-only" ]]; then
  STAGING="${2:-/tmp/curxor-ops-staging}"
  SCRIPT="${CURXOR_ROOT}/scripts/box-install-ops-bridge.sh"
  [[ -x "${SCRIPT}" ]] || die() { echo "${LOG_TAG} missing ${SCRIPT}" >&2; exit 1; }
  log "Ops bridge only (staging=${STAGING})"
  exec bash "${SCRIPT}" "${STAGING}"
fi

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

if [[ -f /var/lib/curxor/.egress-wan-enabled && -x "${CURXOR_ROOT}/scripts/setup-egress-wan.sh" ]]; then
  log "Re-applying egress WAN (mesh + router DHCP)"
  "${CURXOR_ROOT}/scripts/setup-egress-wan.sh" || log "WARNING: egress WAN setup returned non-zero"
elif [[ -x "${CURXOR_ROOT}/scripts/setup-mesh-network.sh" ]]; then
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
npm_registry_ok() {
  curl -sf --connect-timeout 3 https://registry.npmjs.org/ >/dev/null 2>&1
}
has_deps() {
  [[ -d node_modules ]] && [[ -n "\$(ls -A node_modules 2>/dev/null)" ]]
}
if command -v pnpm &>/dev/null; then
  if has_deps; then
    pnpm build
  elif npm_registry_ok; then
    pnpm install --no-frozen-lockfile
    pnpm build
  else
    echo "node_modules missing and npm registry unreachable (offline box)" >&2
    exit 1
  fi
elif command -v npm &>/dev/null; then
  if has_deps; then
    npm run build
  elif npm_registry_ok; then
    npm install
    npm run build
  else
    echo "node_modules missing and npm registry unreachable (offline box)" >&2
    exit 1
  fi
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
      if [[ -d node_modules ]] && [[ -n "$(ls -A node_modules 2>/dev/null)" ]]; then
        pnpm build
      elif curl -sf --connect-timeout 3 https://registry.npmjs.org/ >/dev/null; then
        pnpm install --no-frozen-lockfile
        pnpm build
      else
        exit 1
      fi
    elif command -v npm &>/dev/null; then
      if [[ -d node_modules ]] && [[ -n "$(ls -A node_modules 2>/dev/null)" ]]; then
        npm run build
      elif curl -sf --connect-timeout 3 https://registry.npmjs.org/ >/dev/null; then
        npm install
        npm run build
      else
        exit 1
      fi
    fi
  ); then
    ok=1
  fi
  if [[ "${ok}" -eq 0 ]]; then
    log "WARNING: ${label} rebuild failed (node_modules wiped? run scripts/sync-node-deps-to-box.ps1 from laptop)"
  fi
}

rebuild_node_project "${CURXOR_ROOT}/pillar-2-engine" "pillar-2-engine"
if [[ -n "${CURXOR_SKIP_DASHBOARD_BUILD:-}" && -d "${CURXOR_ROOT}/pillar-4-dashboard/.next" ]]; then
  log "Skip pillar-4-dashboard rebuild (prebuilt .next from laptop)"
else
  rebuild_node_project "${CURXOR_ROOT}/pillar-4-dashboard" "pillar-4-dashboard"
fi

systemctl daemon-reload
if systemctl is-active --quiet curxor-dashboard.service; then
  log "Restarting curxor-dashboard.service (target restart does not recycle Wants units)"
  systemctl restart curxor-dashboard.service
fi
log "Post-update complete"
