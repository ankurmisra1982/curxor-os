#!/usr/bin/env bash
# CurXor OS — Verify robotics mesh broker on Egress Port (MS-S1: enp97s0)
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/curxor/telemetry-broker.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a; source "${ENV_FILE}"; set +a
fi

IFACE="${CURXOR_MESH_IFACE:-enp97s0}"
RED='\033[0;31m'; GRN='\033[0;32m'; YL='\033[1;33m'; NC='\033[0m'
FAIL=0
pass() { echo -e "${GRN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=1; }
warn() { echo -e "${YL}[WARN]${NC} $*"; }

echo "==> CurXor mesh verification (interface: ${IFACE})"

if ip link show "${IFACE}" &>/dev/null; then
  pass "interface ${IFACE} exists"
else
  fail "interface ${IFACE} not found"
fi

STATE="$(cat "/sys/class/net/${IFACE}/operstate" 2>/dev/null || echo down)"
if [[ "${STATE}" == "up" || "${STATE}" == "unknown" ]]; then
  pass "interface ${IFACE} operstate=${STATE}"
else
  fail "interface ${IFACE} is ${STATE} — run: ip link set ${IFACE} up"
fi

MESH_IP="$(ip -4 -o addr show dev "${IFACE}" | awk '{print $4}' | cut -d/ -f1 | head -1 || true)"
if [[ -n "${MESH_IP}" ]]; then
  pass "mesh IPv4: ${MESH_IP}"
else
  fail "no IPv4 on ${IFACE} — assign robotics mesh address"
fi

if systemctl is-active --quiet curxor-telemetry-broker; then
  pass "curxor-telemetry-broker service active"
else
  warn "service not running: sudo systemctl start curxor-telemetry-broker"
fi

VISION_XSUB="${CURXOR_VISION_XSUB_PORT:-9100}"
VISION_XPUB="${CURXOR_VISION_XPUB_PORT:-9101}"
MOTOR_XSUB="${CURXOR_MOTOR_XSUB_PORT:-9200}"
MOTOR_XPUB="${CURXOR_MOTOR_XPUB_PORT:-9201}"

if [[ -n "${MESH_IP}" ]]; then
  for PORT in "${VISION_XSUB}" "${VISION_XPUB}" "${MOTOR_XSUB}" "${MOTOR_XPUB}"; do
    if ss -ltn "sport = :${PORT}" 2>/dev/null | grep -q "${MESH_IP}:${PORT}"; then
      pass "listening ${MESH_IP}:${PORT}"
    else
      warn "not listening on ${MESH_IP}:${PORT} (broker may be stopped)"
    fi
  done

  if ss -ltn 2>/dev/null | grep -E ":(${VISION_XSUB}|${VISION_XPUB}|${MOTOR_XSUB}|${MOTOR_XPUB})" | grep -qv "${MESH_IP}"; then
    fail "broker port bound outside ${IFACE} — must bind strictly to mesh IP"
  fi
fi

if [[ "${FAIL}" -eq 0 ]]; then
  echo -e "\n${GRN}==> Mesh verification passed${NC}"
  echo "  Vision topic : ${CURXOR_TOPIC_VISION:-telemetry/vision_in}"
  echo "  Motor topic  : ${CURXOR_TOPIC_MOTOR:-telemetry/motor_out}"
  echo "  Publishers   : tcp://${MESH_IP}:${VISION_XSUB} (vision), tcp://${MESH_IP}:${MOTOR_XSUB} (motor)"
  echo "  Subscribers  : tcp://${MESH_IP}:${VISION_XPUB} (vision), tcp://${MESH_IP}:${MOTOR_XPUB} (motor)"
else
  echo -e "\n${RED}==> Mesh verification failed${NC}"
  exit 1
fi
