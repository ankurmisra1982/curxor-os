# Operations & Troubleshooting Guide

Day-2 operations for CurXor OS appliances in the field.

## Health checklist

Run after install, OTA, or network changes:

```bash
# Master target
systemctl status curxor-os.target
systemctl list-dependencies curxor-os.target

# Individual pillars
systemctl status curxor-compute curxor-telemetry-broker curxor-engine curxor-dashboard

# Network
ip addr show eno1
ip addr show eno2

# Inference
curl -sf http://127.0.0.1:11434/api/tags && echo "Ollama OK"
curl -sf http://127.0.0.1:8000/v1/models && echo "vLLM OK"

# Dashboard
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
systemctl status curxor-telemetry-broker   # broker must bind eno2
```

If eno2 has no IP:

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
2. Use smaller quant: `qwen2.5:7b-instruct-q4_K_M`
3. Verify BIOS GPU heap ≥ 48 GB for VLA stacks
4. Check UMA usage in dashboard Compute widget or `free -h`

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
sudo iptables -t nat -L -n | grep 3080
cat /etc/dnsmasq.d/curxor-captive.conf
```

Re-run:

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
```

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
