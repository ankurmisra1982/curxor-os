# Networking Guide

CurXor OS uses **two isolated network planes** on the MS-S1 MAX dual-NIC layout.

## Interface roles

| Interface | IP | Purpose | Configured by |
|-----------|-----|---------|---------------|
| **eno1** | `10.0.0.1/24` | User LAN, captive portal, dashboard access | `setup-captive-portal.sh` |
| **eno2** | `10.77.0.1/24` | Robotics mesh, ZMQ broker only | `setup-mesh-network.sh` |

**Rule:** Never run captive portal DNS/DHCP on eno2. Never bind the telemetry broker to eno1.

## Robotics mesh (eno2)

Installed automatically by `install-all.sh`:

```bash
sudo /opt/curxor/scripts/setup-mesh-network.sh
```

Creates `/etc/netplan/99-curxor-mesh.yaml` and applies `10.77.0.1/24` on eno2.

### Broker endpoints (on mesh IP)

| Traffic | Publishers connect | Subscribers connect |
|---------|-------------------|---------------------|
| Vision | `tcp://10.77.0.1:9100` (XSUB) | `tcp://10.77.0.1:9101` (XPUB) |
| Motor | `tcp://10.77.0.1:9200` (XSUB) | `tcp://10.77.0.1:9201` (XPUB) |

Topics:

- `telemetry/vision_in`
- `telemetry/motor_out`

Verify:

```bash
/opt/curxor/pillar-3-telemetry/scripts/verify-mesh.sh
systemctl status curxor-telemetry-broker
```

### Environment variables (all pillars)

```bash
CURXOR_MESH_BROKER_IP=10.77.0.1
CURXOR_VISION_XPUB_PORT=9101
CURXOR_MOTOR_XSUB_PORT=9200    # engine publishes here
CURXOR_MOTOR_XPUB_PORT=9201    # dashboard subscribes here
```

## Captive portal (eno1)

Smart-hub mode for onboarding phones/laptops without manual IP configuration:

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
```

| Layer | Behavior |
|-------|----------|
| **netplan** | eno1 static `10.0.0.1/24` |
| **dnsmasq** | DHCP `10.0.0.50–250`, wildcard DNS `address=/#/10.0.0.1` |
| **iptables** | eno1 `:80` and `:443` → `127.0.0.1:3080` |
| **Persistence** | `iptables-persistent` saves rules across reboot |

Template: `config/captive-portal/dnsmasq-captive.conf`

### User experience

1. Client joins Wi‑Fi/Ethernet on eno1
2. Receives DHCP from appliance
3. Any DNS query resolves to `10.0.0.1`
4. HTTP/HTTPS hits dashboard on port 3080
5. FRE wizard at `/setup` runs on first visit

## Firewall considerations

- Dashboard binds `0.0.0.0:3080` for captive access; inference stays on `127.0.0.1`
- Mesh ports `9100–9201` should only be reachable on eno2 robotics VLAN
- OTA downloads require outbound HTTPS to your release mirror

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Engine can't read vision | `ip addr show eno2`, broker logs, mesh IP in `engine.env` |
| Dashboard SSE empty | `CURXOR_MESH_BROKER_IP` in `dashboard.env`, broker running |
| Captive portal no redirect | dnsmasq status, iptables rules, eno1 has `10.0.0.1` |
| Clients get wrong DNS | Confirm wildcard is `10.0.0.1` not mesh IP `10.77.0.1` |

## Related guides

- [Telemetry Mesh](06-telemetry-mesh.md)
- [Installation](01-installation.md)
- [Flight Command Dashboard](07-flight-command-dashboard.md)
