# CurXor OS — Operator Quick Reference

**curXor** · MINISFORUM MS-S1 MAX · Ubuntu 24.04 · Sovereign Edge · Local LLM

Chassis badge: [docs/assets/CurXor-Hardware-Badge.svg](../assets/CurXor-Hardware-Badge.svg)

Print this card at the rack. Expanded quick start: [guides/00-quick-start.md](../guides/00-quick-start.md)

---

## Access

| What | Where |
|------|-------|
| Dashboard (laptop) | `http://<appliance-ip>:3080` |
| Dashboard (on-box display, optional) | `http://127.0.0.1:3080` |
| Kiosk (tty1 fullscreen) | `install-kiosk-mode.sh` → reboot — [19-kiosk-mode.md](../guides/19-kiosk-mode.md) |
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
| Pro 128 profile | `sudo cp …/config/compute.env.pro128.example /etc/curxor/compute.env` |
| Deploy (first boot) | `sudo …/pillar-1-compute/scripts/deploy.sh --pull-models` |
| Verify | `curl -sf http://127.0.0.1:11434/api/tags` |
| Restart | `sudo systemctl restart curxor-compute` |

**Default stack:** `moondream:1.8b` + `qwen3:8b` · Pro 128 adds `qwen3-vl:8b`, `qwen3:14b`, `batiai/qwen3.6-35b:q4` via `OLLAMA_EXTRA_MODELS`

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

**Shut down / reboot whole box (monitor):** Ubuntu **Power** menu · or hold MS-S1 **power button**. Kiosk tty1: **Ctrl+Alt+F3** → `sudo reboot` / `sudo shutdown -h now`. No in-app power UI yet — [UNBOX-PRINTABLE-GUIDE.md](../curxor-os/UNBOX-PRINTABLE-GUIDE.md) §5.4 · roadmap IDEA-A06.

---

## First boot

| SKU | BIOS UMA | Env |
|-----|----------|-----|
| **Standard 64** ($3,999) | MAX (~48 GB) | `CURXOR_TOTAL_RAM_GB=64` · `CURXOR_GPU_HEAP_GB=48` |
| **Pro 128** ($4,999) | MAX (~96 GB) | `CURXOR_TOTAL_RAM_GB=128` · `CURXOR_GPU_HEAP_GB=96` — [cheat sheet](../curxor-os/MS-S1-128GB-UNBOX-CHEATSHEET.md) |

1. BIOS UMA **MAX** (see row above)
2. `sudo /opt/curxor/scripts/install-all.sh`
3. `sudo …/deploy.sh --pull-models`
4. Dashboard → FRE (`/setup`) — pick Claw modules
5. Optional: captive portal · OTA cron

**After golden path** — optional kiosk (tty1 fullscreen):

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh
# or: sudo CURXOR_ENABLE_KIOSK=1 /opt/curxor/scripts/install-all.sh
sudo reboot
```

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
