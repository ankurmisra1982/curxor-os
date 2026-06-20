# CurXor OS — Operator Quick Reference

**MINISFORUM MS-S1 MAX · Ubuntu 24.04 · Sovereign Edge · Local LLM**

Print this card at the rack. Expanded quick start: [guides/00-quick-start.md](../guides/00-quick-start.md)

---

## Access

| What | Where |
|------|-------|
| Dashboard | `http://<appliance-ip>:3080` |
| Captive (eno1) | Any URL → `http://10.0.0.1` |
| FRE wizard | `/setup` (first boot) |
| The Forge | `/claw-forge` or header **+ Forge** |
| System Health | Header → OTA log + compute metrics |

---

## Network

| NIC | IP | Role |
|-----|-----|------|
| **eno1** | `10.0.0.1` | Operators · captive portal |
| **eno2** | `10.77.0.1` | Mesh + digital bridges |

Mesh: vision **9100/9101** · motor **9200/9201** · digital **9200/9101**

**Unplug eno2** → no outbound trades/posts. LLM stays on localhost.

---

## Eight Claws (routes)

| Route | Name |
|-------|------|
| `/claw-forge` | The Forge |
| `/my-capital` | Capital Claw |
| `/my-content` | Creator Claw |
| `/my-work` | Outreach Claw |
| `/my-shop` | Arbitrage Claw |
| `/optimus` | Signal Claw |
| `/robotaxi` | Swarm Claw |
| `/claw-cafe` | Engage Claw |

---

## Local LLM

| Step | Command |
|------|---------|
| Deploy (first boot) | `sudo …/pillar-1-compute/scripts/deploy.sh --pull-models` |
| Verify | `curl -sf http://127.0.0.1:11434/api/tags` |
| Restart | `sudo systemctl restart curxor-compute` |

**Uses inference:** engine loop · Forge chat · Creator/Capital/Outreach/Arbitrage chat · plan skills  
**Skills only (no LLM→internet):** Execute Trade · Publish Post → mesh → bridge

Dashboard fallback if Ollama down: rule-based chat still works.

---

## Health (one line)

```bash
systemctl status curxor-os.target && curl -sf http://127.0.0.1:3080/api/setup/status
```

---

## Start / stop

```bash
sudo systemctl restart curxor-os.target
journalctl -u curxor-engine -f
journalctl -u curxor-dashboard -f
```

---

## First boot

1. BIOS UMA **MAX** (~48 GB)
2. `sudo /opt/curxor/scripts/install-all.sh`
3. `sudo …/deploy.sh --pull-models`
4. Dashboard → FRE (`/setup`) — pick Claw modules
5. Optional: captive portal · OTA cron

---

## Key paths

| Path | Purpose |
|------|---------|
| `/etc/curxor/compute.env` | Ollama/vLLM |
| `/etc/curxor/dashboard.env` | UI + inference client |
| `/etc/curxor/digital.env` | Alpaca / X keys (eno2) |
| `/etc/curxor/fre-state.json` | Global FRE |
| `/etc/curxor/claw-profiles.json` | Forged Claws |

---

## When things break

| Problem | Try |
|---------|-----|
| No inference | `curl :11434/api/tags` · `restart curxor-compute` |
| Chat feels “scripted” | Ollama not running — deploy models |
| No mesh / SSE empty | `eno2` IP · `CURXOR_MESH_BROKER_IP=10.77.0.1` |
| Trade/post fails | `digital.env` keys · `restart curxor-telemetry-broker` |
| Stuck on /setup | Reset FRE — Installation guide |
| Port 3080 conflict (dev) | Use `:3081` or free stale process |

---

## OTA

```bash
sudo /opt/curxor/scripts/ota-updater.sh --dry-run
sudo tail -f /var/log/curxor/ota-update.log
```

Cron: **03:00** · `/etc/cron.d/curxor-ota`

---

*CurXor OS · Flight Command · Pillars 1–4 · Offline First*
