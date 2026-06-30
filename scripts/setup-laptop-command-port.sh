#!/usr/bin/env bash
# macOS / Linux — split-route laptop networking for the COMMAND cable.
# Wi-Fi (or other uplink) keeps internet; COMMAND Ethernet reaches 10.0.0.1 only.
#
# Usage:
#   sudo ./scripts/setup-laptop-command-port.sh
#   sudo ./scripts/setup-laptop-command-port.sh en7
set -euo pipefail

COMMAND_IP="${CURXOR_LAPTOP_COMMAND_IP:-10.0.0.2}"
BOX_IP="${CURXOR_BOX_IP:-10.0.0.1}"
NETMASK="255.255.255.0"
IFACE="${1:-}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This helper targets macOS. On Windows use setup-laptop-command-port.ps1." >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0 [iface]" >&2
  exit 1
fi

if [[ -z "${IFACE}" ]]; then
  IFACE="$(networksetup -listallhardwareports | awk '
    /Hardware Port: (USB|Thunderbolt|Ethernet)/ { port=$0; getline; if ($2 != "") print $2 }
  ' | head -1)"
fi

if [[ -z "${IFACE}" ]]; then
  echo "No COMMAND USB/Ethernet interface found. Pass iface name explicitly." >&2
  exit 1
fi

SERVICE="$(networksetup -listallhardwareports | awk -v dev="${IFACE}" '
  { block = block $0 "\n" }
  /Hardware Port:/ { block = $0 "\n" }
  $0 ~ "Device: " dev { print block; exit }
' | awk -F": " "/Hardware Port:/{print \$2}" | head -1)"

if [[ -z "${SERVICE}" ]]; then
  echo "Could not map ${IFACE} to a networksetup service." >&2
  exit 1
fi

echo "==> COMMAND service: ${SERVICE} (${IFACE})"

networksetup -setmanual "${SERVICE}" "${COMMAND_IP}" "${NETMASK}"
networksetup -setdnsservers "${SERVICE}" empty

route -n delete default -interface "${IFACE}" 2>/dev/null || true
route -n delete -net "${BOX_IP}" 2>/dev/null || true
route -n add -net 10.0.0.0/24 "${BOX_IP}" -interface "${IFACE}"

# Prefer Wi-Fi for default route when both are active.
WIFI_SERVICE="$(networksetup -listallnetworkservices | grep -E '^Wi-Fi$' || true)"
if [[ -n "${WIFI_SERVICE}" ]]; then
  networksetup -ordernetworkservices "${WIFI_SERVICE}" "${SERVICE}" 2>/dev/null || true
fi

echo ""
echo "Done."
echo "  Dashboard: http://${BOX_IP}:3080/home"
echo "  Internet stays on Wi-Fi; COMMAND cable is 10.0.0.x only."
