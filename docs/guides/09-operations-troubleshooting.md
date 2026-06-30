# Operations & Troubleshooting Guide

Day-2 operations for CurXor OS appliances in the field.

## Health checklist

Run after install, OTA, or network changes:

```bash
# Unbox day — full session (inventory + GPU + mesh + inference)
sudo CURXOR_CMD_IFACE=enp98s0 CURXOR_MESH_IFACE=enp97s0 \
  /opt/curxor/scripts/verify-unbox-day.sh --post-models

# Master target
systemctl status curxor-os.target
systemctl list-dependencies curxor-os.target

# Individual pillars
systemctl status curxor-compute curxor-telemetry-broker curxor-engine curxor-dashboard

# Network (MS-S1 MAX: enp98s0 Command, enp97s0 mesh)
ip addr show enp98s0
ip addr show enp97s0

# Inference
curl -sf http://127.0.0.1:11434/api/tags && echo "Ollama OK"
curl -sf http://127.0.0.1:8000/v1/models && echo "vLLM OK"

# Dashboard (on-box health — same whether browser is local or laptop over network)
curl -sf http://127.0.0.1:3080/api/setup/status

# Mesh
/opt/curxor/pillar-3-telemetry/scripts/verify-mesh.sh
```

## Log locations

| Component | Command / path |
|-----------|----------------|
| Engine | `journalctl -u curxor-engine -f` |
| Broker | `journalctl -u curxor-telemetry-broker -f` |
| Dashboard | `journalctl -u curxor-dashboard -f` |
| Compute | `docker compose -f /opt/curxor/pillar-1-compute/docker-compose.yml logs -f` |
| OTA | `/var/log/curxor/ota-update.log` or Flight Command → System Health |
| FRE state | `/etc/curxor/fre-state.json` |
| Claw profiles | `/etc/curxor/claw-profiles.json` |

## Common issues

### Stack won't start after boot

```bash
journalctl -u curxor-os.target -b
systemctl status curxor-telemetry-broker   # broker must bind Egress Port (10.77.0.1)
```

If mesh NIC has no IP:

```bash
sudo /opt/curxor/scripts/setup-mesh-network.sh
sudo systemctl restart curxor-telemetry-broker curxor-engine curxor-dashboard
```

### Engine running but no motor output

1. Confirm vision frames arriving: `journalctl -u curxor-engine | grep vision`
2. Check inference reachable: `curl http://127.0.0.1:11434/api/ps`
3. Verify mesh ports in `/etc/curxor/engine.env`
4. Increase log verbosity via journalctl

### Dashboard telemetry widgets empty

1. Broker running on `10.77.0.1`
2. `CURXOR_MESH_BROKER_IP` matches in `/etc/curxor/dashboard.env`
3. Restart dashboard after env change
4. Check SSE in browser devtools: `/api/stream/vision`, `/api/stream/motor`

### Ollama model not loaded / OOM

1. Reduce loaded models: `OLLAMA_MAX_LOADED_MODELS=1`
2. Use smaller quant or legacy model: `qwen3:8b` (or `qwen2.5:7b-instruct-q4_K_M` for old profiles)
3. Verify BIOS GPU heap ≥ 48 GB for VLA stacks
4. **`free -h` ~15 Gi on 64 GB + 48 GB UMA is expected** — check dashboard `gpuHeapGb: 48`

### OTA update failed / rolled back

```bash
sudo tail -100 /var/log/curxor/ota-update.log
ls -lt /var/backups/curxor/
```

Manual rollback:

```bash
sudo systemctl stop curxor-os.target
sudo tar -xzf /var/backups/curxor/curxor-pre-ota-0.1.0-YYYYMMDD-HHMMSS.tar.gz -C /
sudo systemctl restart curxor-os.target
```

### Captive portal not trapping clients

```bash
systemctl status dnsmasq
journalctl -u dnsmasq -n 20 --no-pager
sudo iptables -t nat -L -n | grep 3080
cat /etc/dnsmasq.d/curxor-captive.conf
```

If dnsmasq fails with `cannot set --bind-interfaces and --bind-dynamic`, re-run setup (comments out both in `/etc/dnsmasq.conf`):

```bash
sudo CURXOR_USER_LAN_IFACE=enp98s0 /opt/curxor/scripts/setup-captive-portal.sh
```

