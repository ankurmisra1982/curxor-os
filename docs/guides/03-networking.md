# Networking Guide

CurXor OS uses **two isolated network planes** on the MS-S1 MAX dual-NIC layout.

## MS-S1 MAX verified interface names (Jun 2026 unbox)

| Role | Marketing name | **Linux iface** | IP |
|------|----------------|-----------------|-----|
| COMMAND | Command Port | **`enp98s0`** | `10.0.0.1/24` |
| EGRESS | Egress Port | **`enp97s0`** | `10.77.0.1/24` |

Scripts read `scripts/lib/network-defaults.sh` (override with `CURXOR_USER_LAN_IFACE` / `CURXOR_MESH_IFACE`). Docs below use **Command Port / Egress Port** for the role; on MS-S1 MAX the iface names are **`enp98s0` / `enp97s0`**, not `eno1`/`eno2`.

## Strategic roles

| Port | Marketing name | Operator purpose |
|------|----------------|------------------|
| **Command Port** | **Command Port** | Laptop → Flight Command UI. Firewalled from the public internet. |
| **Egress Port** | **Egress Port** | Internet gateway for Digital Bridges — Alpaca trades, X posts, scrapers. **Unplug to kill all outbound agents.** |

Under the hood, the Egress Port also carries the local telemetry mesh for agent coordination. Captive portal and operator access stay on the Command Port only.

## Interface roles

| Interface | IP | Purpose | Configured by |
|-----------|-----|---------|---------------|
| **Command Port** (`enp98s0`) | `10.0.0.1/24` | User LAN, captive portal, Flight Command | `setup-captive-portal.sh` |
| **Egress Port** (`enp97s0`) | `10.77.0.1/24` | Digital Bridges + agent mesh (ZMQ broker) | `setup-mesh-network.sh` |

**Rule:** Never run captive portal DNS/DHCP on the Egress Port. Never bind the telemetry broker to the Command Port.

## Robotics mesh (Egress Port)

Installed automatically by `install-all.sh`:

```bash
sudo /opt/curxor/scripts/setup-mesh-network.sh
```

Creates `/etc/netplan/99-curxor-mesh.yaml` and applies `10.77.0.1/24` on the mesh NIC.

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

## Egress WAN (internet for Digital Bridges)

Mesh-only setup (`setup-mesh-network.sh`) gives **no default route** — Alpaca, X, OTA, and frontier Patron cannot reach the internet.

After Part 4 (Egress cable → home router):

```bash
sudo /opt/curxor/scripts/setup-egress-wan.sh
sudo /opt/curxor/scripts/verify-egress-wan.sh
```

This configures **dual-IP** on the Egress NIC:

| Address | Source | Purpose |
|---------|--------|---------|
| `10.77.0.1/24` | static | ZMQ mesh broker bind (always) |
| `192.168.x.x` (example) | router DHCP | default route + DNS for HTTPS egress |

Writes `/etc/netplan/99-curxor-egress-wan.yaml`, removes mesh-only drop-in, sets `/var/lib/curxor/.egress-wan-enabled` so `post-update.sh` preserves WAN after deploys.

**Kill switch:** unplug Egress cable — outbound agents stop; local Ollama on `127.0.0.1` keeps running.

## Captive portal (Command Port)

Smart-hub mode for onboarding phones/laptops without manual IP configuration:

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
```

| Layer | Behavior |
|-------|----------|
| **netplan** | Command Port static `10.0.0.1/24` |
| **dnsmasq** | DHCP `10.0.0.50–250` (address only — **no router/DNS push**); captive probe domains only |
| **iptables** | Command Port `:80` and `:443` → `127.0.0.1:3080` |
| **Persistence** | `iptables-persistent` saves rules across reboot |

Live dnsmasq config is **generated** by `setup-captive-portal.sh` (reference: `config/captive-portal/dnsmasq-captive.conf`).

### Design rule — never hijack client internet

The Command Port is a **management LAN**, not an internet gateway for laptops.

#### Root cause (old captive portal)

An earlier `setup-captive-portal.sh` pushed two settings that broke dual-homed laptops (Wi-Fi + COMMAND cable):

| Mechanism | Old behavior | Effect on laptop |
|-----------|--------------|------------------|
| DHCP `option:router` | Gateway `10.0.0.1` | COMMAND adapter steals default route; all internet traffic goes to the box |
| Wildcard DNS `address=/#/10.0.0.1` | Every name resolves to the box | `google.com` → `10.0.0.1`; browser shows captive portal or "no internet" |

With static laptop IP `10.0.0.2` and gateway `10.0.0.1`, the same hijack occurs even without DHCP.

**Changing COMMAND adapter DNS to your home router (e.g. `192.168.86.1`) does not fix this.** The router is not on the `10.0.0.0/24` subnet; the laptop still has no valid path to the internet over the COMMAND cable.

| Wrong (old) | Right (current) |
|-------------|-----------------|
| DHCP pushes `10.0.0.1` as default gateway | No `option:router` — clients keep their Wi-Fi/default route |
| Wildcard DNS `address=/#/10.0.0.1` | Only captive probe domains (`config/captive-portal/captive-dns-domains.txt`) + `curxor.local` |
| Laptop gateway `10.0.0.1` on COMMAND cable | Laptop `10.0.0.2/24`, **gateway blank**, DNS blank/automatic |
| Laptop DNS `192.168.86.1` on COMMAND adapter | DNS automatic (Wi-Fi resolver) or blank — never home-router IP on `10.0.0.x` |

