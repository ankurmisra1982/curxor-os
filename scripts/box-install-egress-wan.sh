#!/usr/bin/env bash
# One-shot: install + run egress WAN on the appliance (run ON BOX with sudo).
set -euo pipefail
sed -i 's/\r$//' /tmp/setup-egress-wan.sh /tmp/verify-egress-wan.sh /tmp/setup-mesh-network.sh /tmp/network-defaults.sh 2>/dev/null || true
mkdir -p /opt/curxor/scripts/lib /var/lib/curxor
cp /tmp/setup-egress-wan.sh /tmp/verify-egress-wan.sh /tmp/setup-mesh-network.sh /opt/curxor/scripts/
cp /tmp/network-defaults.sh /opt/curxor/scripts/lib/
chmod +x /opt/curxor/scripts/setup-egress-wan.sh /opt/curxor/scripts/verify-egress-wan.sh /opt/curxor/scripts/setup-mesh-network.sh
bash /opt/curxor/scripts/setup-egress-wan.sh
bash /opt/curxor/scripts/verify-egress-wan.sh
