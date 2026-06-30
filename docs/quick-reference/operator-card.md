# CurXor OS — Operator Quick Reference

**curXor** · MINISFORUM MS-S1 MAX · Ubuntu 24.04 · Sovereign Edge · Local LLM

Chassis badge: [docs/assets/CurXor-Hardware-Badge.svg](../assets/CurXor-Hardware-Badge.svg)

Print this card at the rack. Expanded quick start: [guides/00-quick-start.md](../guides/00-quick-start.md)

---

## Access

| What | Where |
|------|-------|
| Dashboard (laptop / COMMAND cable) | **`http://10.0.0.1:3080/home`** (use `http://` not `https://`) |
| Laptop IP (COMMAND cable) | **`10.0.0.2/24`** · **no gateway** · DNS automatic · Wi-Fi keeps internet |
| Laptop setup (Windows, once) | `powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1` (Administrator) |
| Re-apply routing | `.\scripts\setup-laptop-command-port.ps1` |
| SSH | **`ssh curxor`** or **`ssh ankur@10.0.0.1`** (`HostName 10.0.0.1` in `~/.ssh/config`) |
| Dashboard (on-box display, optional) | `http://127.0.0.1:3080` |
| FRE wizard | `/setup` (first boot) |
| The Forge | `/claw-forge` or header **+ Forge** |
| System Health | Header → OTA log + compute metrics |

**Daily loop:** Wi-Fi on + COMMAND cable in → open **`http://10.0.0.1:3080/home`** → `ssh curxor` for logs/deploy. No need to unplug cable for internet after split-route install.

---

## Network (MS-S1 MAX verified)

| Role | Iface | IP |
|------|-------|-----|
| **Command Port** | `enp98s0` | `10.0.0.1` |
| **Egress Port** | `enp97s0` | `10.77.0.1` |

Mesh: vision **9100/9101** · motor **9200/9201**

**Unplug Egress** → no outbound trades/posts. LLM stays on localhost.

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

**Default stack:** `moondream:1.8b` + `qwen3:8b` · Pro 128 adds extras via `OLLAMA_EXTRA_MODELS`

Dashboard fallback if Ollama down: rule-based chat still works.

**UMA:** `free -h` may show **~15 Gi** on 64 GB SKU with 48 GB GPU heap — normal.

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

| SKU | BIOS UMA | Env |
|-----|----------|-----|
| **Standard 64** ($3,999) | MAX (~48 GB) | `CURXOR_TOTAL_RAM_GB=64` · `CURXOR_GPU_HEAP_GB=48` |
| **Pro 128** ($4,999) | MAX (~96 GB) | `CURXOR_TOTAL_RAM_GB=128` · `CURXOR_GPU_HEAP_GB=96` |

1. BIOS UMA **MAX**
2. `sudo find /opt/curxor -name '*.sh' -exec dos2unix {} +` (after Windows `scp`)
3. `sudo /opt/curxor/scripts/install-all.sh`
4. `sudo …/deploy.sh --pull-models`
5. Part 4 cables + `setup-captive-portal.sh` / `setup-mesh-network.sh`
6. Dashboard → **`http://10.0.0.1:3080/home`**

---

## Key paths

| Path | Purpose |
|------|---------|
| `/etc/curxor/compute.env` | Ollama/vLLM |
| `/etc/curxor/dashboard.env` | UI + inference client |
| `/etc/curxor/digital.env` | Alpaca / X keys (Egress bridges) |
| `/etc/curxor/fre-state.json` | Global FRE |
| `/etc/curxor/claw-profiles.json` | Forged Claws |

---

## When things break

| Problem | Try |
|---------|-----|
| No inference | `curl :11434/api/tags` · `restart curxor-compute` |
| Broker crash loop | pyzmq 27 `TCP_NODELAY` — see [UNBOX-FIELD-LOG.md](../curxor-os/UNBOX-FIELD-LOG.md) |
| No mesh / SSE empty | `enp97s0` @ `10.77.0.1` · `systemctl status curxor-telemetry-broker` |
| dnsmasq won't start | `bind-dynamic` conflict — re-run `setup-captive-portal.sh` |
| Laptop loses internet on cable | No gateway/DNS on COMMAND · run `install-laptop-command-port.ps1` · re-run `setup-captive-portal.sh` on box |
| `google.com` → `10.0.0.1` | Wildcard DNS on box — `grep address=/#/ /etc/dnsmasq.d/curxor-captive.conf` |
| Browser "down" but SSH OK | Use **`http://`** not `https://` · incognito / restart browser |
| SSH fails | `HostName 10.0.0.1` in `~/.ssh/config` (not `192.168.86.211`) |
| TCP fails, L2 looks OK | Box reboot · `ip neigh show dev enp98s0` for `10.0.0.2` |
| `bash\r` after scp | `dos2unix` on script |
| Stuck on /setup | Reset FRE — Installation guide |

---

*CurXor OS · Flight Command · Pillars 1–4 · Offline First*
