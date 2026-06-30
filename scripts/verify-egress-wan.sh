#!/usr/bin/env bash
# CurXor OS — verify Egress Port WAN (mesh + internet)
set -euo pipefail

if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/network-defaults.sh
source "${SCRIPT_DIR}/lib/network-defaults.sh"

MESH_IFACE="${CURXOR_MESH_IFACE}"
MESH_IP="${CURXOR_MESH_BIND_IP}"
FLAG_FILE="${CURXOR_EGRESS_WAN_FLAG:-/var/lib/curxor/.egress-wan-enabled}"

RED='\033[0;31m'
GRN='\033[0;32m'
YL='\033[1;33m'
NC='\033[0m'
FAIL=0
pass() { echo -e "${GRN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=1; }
warn() { echo -e "${YL}[WARN]${NC} $*"; }

echo "==> CurXor egress WAN verification (${MESH_IFACE})"

if [[ -f "${FLAG_FILE}" ]]; then
  pass "egress WAN enabled flag present"
else
  warn "flag missing (${FLAG_FILE}) — run setup-egress-wan.sh"
fi

if ip -4 addr show dev "${MESH_IFACE}" 2>/dev/null | grep -q "inet ${MESH_IP}/"; then
  pass "mesh IP ${MESH_IP} on ${MESH_IFACE}"
else
  fail "mesh IP ${MESH_IP} not on ${MESH_IFACE}"
fi

ROUTER_IP="$(ip -4 -o addr show dev "${MESH_IFACE}" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | grep -v "^${MESH_IP}$" | head -1 || true)"
if [[ -n "${ROUTER_IP}" ]]; then
  pass "router DHCP IP on ${MESH_IFACE}: ${ROUTER_IP}"
else
  warn "no second IPv4 on ${MESH_IFACE} (DHCP from router may be pending)"
fi

if ip route show default 2>/dev/null | grep -q .; then
  pass "default route: $(ip route show default | head -1)"
else
  fail "no default route — Digital Bridges cannot reach the internet"
fi

if ping -c 1 -W 3 8.8.8.8 &>/dev/null; then
  pass "ping 8.8.8.8"
else
  warn "ping 8.8.8.8 failed (ICMP may be blocked — trying HTTPS)"
fi

if curl -sf --max-time 10 -o /dev/null https://cloudflare.com/cdn-cgi/trace; then
  pass "HTTPS egress (cloudflare trace)"
else
  fail "HTTPS egress probe failed"
fi

if [[ -f /etc/curxor/telemetry-broker.env ]] && grep -q "^CURXOR_MESH_BIND_IP=${MESH_IP}" /etc/curxor/telemetry-broker.env; then
  pass "telemetry-broker.env CURXOR_MESH_BIND_IP=${MESH_IP}"
else
  warn "CURXOR_MESH_BIND_IP not pinned to ${MESH_IP} in telemetry-broker.env"
fi

if [[ "${FAIL}" -eq 0 ]]; then
  echo -e "${GRN}==> Egress WAN verification passed${NC}"
else
  echo -e "${RED}==> Egress WAN verification failed${NC}" >&2
  exit 1
fi
