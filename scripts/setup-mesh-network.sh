#!/usr/bin/env bash
# CurXor OS — Configure robotics mesh NIC (Egress Port) for Pillar 3 broker
set -euo pipefail

if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/network-defaults.sh
source "${SCRIPT_DIR}/lib/network-defaults.sh"

EGRESS_WAN_SCRIPT="${SCRIPT_DIR}/setup-egress-wan.sh"
if [[ -f "${CURXOR_EGRESS_WAN_FLAG}" && -x "${EGRESS_WAN_SCRIPT}" ]]; then
  echo "==> Egress WAN flag set — delegating to setup-egress-wan.sh"
  exec "${EGRESS_WAN_SCRIPT}"
fi

MESH_IFACE="${CURXOR_MESH_IFACE}"
MESH_IP="${CURXOR_MESH_BIND_IP}"
MESH_CIDR="${CURXOR_MESH_CIDR}"
NETPLAN_DROPIN="/etc/netplan/99-curxor-mesh.yaml"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if ! ip link show "${MESH_IFACE}" &>/dev/null; then
  echo "WARNING: interface ${MESH_IFACE} not found — skip mesh setup" >&2
  exit 0
fi

echo "==> CurXor mesh network on ${MESH_IFACE} -> ${MESH_IP}/${MESH_CIDR}"

cat > "${NETPLAN_DROPIN}" <<EOF
# CurXor OS — robotics mesh (Egress Port). Do not use for captive portal.
network:
  version: 2
  ethernets:
    ${MESH_IFACE}:
      dhcp4: false
      dhcp6: false
      addresses:
        - ${MESH_IP}/${MESH_CIDR}
EOF
chmod 600 "${NETPLAN_DROPIN}"

if command -v netplan &>/dev/null; then
  netplan apply
else
  ip addr flush dev "${MESH_IFACE}" 2>/dev/null || true
  ip addr add "${MESH_IP}/${MESH_CIDR}" dev "${MESH_IFACE}"
  ip link set "${MESH_IFACE}" up
fi

grep -q "^CURXOR_MESH_BIND_IP=" /etc/curxor/telemetry-broker.env 2>/dev/null && \
  sed -i "s|^CURXOR_MESH_BIND_IP=.*|CURXOR_MESH_BIND_IP=${MESH_IP}|" /etc/curxor/telemetry-broker.env || true

echo "==> Mesh ready: ${MESH_IFACE}=${MESH_IP}/${MESH_CIDR}"