### Laptop loses internet when COMMAND cable is plugged in

The Command Port must **not** become the laptop's internet gateway.

#### Root cause

Old captive portal config pushed DHCP gateway `10.0.0.1` and wildcard DNS `address=/#/10.0.0.1`. A laptop with static `10.0.0.2` and gateway `10.0.0.1` has the same effect: default route and DNS poison `google.com` to the box. Setting COMMAND adapter DNS to a home router (e.g. `192.168.86.1`) does **not** help — that router is not reachable on `10.0.0.0/24`.

**Correct laptop settings:** IP `10.0.0.2/24`, gateway **blank**, DNS **blank/automatic**. Wi-Fi stays connected for internet.

**On the box** (one-time after upgrade):

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
grep -E 'option:router|address=/#/' /etc/dnsmasq.d/curxor-captive.conf && echo BAD || echo OK
sudo /opt/curxor/scripts/verify-unbox-day.sh   # warns on wildcard DNS or option:router
```

**On the laptop (Windows):**

```powershell
# One-time (Administrator, repo root)
powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1

# Re-apply routing anytime
powershell -ExecutionPolicy Bypass -File .\scripts\setup-laptop-command-port.ps1

# Debug loop (logs wifi-box-monitor.log)
powershell -ExecutionPolicy Bypass -File .\scripts\monitor-laptop-connectivity.ps1
```

**macOS:** `sudo ./scripts/setup-laptop-command-port.sh`

See [Networking — never hijack client internet](03-networking.md#design-rule--never-hijack-client-internet).

### COMMAND cable / dual-homed laptop — comprehensive troubleshooting

| Symptom | Likely cause | Fix / verify |
|---------|--------------|--------------|
| No internet when cable plugged in | Gateway or DNS on COMMAND adapter; old box wildcard DNS | Blank gateway/DNS on COMMAND; re-run `setup-captive-portal.sh` on box; run `install-laptop-command-port.ps1` |
| `google.com` resolves to `10.0.0.1` | Wildcard DNS on box or laptop using box as DNS | `grep address=/#/ /etc/dnsmasq.d/curxor-captive.conf` — must be empty; reset COMMAND DNS to automatic |
| Home router DNS on COMMAND adapter fails | Router not on `10.0.0.0/24` | Remove custom DNS; use Wi-Fi resolver only |
| Ethernet shows "No internet" in Windows | Expected with split-route | Wi-Fi still works; confirm `Resolve-DnsName google.com` returns real IPs |
| Browser cannot reach dashboard | Using `https://` or stale cache | Open **`http://10.0.0.1:3080/home`**; restart browser or incognito |
| SSH timeout / connection refused | Wrong `HostName` in `~/.ssh/config` | Set `HostName 10.0.0.1` (not `192.168.86.211`) |
| Ping/curl to `10.0.0.1` fails from laptop | Stale ARP on box, cable, or routing | On box: `ip neigh show dev enp98s0` — expect `10.0.0.2` MAC (STALE is OK); **box reboot** clears bad neighbor state |
| `curl http://10.0.0.1` from **on box** returns `000` | iptables redirect is for inbound clients only | Normal; use `curl -sf http://127.0.0.1:3080/api/setup/status` on box |
| Dashboard unreachable from laptop | Routing or dashboard down | On box: `curl -sf http://10.0.0.1:3080/api/setup/status` must be **200**; `systemctl status curxor-dashboard` |
| `install-laptop-command-port.ps1` appears hung | Silent `schtasks` + slow `Test-NetConnection` | Repo scripts now print progress; installer calls `-SkipVerification` on first run |
| `New-NetRoute -PolicyStore` fails | Not available on all Windows builds | Use `route add -p` via `setup-laptop-command-port.ps1` (repo default) |
| Script parse error on Windows | Unicode em dash or smart quotes in `.ps1` | Use ASCII only in PowerShell strings |

**Daily operator URLs (Wi-Fi + cable both connected):**

- Dashboard: **`http://10.0.0.1:3080/home`**
- SSH: **`ssh curxor`** (`HostName 10.0.0.1` in `~/.ssh/config`)

### Telemetry broker crash loop (pyzmq 27)

