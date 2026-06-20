#!/usr/bin/env bash
# CurXor OS — Configure robotics mesh NIC (eno2) for Pillar 3 broker
set -euo pipefail

MESH_IFACE="${CURXOR_MESH_IFACE:-eno2}"
MESH_IP="${CURXOR_MESH_BIND_IP:-10.77.0.1}"
MESH_CIDR="${CURXOR_MESH_CIDR:-24}"
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
# CurXor OS — robotics mesh (Port 2 / eno2). Do not use for captive portal.
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
