#!/usr/bin/env bash
# CurXor OS — Captive Portal Network Trap (smart-hub mode)
#
# Configures dnsmasq on eno1 (user-facing LAN) and iptables redirects so
# connected clients receive DHCP, resolve all DNS to the appliance, and
# hit the Next.js dashboard on port 3080 via HTTP/HTTPS.
#
# eno2 is NEVER touched — robotics mesh stays isolated.
#
# Usage: sudo /opt/curxor/scripts/setup-captive-portal.sh
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Network profile ───────────────────────────────────────────────────────────
USER_LAN_IFACE="${CURXOR_USER_LAN_IFACE:-eno1}"
MESH_IFACE="${CURXOR_MESH_IFACE:-eno2}"
APPLIANCE_IP="${CURXOR_APPLIANCE_IP:-10.0.0.1}"
APPLIANCE_CIDR="${CURXOR_APPLIANCE_CIDR:-10.0.0.1/24}"
DASHBOARD_PORT="${CURXOR_DASHBOARD_PORT:-3080}"

DNSMASQ_DROPIN="/etc/dnsmasq.d/curxor-captive.conf"
DNSMASQ_TEMPLATE="${CURXOR_ROOT}/config/captive-portal/dnsmasq-captive.conf"
NETPLAN_DROPIN="/etc/netplan/99-curxor-captive-eno1.yaml"
IPTABLES_COMMENT="curxor-captive"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

echo "==> CurXor Captive Portal Setup"
echo "    User LAN   : ${USER_LAN_IFACE} @ ${APPLIANCE_IP}"
echo "    Mesh (off) : ${MESH_IFACE} — not modified"
echo "    Dashboard  : 127.0.0.1:${DASHBOARD_PORT}"

# ── Preflight ─────────────────────────────────────────────────────────────────
if [[ ! -d "/sys/class/net/${USER_LAN_IFACE}" ]]; then
  echo "ERROR: Interface '${USER_LAN_IFACE}' not found." >&2
  exit 1
fi

if [[ ! -d "/sys/class/net/${MESH_IFACE}" ]]; then
  echo "WARN: Mesh interface '${MESH_IFACE}' not found — continuing (eno2 check skipped)."
fi

mkdir -p "${CURXOR_ROOT}/scripts" "${CURXOR_ROOT}/config/captive-portal"

# ── Packages ──────────────────────────────────────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends \
  dnsmasq \
  iptables \
  iptables-persistent \
  netfilter-persistent \
  iproute2 \
  netplan.io

# ── Static IP on eno1 (user-facing captive LAN) ─────────────────────────────
cat > "${NETPLAN_DROPIN}" <<EOF
# CurXor OS — captive portal user LAN (eno1 only)
network:
  version: 2
  ethernets:
    ${USER_LAN_IFACE}:
      addresses:
        - ${APPLIANCE_CIDR}
      optional: true
EOF
chmod 600 "${NETPLAN_DROPIN}"
netplan generate
netplan apply

ip link set "${USER_LAN_IFACE}" up
if ! ip -4 -o addr show dev "${USER_LAN_IFACE}" | grep -q "${APPLIANCE_IP}/"; then
  ip addr add "${APPLIANCE_CIDR}" dev "${USER_LAN_IFACE}" 2>/dev/null || true
fi

# ── dnsmasq — eno1 only, wildcard DNS → appliance ───────────────────────────
if [[ -f "${DNSMASQ_TEMPLATE}" ]]; then
  install -m 0644 "${DNSMASQ_TEMPLATE}" "${DNSMASQ_DROPIN}"
else
  cat > "${DNSMASQ_DROPIN}" <<EOF
interface=${USER_LAN_IFACE}
bind-interfaces
except-interface=lo
except-interface=${MESH_IFACE}
listen-address=${APPLIANCE_IP}
bind-dynamic
dhcp-range=10.0.0.50,10.0.0.250,255.255.255.0,12h
dhcp-option=option:router,${APPLIANCE_IP}
dhcp-option=option:dns-server,${APPLIANCE_IP}
address=/#/${APPLIANCE_IP}
no-resolv
no-hosts
EOF
fi

# Prevent systemd-resolved from binding :53 globally (conflicts with dnsmasq)
if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
  mkdir -p /etc/systemd/resolved.conf.d
  cat > /etc/systemd/resolved.conf.d/curxor-captive.conf <<'EOF'