Symptom: `AttributeError: module 'zmq' has no attribute 'TCP_NODELAY'`.

Redeploy pillar-3 or remove `TCP_NODELAY` lines from installed `curxor_broker` package; restart broker. See [UNBOX-FIELD-LOG.md](../curxor-os/UNBOX-FIELD-LOG.md).

### Dashboard chat uses rules instead of LLM

1. Check Ollama: `curl http://127.0.0.1:11434/api/tags`
2. Check `CURXOR_DASHBOARD_INFERENCE_ENABLED=1` in `/etc/curxor/dashboard.env`
3. Restart compute then dashboard
4. System Health → compute metrics should show `backend: ollama`

### Dev server / QA smoke failures

- **Port in use:** another process on `:3080` — `npm run qa:local -- --port 3081`
- **500 / missing vendor chunk:** stale `.next` — `npm run qa:local -- --rebuild`
- **One-command QA:** `npm run qa:local` (sets dev-qa env, starts server, runs 14 checks, stops)
- **Manual:** export `CURXOR_APP_FRE_DIR=scripts/dev-qa/app-fre` plus paths in [dev-qa README](../../pillar-4-dashboard/scripts/dev-qa/README.md)
- See [Quick Start](00-quick-start.md) dev section

### Optional LAN token on mutating APIs

When `CURXOR_LAN_AUTH_TOKEN` is set in `dashboard.env`, LAN clients must send `Authorization: Bearer <token>` or `X-CurXor-Token` on `/api/mesh/*`, `/api/setup/provision`, `/api/claw/create`, and app FRE POST. Localhost (`127.0.0.1`) always bypasses.

### FRE wizard loop / can't reach apps

Reset FRE (see [Installation Guide](01-installation.md)) and restart dashboard.

### Shell script fails with `pipefail: invalid option` (CRLF)

Scripts copied from a Windows laptop may have `\r` line endings. On the box **before** `bash script.sh`:

```bash
sed -i 's/\r$//' /path/to/script.sh
```

For all scripts under `/opt/curxor`: `sudo find /opt/curxor -name '*.sh' -exec sed -i 's/\r$//' {} +`  
Founder detail: [FOUNDER-PATCH-RUNBOOK.md](../curxor-os/FOUNDER-PATCH-RUNBOOK.md) — CRLF section.

## Restart procedures

| Scope | Command |
|-------|---------|
| Full stack | `sudo systemctl restart curxor-os.target` |
| Inference only | `sudo systemctl restart curxor-compute` |
| Re-pull models | `sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models` |
| Dashboard rebuild | `cd /opt/curxor/pillar-4-dashboard && npm ci && npm run build && sudo systemctl restart curxor-dashboard` |
| Apply new claw profile | `sudo /opt/curxor/scripts/apply-active-claw.sh` |

## Backup strategy

| Data | Location | Backed up by OTA? |
|------|----------|-------------------|
| Application tree | `/opt/curxor/` | Yes (pre-OTA tarball) |
| Models | `/var/lib/curxor/models/` | No — separate backup recommended |
| Config | `/etc/curxor/` | Partially (not in /opt/curxor) |
| FRE / claws | `/etc/curxor/*.json` | No |

Back up `/etc/curxor/` separately before major upgrades:

```bash
sudo tar -czf /var/backups/curxor/etc-curxor-$(date +%F).tar.gz -C /etc curxor
```

## Performance tuning

| Knob | File | Effect |
|------|------|--------|
| `CURXOR_MIN_REASON_INTERVAL_MS` | engine.env | Reduce LLM call rate |
| `CURXOR_MOTOR_CONFLATE=1` | telemetry-broker.env | Last-value motor frames only |
| `CURXOR_VISION_RCVHWM` | telemetry-broker.env | Vision buffer depth |
| `CURXOR_DASHBOARD_INFERENCE_ENABLED` | dashboard.env | Disable dashboard LLM (keep engine inference) |
| `CURXOR_INFERENCE_TIMEOUT_MS` | dashboard.env | Chat timeout before fallback |
| `OLLAMA_MAX_LOADED_MODELS` | compute.env | UMA pressure |

## Related guides

- [Quick Start](00-quick-start.md)
- [Installation](01-installation.md)
- [OTA Updates](08-ota-updates.md)
- [Networking](03-networking.md)