#### Box-side fix (repo)

`setup-captive-portal.sh` now generates `/etc/dnsmasq.d/curxor-captive.conf` with:

- No `option:router`
- No `option:dns-server`
- Captive probe domains only (from `config/captive-portal/captive-dns-domains.txt`)

After upgrade on the box:

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
grep -E 'option:router|address=/#/' /etc/dnsmasq.d/curxor-captive.conf && echo BAD || echo OK
```

`verify-unbox-day.sh` warns if wildcard DNS or `option:router` is still present.

#### Dual-homed laptop (Wi-Fi + COMMAND cable simultaneously)

Operators keep **both** connections active. Wi-Fi carries internet; COMMAND cable reaches the box at `10.0.0.1` only. No need to unplug the cable for Google, deploy, or Cursor.

**Correct manual adapter settings (Windows):**

| Field | COMMAND USB Ethernet | Wi-Fi |
|-------|---------------------|-------|
| IP | `10.0.0.2` | Automatic (DHCP) |
| Mask | `255.255.255.0` | (automatic) |
| Gateway | **blank** | (automatic) |
| DNS | **blank / automatic** | (automatic) |

**Windows — one-time install (Administrator, from repo root):**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1
```

Registers scheduled tasks (logon + network plug-in) that run `setup-laptop-command-port.ps1 -Quiet`. Re-apply routing manually anytime:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-laptop-command-port.ps1
```

Flags: `-Quiet` (no banner), `-SkipVerification` (skip slow `Test-NetConnection`), `-CommandAlias "Ethernet 3"` when multiple adapters match.

The setup script uses `route add -p` (not `New-NetRoute -PolicyStore PersistentStore`, which is unavailable on many Windows builds). Avoid Unicode punctuation in `.ps1` strings when editing scripts on Windows.

**macOS:** `sudo ./scripts/setup-laptop-command-port.sh`

**Monitor during debugging:**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\monitor-laptop-connectivity.ps1
```

Logs to `wifi-box-monitor.log` in the repo root (Wi-Fi status, default gateway, internet ping, box `:3080`, DNS for `google.com`).

### User experience

1. Client joins Ethernet on Command Port (`enp98s0` on MS-S1)
2. Receives DHCP (IP + mask only) or uses static `10.0.0.2/24` with **no gateway**
3. Open **`http://10.0.0.1:3080/home`** — phones may auto-pop captive via probe domains + HTTP redirect
4. FRE wizard at `/setup` runs on first visit
5. **Wi-Fi internet on the same laptop stays up** when split-route helper is installed

**Optional:** With a monitor on the MS-S1, operators can skip the laptop path and open `http://127.0.0.1:3080` in a local browser — same dashboard, same FRE. Not the default golden path; see [Flight Command — on-box local display](07-flight-command-dashboard.md#on-box-local-display-optional--not-default).

## Firewall considerations

- Dashboard binds `0.0.0.0:3080` for captive access; inference stays on `127.0.0.1`
- Mesh ports `9100–9201` should only be reachable on Egress Port / mesh VLAN
- OTA downloads require outbound HTTPS to your release mirror

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Engine can't read vision | `ip addr show enp97s0` (mesh), broker logs, mesh IP in `engine.env` |
| Dashboard SSE empty | `CURXOR_MESH_BROKER_IP` in `dashboard.env`, broker running |
| No internet on box (bridges / OTA / frontier) | Egress cable → router; run `setup-egress-wan.sh`; `verify-egress-wan.sh` |
| Captive portal no redirect | dnsmasq status, iptables rules, Command Port has `10.0.0.1` |
| dnsmasq won't start | `bind-dynamic` + `bind-interfaces` conflict in `/etc/dnsmasq.conf` — re-run `setup-captive-portal.sh` |
| Laptop loses internet on COMMAND cable | Remove gateway/DNS on COMMAND adapter; run `install-laptop-command-port.ps1` (Windows) |
| Box still hijacks DNS | Re-run `sudo setup-captive-portal.sh` — confirm no `address=/#/` in `/etc/dnsmasq.d/curxor-captive.conf` |
| L2 OK but TCP to box fails | Box reboot clears stale ARP/neighbor state; on box: `ip neigh show dev enp98s0` — `STALE` entry for `10.0.0.2` MAC proves cable is correct |
| `curl` port 80 from box returns `000` | Normal — iptables redirect applies to **inbound clients**, not loopback from the box itself |
| Box health from box | `curl -sf http://127.0.0.1:3080/api/setup/status` and `curl -sf http://10.0.0.1:3080/api/setup/status` must be **200** |
| Browser shows box "down" | Use **`http://`** not `https://` (no TLS on appliance); restart browser or try incognito (HSTS/cache) |
| SSH fails from laptop | `~/.ssh/config` `HostName` must be **`10.0.0.1`**, not obsolete `192.168.86.211` |
| `install-laptop-command-port.ps1` seems hung | Fixed in repo: progress output during `schtasks`; initial run uses `-SkipVerification` (avoids slow `Test-NetConnection`) |

See [Operations & Troubleshooting](09-operations-troubleshooting.md) for the full field table.

## Related guides

- [Telemetry Mesh](06-telemetry-mesh.md)
- [Installation](01-installation.md)
- [Flight Command Dashboard](07-flight-command-dashboard.md)