[Resolve]
DNSStubListener=no
EOF
  systemctl restart systemd-resolved
fi

# Disable default dnsmasq config fragments that bind all interfaces
if [[ -f /etc/dnsmasq.conf ]]; then
  if ! grep -q "^# CurXor: disabled by setup-captive-portal" /etc/dnsmasq.conf; then
    sed -i 's/^port=/\#port=/' /etc/dnsmasq.conf 2>/dev/null || true
    sed -i 's/^interface=/\#interface=/' /etc/dnsmasq.conf 2>/dev/null || true
    sed -i 's/^bind-interfaces/\#bind-interfaces/' /etc/dnsmasq.conf 2>/dev/null || true
  fi
fi

systemctl enable dnsmasq
systemctl restart dnsmasq

# ── iptables — redirect eno1 :80/:443 → localhost:3080 ─────────────────────
remove_curxor_rules() {
  local table=$1
  local chain=$2
  while iptables -t "${table}" -L "${chain}" -n --line-numbers 2>/dev/null | grep -q "${IPTABLES_COMMENT}"; do
    local line
    line="$(iptables -t "${table}" -L "${chain}" -n --line-numbers | grep "${IPTABLES_COMMENT}" | head -1 | awk '{print $1}')"
    iptables -t "${table}" -D "${chain}" "${line}" 2>/dev/null || break
  done
}

# Idempotent re-run: strip prior CurXor rules
remove_curxor_rules nat PREROUTING
remove_curxor_rules filter INPUT

# HTTP/HTTPS on user LAN → Next.js dashboard
iptables -t nat -A PREROUTING -i "${USER_LAN_IFACE}" -p tcp --dport 80 \
  -m comment --comment "${IPTABLES_COMMENT}" \
  -j REDIRECT --to-ports "${DASHBOARD_PORT}"

iptables -t nat -A PREROUTING -i "${USER_LAN_IFACE}" -p tcp --dport 443 \
  -m comment --comment "${IPTABLES_COMMENT}" \
  -j REDIRECT --to-ports "${DASHBOARD_PORT}"

# Allow redirected traffic to reach Node listener
iptables -A INPUT -i "${USER_LAN_IFACE}" -p tcp --dport "${DASHBOARD_PORT}" \
  -m comment --comment "${IPTABLES_COMMENT}" \
  -j ACCEPT

iptables -A INPUT -i "${USER_LAN_IFACE}" -p udp --dport 67 \
  -m comment --comment "${IPTABLES_COMMENT}" \
  -j ACCEPT

iptables -A INPUT -i "${USER_LAN_IFACE}" -p udp --dport 53 \
  -m comment --comment "${IPTABLES_COMMENT}" \
  -j ACCEPT

iptables -A INPUT -i "${USER_LAN_IFACE}" -p tcp --dport 53 \
  -m comment --comment "${IPTABLES_COMMENT}" \
  -j ACCEPT

# ── Persist iptables across reboot ────────────────────────────────────────────
mkdir -p /etc/iptables
iptables-save > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6 2>/dev/null || true
netfilter-persistent save
systemctl enable netfilter-persistent

# ── Verification ──────────────────────────────────────────────────────────────
echo ""
echo "==> Captive portal active"
echo "    dnsmasq      : $(systemctl is-active dnsmasq) on ${USER_LAN_IFACE}"
echo "    DHCP range   : 10.0.0.50 – 10.0.0.250"
echo "    DNS wildcard : address=/#/${APPLIANCE_IP}"
echo "    HTTP redirect: ${USER_LAN_IFACE}:80  → 127.0.0.1:${DASHBOARD_PORT}"
echo "    HTTPS redirect: ${USER_LAN_IFACE}:443 → 127.0.0.1:${DASHBOARD_PORT}"
echo ""
echo "    Connect a client to ${USER_LAN_IFACE} — any URL should open the dashboard."
echo "    Robotics mesh (${MESH_IFACE}) remains untouched."
echo ""
ss -lun "sport = :53" 2>/dev/null | grep -E "${APPLIANCE_IP}|${USER_LAN_IFACE}" || true
iptables -t nat -L PREROUTING -n -v | grep "${IPTABLES_COMMENT}" || true
