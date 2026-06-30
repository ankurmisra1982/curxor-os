# CurXor OS — MS-S1 MAX network defaults (source from setup/verify scripts)
#
# Verified unbox (Jun 2026): built-in NICs are NOT eno1/eno2 on MS-S1 MAX.
#   Command / captive portal : enp98s0 @ 10.0.0.1
#   Egress / robotics mesh   : enp97s0 @ 10.77.0.1
#
# Override per box: export CURXOR_USER_LAN_IFACE / CURXOR_MESH_IFACE before scripts.
# Docs still say "Command Port" / "Egress Port" for the role names.

export CURXOR_USER_LAN_IFACE="${CURXOR_USER_LAN_IFACE:-enp98s0}"
export CURXOR_CMD_IFACE="${CURXOR_CMD_IFACE:-${CURXOR_USER_LAN_IFACE}}"
export CURXOR_MESH_IFACE="${CURXOR_MESH_IFACE:-enp97s0}"
export CURXOR_APPLIANCE_IP="${CURXOR_APPLIANCE_IP:-10.0.0.1}"
export CURXOR_APPLIANCE_CIDR="${CURXOR_APPLIANCE_CIDR:-10.0.0.1/24}"
export CURXOR_MESH_BIND_IP="${CURXOR_MESH_BIND_IP:-10.77.0.1}"
export CURXOR_MESH_CIDR="${CURXOR_MESH_CIDR:-24}"
# Set by setup-egress-wan.sh; post-update re-applies WAN when present.
export CURXOR_EGRESS_WAN_FLAG="${CURXOR_EGRESS_WAN_FLAG:-/var/lib/curxor/.egress-wan-enabled}"
