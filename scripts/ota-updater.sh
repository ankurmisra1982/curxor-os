#!/usr/bin/env bash
# CurXor OS — secure OTA update daemon
#
# Checks a remote version.json manifest; when the remote semver is newer than the
# local /opt/curxor/version.json, backs up, downloads, verifies, applies, and
# restarts curxor-os.target. Rolls back automatically on failure.
#
# ── Install nightly cron (exact 03:00 — recommended) ─────────────────────────
#   sudo /opt/curxor/scripts/install-ota-cron.sh
#
# ── Or inject cron.daily wrapper (distro-dependent early-morning time) ───────
#   sudo install -m 0755 /opt/curxor/config/ota/cron.daily-curxor-ota \
#     /etc/cron.daily/curxor-ota
#
# ── Manual run ───────────────────────────────────────────────────────────────
#   sudo /opt/curxor/scripts/ota-updater.sh
#   sudo /opt/curxor/scripts/ota-updater.sh --force-check
#
set -euo pipefail

readonly SCRIPT_NAME="ota-updater"
readonly DEFAULT_ENV="/etc/curxor/ota.env"
readonly LOCK_FILE="/run/curxor-ota.lock"

CURXOR_OTA_ROOT="/opt/curxor"
CURXOR_OTA_LOCAL_VERSION="${CURXOR_OTA_ROOT}/version.json"
CURXOR_OTA_VERSION_URL=""
CURXOR_OTA_STAGING_DIR="/var/lib/curxor/ota/staging"
CURXOR_OTA_BACKUP_DIR="/var/backups/curxor"
CURXOR_OTA_LOG="/var/log/curxor/ota-update.log"
CURXOR_OTA_REQUIRE_HTTPS=1
CURXOR_OTA_VERIFY_SHA256=1
CURXOR_OTA_HEALTH_WAIT_SEC=15

FORCE_CHECK=0
DRY_RUN=0
LAST_BACKUP=""

# ── Logging ──────────────────────────────────────────────────────────────────

log() {
  local line="[$(date -Iseconds)] [${SCRIPT_NAME}] $*"
  mkdir -p "$(dirname "${CURXOR_OTA_LOG}")"
  echo "${line}" >> "${CURXOR_OTA_LOG}"
  if [[ -t 1 ]]; then
    echo "${line}"
  fi
}

log_err() {
  log "ERROR: $*"
}

# ── Config / helpers ─────────────────────────────────────────────────────────

load_config() {
  if [[ -f "${DEFAULT_ENV}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${DEFAULT_ENV}"
    set +a
  fi

  CURXOR_OTA_ROOT="${CURXOR_OTA_ROOT:-/opt/curxor}"
  CURXOR_OTA_LOCAL_VERSION="${CURXOR_OTA_LOCAL_VERSION:-${CURXOR_OTA_ROOT}/version.json}"
  CURXOR_OTA_STAGING_DIR="${CURXOR_OTA_STAGING_DIR:-/var/lib/curxor/ota/staging}"
  CURXOR_OTA_BACKUP_DIR="${CURXOR_OTA_BACKUP_DIR:-/var/backups/curxor}"
  CURXOR_OTA_LOG="${CURXOR_OTA_LOG:-/var/log/curxor/ota-update.log}"
  CURXOR_OTA_REQUIRE_HTTPS="${CURXOR_OTA_REQUIRE_HTTPS:-1}"
  CURXOR_OTA_VERIFY_SHA256="${CURXOR_OTA_VERIFY_SHA256:-1}"
  CURXOR_OTA_HEALTH_WAIT_SEC="${CURXOR_OTA_HEALTH_WAIT_SEC:-15}"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    log_err "Run as root: sudo $0"
    exit 1
  fi
}

acquire_lock() {
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    log "Another OTA run is in progress — exiting"
    exit 0
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --force-check) FORCE_CHECK=1 ;;
      --dry-run) DRY_RUN=1 ;;
      -h|--help)
        sed -n '2,20p' "$0"
        exit 0
        ;;
      *)
        log_err "Unknown argument: $1"
        exit 2
        ;;
    esac
    shift
  done
}

