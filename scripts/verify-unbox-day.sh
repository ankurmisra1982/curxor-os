#!/usr/bin/env bash
# CurXor OS — Unbox day verification (MS-S1 MAX CTO session)
# Runs inventory → GPU/ROCm → Command/Egress NIC roles → mesh → inference smoke → stack health.
#
# Usage:
#   sudo /opt/curxor/scripts/verify-unbox-day.sh
#   sudo /opt/curxor/scripts/verify-unbox-day.sh --post-models   # after deploy.sh --pull-models
#
# Paste the "GOLDEN PATH NOTES" block at the end into install addendum / issues.
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/network-defaults.sh
source "${SCRIPT_DIR}/lib/network-defaults.sh"

CMD_IFACE="${CURXOR_CMD_IFACE}"
MESH_IFACE="${CURXOR_MESH_IFACE}"
CMD_IP="${CURXOR_APPLIANCE_IP}"
MESH_IP="${CURXOR_MESH_BIND_IP}"
DASHBOARD_PORT="${CURXOR_DASHBOARD_PORT:-3080}"
POST_MODELS=false

for arg in "$@"; do
  case "${arg}" in
    --post-models) POST_MODELS=true ;;
    -h|--help)
      sed -n '2,9p' "$0"
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
WARN=0
MESH_RESULT="not run"
pass() { echo -e "${GRN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=1; }
warn() { echo -e "${YL}[WARN]${NC} $*"; WARN=$((WARN + 1)); }
section() { echo ""; echo "══════════════════════════════════════════════════════════"; echo "  $*"; echo "══════════════════════════════════════════════════════════"; }

HOSTNAME="$(hostname)"
KERNEL="$(uname -r)"
OS_RELEASE="unknown"
if command -v lsb_release &>/dev/null; then
  OS_RELEASE="$(lsb_release -ds 2>/dev/null || echo unknown)"
fi

section "A. Inventory"
echo "hostname : ${HOSTNAME}"
echo "kernel   : ${KERNEL}"
echo "os       : ${OS_RELEASE}"
echo "date     : $(date -Is 2>/dev/null || date)"
echo ""
uname -a
echo ""
if command -v lsb_release &>/dev/null; then lsb_release -a 2>/dev/null || true; fi
echo ""
echo "--- ip link (enp/eth) ---"
ip link show 2>/dev/null | grep -E '^[0-9]+:|enp|eno|eth' || ip link show
echo ""
echo "--- storage ---"
df -h / /var/lib/curxor 2>/dev/null || df -h /
echo ""
echo "--- memory ---"
free -h
echo ""
echo "    (MS-S1 64 GB + 48 GB UMA: ~15 Gi in free -h is normal — rest is GPU carve-out)"
echo ""
if command -v rocm-smi &>/dev/null; then
  pass "rocm-smi present (pre-install inventory)"
  rocm-smi --showproductname 2>/dev/null || rocm-smi 2>/dev/null | head -6 || true
else
  warn "rocm-smi not installed yet — expected before install-all completes pillar-1"
fi
if command -v docker &>/dev/null; then
  pass "docker present"
  docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null | head -8 || true
else
  warn "docker not installed yet"
fi

section "B. NIC roles (${CMD_IFACE} command · ${MESH_IFACE} mesh)"
if ip link show "${CMD_IFACE}" &>/dev/null; then
  pass "command interface ${CMD_IFACE} exists"
else
  fail "command interface ${CMD_IFACE} missing — relabel cables / fix netplan"
fi
if ip link show "${MESH_IFACE}" &>/dev/null; then
  pass "mesh interface ${MESH_IFACE} exists"
else
  fail "mesh interface ${MESH_IFACE} missing — relabel cables / fix netplan"
fi

CMD_ADDR="$(ip -4 -o addr show dev "${CMD_IFACE}" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1 || true)"
MESH_HAS_MESH_IP=false
if ip -4 addr show dev "${MESH_IFACE}" 2>/dev/null | grep -q "inet ${MESH_IP}/"; then
  MESH_HAS_MESH_IP=true
fi
MESH_ADDR="$(ip -4 -o addr show dev "${MESH_IFACE}" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1 || true)"

if [[ "${CMD_ADDR}" == "${CMD_IP}" ]]; then
  pass "${CMD_IFACE} IPv4 ${CMD_ADDR} (Command Port)"
else
  if [[ -n "${CMD_ADDR}" ]]; then
    warn "${CMD_IFACE} is ${CMD_ADDR}, expected ${CMD_IP} — run setup-captive-portal.sh"
  else
    warn "no IPv4 on ${CMD_IFACE} — run: sudo ${CURXOR_ROOT}/scripts/setup-captive-portal.sh"
  fi
fi

if [[ "${MESH_HAS_MESH_IP}" == true ]]; then
  pass "${MESH_IFACE} has mesh IPv4 ${MESH_IP} (robotics mesh)"
elif [[ -n "${MESH_ADDR}" ]]; then
  warn "${MESH_IFACE} missing ${MESH_IP} (has ${MESH_ADDR}) — run setup-mesh-network.sh or setup-egress-wan.sh"
else
  warn "no IPv4 on ${MESH_IFACE} — run: sudo ${CURXOR_ROOT}/scripts/setup-mesh-network.sh"
fi

if systemctl is-active --quiet dnsmasq 2>/dev/null; then
  pass "dnsmasq active (captive portal DHCP/DNS)"
  if [[ -f /etc/dnsmasq.d/curxor-captive.conf ]] && grep -q 'address=/#/' /etc/dnsmasq.d/curxor-captive.conf; then
    warn "dnsmasq still has wildcard address=/#/ — re-run setup-captive-portal.sh (hijacks laptop internet)"
  fi
  if [[ -f /etc/dnsmasq.d/curxor-captive.conf ]] && grep -q 'option:router' /etc/dnsmasq.d/curxor-captive.conf; then
    warn "dnsmasq still pushes option:router — re-run setup-captive-portal.sh"
  fi
else
  warn "dnsmasq not active — captive portal optional until operator LAN test"
fi

section "C. GPU / ROCm (gfx1151)"
GPU_SCRIPT="${CURXOR_ROOT}/pillar-1-compute/scripts/verify-gpu.sh"
if [[ -x "${GPU_SCRIPT}" ]]; then
  if "${GPU_SCRIPT}"; then
    pass "verify-gpu.sh passed"
  else
    fail "verify-gpu.sh failed — fix ROCm/Docker before deploy.sh"
  fi
else
  warn "verify-gpu.sh not found at ${GPU_SCRIPT} — rsync repo to ${CURXOR_ROOT} first"
fi

if command -v rocminfo &>/dev/null; then
  if rocminfo 2>&1 | grep -qi "gfx1151\|gfx1150"; then
    pass "rocminfo reports gfx115x"
  else
    warn "rocminfo missing gfx1151 — set HSA_OVERRIDE_GFX_VERSION=11.5.1"
    rocminfo 2>/dev/null | grep -i "marketing\|name" | head -5 || true
  fi
fi

if command -v rocm-smi &>/dev/null; then
  echo ""
  echo "--- rocm-smi (post-BIOS UMA) ---"
  rocm-smi --showmeminfo vram 2>/dev/null || rocm-smi --showmeminfo 2>/dev/null || rocm-smi 2>/dev/null | head -10 || true
fi

section "D. Robotics mesh (${MESH_IFACE:-mesh} broker)"
MESH_SCRIPT="${CURXOR_ROOT}/pillar-3-telemetry/scripts/verify-mesh.sh"
if [[ -x "${MESH_SCRIPT}" ]]; then
  if "${MESH_SCRIPT}"; then
    pass "verify-mesh.sh passed"
    MESH_RESULT="PASS"
  else
    fail "verify-mesh.sh failed — broker must bind ${MESH_IP} only"
    MESH_RESULT="FAIL"
  fi
else
  warn "verify-mesh.sh not found — run install-all.sh first"
  MESH_RESULT="pending"
fi

section "E. Inference smoke"
if curl -sf "http://127.0.0.1:11434/api/tags" &>/dev/null; then
  pass "Ollama responding on :11434"
  TAGS_JSON="$(curl -s "http://127.0.0.1:11434/api/tags")"
  echo "${TAGS_JSON}" | head -c 400
  echo ""
  if [[ "${POST_MODELS}" == true ]]; then
    for EXPECT in moondream qwen3; do
      if echo "${TAGS_JSON}" | grep -q "${EXPECT}"; then
        pass "Ollama has ${EXPECT} family weights"
      else
        fail "Ollama missing ${EXPECT} — check compute.env + deploy.sh --pull-models"
      fi
    done
    if [[ -f /etc/curxor/compute.env ]]; then
      # shellcheck disable=SC1091
      set -a; source /etc/curxor/compute.env; set +a
      if [[ "${CURXOR_TOTAL_RAM_GB:-64}" -ge 128 && -n "${OLLAMA_EXTRA_MODELS:-}" ]]; then
        IFS=',' read -ra EXTRA <<< "${OLLAMA_EXTRA_MODELS}"
        for m in "${EXTRA[@]}"; do
          m="$(echo "$m" | xargs)"
          [[ -z "${m}" ]] && continue
          key="${m%%:*}"
          if echo "${TAGS_JSON}" | grep -q "${key}"; then
            pass "Ollama has extra model ${m}"
          else
            warn "Ollama missing Pro 128 extra model ${m}"
          fi
        done
      fi
    fi
  fi
else
  if [[ "${POST_MODELS}" == true ]]; then
    fail "Ollama not responding — deploy.sh --pull-models may have failed"
  else
    warn "Ollama not up yet — run: sudo ${CURXOR_ROOT}/pillar-1-compute/scripts/deploy.sh --pull-models"
  fi
fi

if curl -sf "http://127.0.0.1:${DASHBOARD_PORT}/api/setup/status" &>/dev/null; then
  pass "dashboard /api/setup/status OK"
else
  warn "dashboard not responding on :${DASHBOARD_PORT} — check curxor-dashboard service"
fi

if curl -sf "http://127.0.0.1:${DASHBOARD_PORT}/api/metrics/compute" &>/dev/null; then
  pass "dashboard compute metrics endpoint OK"
  if command -v jq &>/dev/null; then
    curl -s "http://127.0.0.1:${DASHBOARD_PORT}/api/metrics/compute" | jq -c . 2>/dev/null | head -c 500
    echo ""
  fi
fi

section "F. systemd stack"
for UNIT in curxor-os.target curxor-compute curxor-telemetry-broker curxor-engine curxor-dashboard; do
  if systemctl is-active --quiet "${UNIT}" 2>/dev/null; then
    pass "${UNIT} active"
  elif systemctl list-unit-files "${UNIT}" &>/dev/null | grep -q "${UNIT}"; then
    warn "${UNIT} installed but not active"
  else
    warn "${UNIT} not installed — run install-all.sh"
  fi
done

section "H. Egress WAN (Digital Bridges / OTA / frontier)"
EGRESS_VERIFY="${CURXOR_ROOT}/scripts/verify-egress-wan.sh"
if [[ -x "${EGRESS_VERIFY}" ]]; then
  if "${EGRESS_VERIFY}"; then
    pass "egress WAN verification"
  else
    warn "egress WAN not ready — Egress cable → router, then: sudo ${CURXOR_ROOT}/scripts/setup-egress-wan.sh"
  fi
else
  if ip route show default 2>/dev/null | grep -q .; then
    pass "default route present (egress WAN likely up)"
  else
    warn "no default route on box — run setup-egress-wan.sh after Egress → router cable"
  fi
fi

section "GOLDEN PATH NOTES (paste into docs/issues)"
cat <<EOF
# CurXor unbox verification — ${HOSTNAME} — $(date -Is 2>/dev/null || date)
- OS: ${OS_RELEASE} · kernel ${KERNEL}
- Path: clean Ubuntu vs vendor image → (record A or B)
- ${CMD_IFACE}: ${CMD_ADDR:-<none>} (want ${CMD_IP})
- ${MESH_IFACE}: ${MESH_ADDR:-<none>} (want ${MESH_IP})
- rocminfo gfx1151: $(rocminfo 2>/dev/null | grep -oi 'gfx115[0-9]*' | head -1 || echo 'not checked')
- Ollama :11434: $(curl -sf http://127.0.0.1:11434/api/tags >/dev/null && echo OK || echo pending)
- verify-mesh: ${MESH_RESULT}
- Failures: ${FAIL} · Warnings: ${WARN}
EOF

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  if [[ "${WARN}" -gt 0 ]]; then
    echo -e "${YL}==> Unbox verification passed with ${WARN} warning(s)${NC}"
  else
    echo -e "${GRN}==> Unbox verification passed${NC}"
  fi
  exit 0
else
  echo -e "${RED}==> Unbox verification FAILED — fix items above before tagging release${NC}"
  exit 1
fi