require_commands() {
  local missing=0
  for cmd in curl tar flock sort rsync sha256sum; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      log_err "Missing required command: ${cmd}"
      missing=1
    fi
  done
  if ! command -v jq >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
    log_err "Need jq or python3 for JSON parsing"
    missing=1
  fi
  if [[ "${missing}" -ne 0 ]]; then
    exit 1
  fi
}

json_get() {
  local file="$1"
  local key="$2"
  if command -v jq >/dev/null 2>&1; then
    jq -r "${key}" "${file}"
  else
    python3 - "${file}" "${key}" <<'PY'
import json, sys
path, key = sys.argv[1], sys.argv[2]
data = json.load(open(path, encoding="utf-8"))
cur = data
for part in key.lstrip(".").split("."):
    if not part:
        continue
    cur = cur[part]
if isinstance(cur, (dict, list)):
    print(json.dumps(cur))
elif cur is None:
    print("")
else:
    print(cur)
PY
  fi
}

version_gt() {
  local remote="$1"
  local local="$2"
  [[ -n "${remote}" && -n "${local}" ]] || return 1
  [[ "${remote}" != "${local}" ]] && [[ "$(printf '%s\n' "${local}" "${remote}" | sort -V | tail -n1)" == "${remote}" ]]
}

curl_secure() {
  local out="$1"
  local url="$2"
  local args=(--fail --location --silent --show-error --retry 3 --retry-delay 5 --connect-timeout 30 --max-time 600)
  if [[ "${CURXOR_OTA_REQUIRE_HTTPS}" == "1" ]]; then
    args+=(--proto '=https' --tlsv1.2)
  fi
  curl "${args[@]}" --output "${out}" "${url}"
}

ensure_https_url() {
  local url="$1"
  local label="$2"
  if [[ "${CURXOR_OTA_REQUIRE_HTTPS}" == "1" && "${url}" != https://* ]]; then
    log_err "${label} must use HTTPS: ${url}"
    exit 1
  fi
}

read_local_version() {
  if [[ ! -f "${CURXOR_OTA_LOCAL_VERSION}" ]]; then
    log_err "Local version file missing: ${CURXOR_OTA_LOCAL_VERSION}"
    exit 1
  fi
  json_get "${CURXOR_OTA_LOCAL_VERSION}" ".version"
}

fetch_remote_manifest() {
  local dest="$1"
  if [[ -z "${CURXOR_OTA_VERSION_URL}" ]]; then
    log_err "CURXOR_OTA_VERSION_URL is not set (see ${DEFAULT_ENV})"
    exit 1
  fi
  ensure_https_url "${CURXOR_OTA_VERSION_URL}" "CURXOR_OTA_VERSION_URL"
  log "Fetching manifest: ${CURXOR_OTA_VERSION_URL}"
  curl_secure "${dest}" "${CURXOR_OTA_VERSION_URL}"
}

create_backup() {
  local local_version="$1"
  local ts
  ts="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "${CURXOR_OTA_BACKUP_DIR}"
  LAST_BACKUP="${CURXOR_OTA_BACKUP_DIR}/curxor-pre-ota-${local_version}-${ts}.tar.gz"
  log "Creating backup: ${LAST_BACKUP}"
  tar -C "$(dirname "${CURXOR_OTA_ROOT}")" \
    --exclude='./curxor/.git' \
    -czf "${LAST_BACKUP}" \
    "$(basename "${CURXOR_OTA_ROOT}")"
}

verify_sha256() {
  local file="$1"
  local expected="$2"
  local actual
  actual="$(sha256sum "${file}" | awk '{print $1}')"
  if [[ "${actual}" != "${expected}" ]]; then
    log_err "SHA256 mismatch (expected ${expected}, got ${actual})"
    return 1
  fi
  log "SHA256 verified"
}

download_artifact() {
  local url="$1"
  local dest="$2"
  ensure_https_url "${url}" "artifact.url"
  log "Downloading artifact: ${url}"
  curl_secure "${dest}" "${url}"
}

extract_artifact() {
  local archive="$1"
  local dest="$2"
  rm -rf "${dest}"
  mkdir -p "${dest}"
  log "Extracting artifact to ${dest}"
  tar -xzf "${archive}" -C "${dest}"
}

find_payload_root() {
  local staging="$1"
  if [[ -f "${staging}/version.json" && -d "${staging}/scripts" ]]; then
    echo "${staging}"
    return 0
  fi
  local nested
  nested="$(find "${staging}" -mindepth 1 -maxdepth 2 -type f -name version.json | head -n1 || true)"
  if [[ -n "${nested}" ]]; then
    echo "$(dirname "${nested}")"
    return 0
  fi
  return 1
}

apply_payload() {
  local payload_root="$1"
  log "Applying payload from ${payload_root} -> ${CURXOR_OTA_ROOT}"
  rsync -a --delete \
    --exclude '.env' \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude 'dist/' \
    --exclude '.venv/' \
    --exclude '__pycache__/' \
    "${payload_root}/" "${CURXOR_OTA_ROOT}/"
  chmod +x "${CURXOR_OTA_ROOT}/scripts/"*.sh 2>/dev/null || true
}

run_post_update() {
  local hook_rel="$1"
  local hook_path="${CURXOR_OTA_ROOT}/${hook_rel}"
  if [[ -z "${hook_rel}" || "${hook_rel}" == "null" ]]; then
    log "No post_update hook in manifest"
    return 0
  fi
  if [[ ! -f "${hook_path}" ]]; then
    log "post_update hook not found: ${hook_path}"
    return 0
  fi
  log "Running post_update hook: ${hook_path}"
  chmod +x "${hook_path}"
  (cd "${CURXOR_OTA_ROOT}" && CURXOR_ROOT="${CURXOR_OTA_ROOT}" bash "${hook_path}")
}

write_local_version() {
  local manifest="$1"
  local remote_version="$2"
  local installed_at
  installed_at="$(date -Iseconds)"
  if command -v jq >/dev/null 2>&1; then
    jq --arg v "${remote_version}" --arg at "${installed_at}" \
      '.version = $v | .installed_at = $at' "${manifest}" > "${CURXOR_OTA_LOCAL_VERSION}.tmp"
  else
    python3 - "${manifest}" "${CURXOR_OTA_LOCAL_VERSION}.tmp" "${remote_version}" "${installed_at}" <<'PY'
import json, sys
manifest, out, version, installed_at = sys.argv[1:5]
data = json.load(open(manifest, encoding="utf-8"))
data["version"] = version
data["installed_at"] = installed_at
json.dump(data, open(out, "w", encoding="utf-8"), indent=2)
open(out, "a", encoding="utf-8").write("\n")
PY
  fi
  mv "${CURXOR_OTA_LOCAL_VERSION}.tmp" "${CURXOR_OTA_LOCAL_VERSION}"
  log "Local version updated to ${remote_version}"
}

restart_stack() {
  log "Restarting curxor-os.target"
  systemctl daemon-reload
  if ! systemctl restart curxor-os.target; then
    return 1
  fi
}

health_check() {
  local wait_sec="${CURXOR_OTA_HEALTH_WAIT_SEC}"
  log "Health check (waiting ${wait_sec}s)"
  sleep "${wait_sec}"

  local units=(curxor-telemetry-broker curxor-engine curxor-dashboard)
  local failed=0
  for unit in "${units[@]}"; do
    if ! systemctl is-active --quiet "${unit}.service"; then
      log_err "${unit}.service is not active"
      failed=1
    fi
  done

  if systemctl is-enabled --quiet curxor-compute.service 2>/dev/null; then
    if ! systemctl is-active --quiet curxor-compute.service; then
      log "NOTE: curxor-compute.service inactive (oneshot — may be expected until deploy.sh)"
    fi
  fi

  return "${failed}"
}

rollback() {
  if [[ -z "${LAST_BACKUP}" || ! -f "${LAST_BACKUP}" ]]; then
    log_err "Rollback impossible — no backup archive available"
    return 1
  fi
  log "ROLLBACK: restoring ${LAST_BACKUP}"
  systemctl stop curxor-os.target 2>/dev/null || true
  tar -xzf "${LAST_BACKUP}" -C "$(dirname "${CURXOR_OTA_ROOT}")"
  systemctl daemon-reload
  systemctl restart curxor-os.target || true
  log "Rollback complete"
}

cleanup_staging() {
  rm -rf "${CURXOR_OTA_STAGING_DIR:?}"/*
}

perform_update() {
  local manifest="$1"
  local remote_version="$2"
  local artifact_url artifact_sha post_update_hook
  local work_dir archive payload_root

  artifact_url="$(json_get "${manifest}" ".artifact.url")"
  artifact_sha="$(json_get "${manifest}" ".artifact.sha256")"
  post_update_hook="$(json_get "${manifest}" ".post_update")"

  if [[ -z "${artifact_url}" || "${artifact_url}" == "null" ]]; then
    log_err "Manifest missing artifact.url"
    exit 1
  fi

  work_dir="${CURXOR_OTA_STAGING_DIR}/${remote_version}-$(date +%s)"
  archive="${work_dir}/artifact.tar.gz"
  mkdir -p "${work_dir}"

  local local_version
  local_version="$(read_local_version)"

  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY RUN: would update ${local_version} -> ${remote_version}"
    return 0
  fi

  create_backup "${local_version}"

  if ! download_artifact "${artifact_url}" "${archive}"; then
    log_err "Artifact download failed"
    exit 1
  fi

  if [[ "${CURXOR_OTA_VERIFY_SHA256}" == "1" && -n "${artifact_sha}" && "${artifact_sha}" != "null" ]]; then
    if [[ "${artifact_sha}" == "0000000000000000000000000000000000000000000000000000000000000000" ]]; then
      log "WARNING: manifest uses placeholder SHA256 — skipping verification (dev/mock only)"
    elif ! verify_sha256 "${archive}" "${artifact_sha}"; then
      log_err "Artifact verification failed — aborting"
      exit 1
    fi
  fi

  extract_artifact "${archive}" "${work_dir}/extract"
  if ! payload_root="$(find_payload_root "${work_dir}/extract")"; then
    log_err "Could not locate payload root (expected version.json + scripts/)"
    exit 1
  fi

  if ! apply_payload "${payload_root}"; then
    log_err "Failed to apply payload"
    rollback || true
    exit 1
  fi

  if ! run_post_update "${post_update_hook}"; then
    log_err "post_update hook failed"
    rollback || true
    exit 1
  fi

  if ! restart_stack; then
    log_err "systemctl restart curxor-os.target failed"
    rollback || true
    exit 1
  fi

  if ! health_check; then
    log_err "Post-update health check failed"
    rollback || true
    exit 1
  fi

  write_local_version "${manifest}" "${remote_version}"

  cleanup_staging
  log "OTA update successful: ${local_version} -> ${remote_version}"
}

main() {
  parse_args "$@"
  require_root
  load_config
  require_commands
  acquire_lock

  log "── OTA check started ──"

  local local_version remote_version manifest
  manifest="$(mktemp /tmp/curxor-ota-manifest.XXXXXX.json)"
  trap 'rm -f "${manifest}"' EXIT

  local_version="$(read_local_version)"
  log "Local version: ${local_version}"

  if ! fetch_remote_manifest "${manifest}"; then
    log_err "Failed to fetch remote manifest"
    exit 1
  fi

  remote_version="$(json_get "${manifest}" ".version")"
  if [[ -z "${remote_version}" || "${remote_version}" == "null" ]]; then
    log_err "Remote manifest missing .version"
    exit 1
  fi
  log "Remote version: ${remote_version}"

  if [[ "${FORCE_CHECK}" == "0" ]] && ! version_gt "${remote_version}" "${local_version}"; then
    log "No update available (${local_version} >= remote ${remote_version})"
    exit 0
  fi

  if [[ "${FORCE_CHECK}" == "1" ]] && [[ "${remote_version}" == "${local_version}" ]]; then
    log "Force check: versions equal — skipping apply"
    exit 0
  fi

  log "Update available: ${local_version} -> ${remote_version}"
  perform_update "${manifest}" "${remote_version}"
}

main "$@"
