# Installation Guide

Deploy CurXor OS on an MS-S1 MAX appliance running **Ubuntu 24.04 LTS**.

> **MS-S1 MAX post-unbox (canonical):** [GOLDEN PATH NOTES](#golden-path-notes-ms-s1-max--verified-2026-07-01) — verified `enp98s0`/`enp97s0`, **gfx1151**, `CURXOR_CMD_IFACE` / `CURXOR_MESH_IFACE`, and pitfalls from [UNBOX-FIELD-LOG](../curxor-os/UNBOX-FIELD-LOG.md). Hardware: [MS-S1 MAX BIOS](10-ms-s1-max-hardware-bios.md) · Updates: [OTA](08-ota-updates.md) (Settings → Updates).

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Hardware | MINISFORUM MS-S1 MAX — **Standard 64 GB** ($3,999) or **Pro 128 GB** ($4,999) UMA |
| OS | Ubuntu 24.04 minimal, cloud-init or manual install |
| BIOS | Set GPU UMA heap to maximum (~48 GB on 64 · **~96 GB on 128**) — see [MS-S1 MAX BIOS guide](10-ms-s1-max-hardware-bios.md) · [128GB cheat sheet](../curxor-os/MS-S1-128GB-UNBOX-CHEATSHEET.md) |
| Network | Two NICs: **Command Port** (`enp98s0`), **Egress Port** (`enp97s0`) on MS-S1 MAX — see [Networking](03-networking.md) |

## Method A — Copy tree and run meta-installer

```bash
# On your build machine
rsync -a curxor-os/ user@appliance:/tmp/curxor-os/

# On the appliance
sudo rsync -a /tmp/curxor-os/ /opt/curxor/
sudo chmod +x /opt/curxor/scripts/*.sh
sudo chmod +x /opt/curxor/pillar-*/scripts/*.sh
sudo /opt/curxor/scripts/install-all.sh
```

The meta-installer:

1. Installs all four pillars in order (compute → engine → telemetry → dashboard)
2. Configures **Egress Port mesh** at `10.77.0.1/24` via `setup-mesh-network.sh`
3. Installs `curxor-os.target` and enables the full stack

## Method B — Cloud-init / autoinstall (offline media)

1. Bake the repo onto install media at **`/cdrom/curxor-os/`**
2. Merge `config/cloud-init/late-commands.yaml` into your autoinstall user-data
3. First boot runs `curxor-first-boot-install.service`, which executes `install-all.sh`

Do **not** use `git clone /opt/curxor` in cloud-init — copy the payload from CD-ROM instead.

## Post-install checklist

**Pro 128 GB:** copy the inference profile before model pull:

```bash
sudo cp /opt/curxor/pillar-1-compute/config/compute.env.pro128.example /etc/curxor/compute.env
sudo ln -sfn /etc/curxor/compute.env /opt/curxor/pillar-1-compute/.env
```

```bash
# 1. Pull inference models (first boot — 30–90 minutes)
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models

# 2. Verify local LLM (required for engine + dashboard chat)
curl -sf http://127.0.0.1:11434/api/tags && echo "Ollama OK"
# Expect: moondream + qwen3:8b (all SKUs); Pro 128 also qwen3-vl, qwen3:14b, qwen3.6

# 3. Verify systemd stack
systemctl status curxor-os.target
systemctl status curxor-compute curxor-telemetry-broker curxor-engine curxor-dashboard

# 4. Optional: captive portal on Command Port (enp98s0) — see [Networking](03-networking.md)
sudo /opt/curxor/scripts/setup-captive-portal.sh

# 5. Optional: nightly OTA checks
sudo /opt/curxor/scripts/install-ota-cron.sh

# 6. Open dashboard → FRE at /setup
# http://<appliance-ip>:3080  or  http://10.0.0.1  (captive mode)

# 7. Align dashboard inference with compute (if not already set)
grep CURXOR_INFERENCE /etc/curxor/dashboard.env /etc/curxor/compute.env
```

**After golden path** (optional kiosk — not day-one required):

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh
# or: sudo CURXOR_ENABLE_KIOSK=1 /opt/curxor/scripts/install-all.sh
sudo reboot
```

See [Kiosk Mode](19-kiosk-mode.md).

## GOLDEN PATH NOTES (MS-S1 MAX — verified 2026-07-01)

> **Source:** [UNBOX-FIELD-LOG.md](../curxor-os/UNBOX-FIELD-LOG.md) · [UNBOX-PRINTABLE-GUIDE.md](../curxor-os/UNBOX-PRINTABLE-GUIDE.md)  
> **Hardware detail:** [MS-S1 MAX Hardware & BIOS](10-ms-s1-max-hardware-bios.md) · **Post-GR-1 updates:** [OTA Updates](08-ota-updates.md) (Settings → Updates tab)

Canonical post-unbox reference for the **MINISFORUM MS-S1 MAX** — pasted from field verification, not guessed.

### Interface map (not eno1/eno2)

| Role | CurXor name | **Linux iface** | IPv4 |
|------|-------------|-----------------|------|
| COMMAND | Command Port | **`enp98s0`** | **`10.0.0.1/24`** |
| EGRESS | Egress Port / mesh | **`enp97s0`** | **`10.77.0.1/24`** |

MS-S1 MAX built-in NICs are **`enp98s0` / `enp97s0`**, not `eno1`/`eno2`. Scripts default via `scripts/lib/network-defaults.sh`. Override when iface names differ:

```bash
export CURXOR_CMD_IFACE=enp98s0
export CURXOR_MESH_IFACE=enp97s0
sudo CURXOR_CMD_IFACE=enp98s0 CURXOR_MESH_IFACE=enp97s0 \
  /opt/curxor/scripts/verify-unbox-day.sh --post-models
```

After captive portal: browser home **`http://10.0.0.1:3080/home`** · SSH **`ssh user@10.0.0.1`** (laptop static **`10.0.0.2/24`**, gateway blank).

### ROCm, Ollama, and RAM

| Item | Verified value |
|------|----------------|
| ROCm arch | **`gfx1151`** (`HSA_OVERRIDE_GFX_VERSION=11.5.1`) |
| Ollama models (Standard 64 GB) | **`qwen3:8b`** · **`moondream:1.8b`** |
| System RAM in `free -h` | **~15 Gi** visible — normal on 64 GB SKU with **48 GB UMA BIOS** carve-out |
| Dashboard UMA confirm | `gpuHeapGb: 48` in `/api/metrics/compute` |

`OLLAMA_IGPU_ENABLE=1` for gfx1151. Healthcheck: `ollama list` (not `curl` alone).

### Verification commands

Run after cables, captive portal, mesh, and model pull:

```bash
sudo chmod +x /opt/curxor/scripts/verify-unbox-day.sh
sudo /opt/curxor/scripts/verify-unbox-day.sh --post-models
```

**Expected PASS snapshot** (2026-07-01 — Nest Pro egress):

```text
# CurXor unbox verification — curxor — 2026-07-01T17:09:26-04:00
- OS: Ubuntu 24.04.4 LTS · kernel 6.17.0-35-generic
- Path: clean Ubuntu vs vendor image → (record A or B)
- enp98s0: 10.0.0.1 (want 10.0.0.1)
- enp97s0: 10.77.0.1 (want 10.77.0.1)
- rocminfo gfx1151: gfx1151
- Ollama :11434: OK
- verify-mesh: PASS
- Failures: 0 · Warnings: 4

Post-install-all (same session):
  curxor-dashboard          : active
  curxor-telemetry-broker   : active · 10.77.0.1:9100-9201 listening
  curxor-compute            : active (Ollama Docker · qwen3:8b, moondream:1.8b)
  egress WAN                : 192.168.86.240 via Nest Pro · verify-egress-wan.sh PASS
```

Quick smoke (on box):

```bash
curl -sf http://127.0.0.1:3080/api/setup/status && echo "dashboard OK"
curl -sf http://127.0.0.1:11434/api/tags && echo "Ollama OK"
ip -4 addr show enp98s0 | grep 10.0.0.1
ip -4 addr show enp97s0 | grep 10.77.0.1
rocminfo 2>&1 | grep -i gfx1151
```

### Top pitfalls (Windows → Linux)

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **CRLF after Windows `scp`** | `bash\r: No such file or directory` · `set: pipefail: invalid option` | `sudo find /opt/curxor -name '*.sh' -exec dos2unix {} +` · `sudo dos2unix /etc/systemd/system/curxor-*.service` |
| **Captive portal DNS hijack** | Laptop loses internet on COMMAND cable; `google.com` → box | Re-run `setup-captive-portal.sh` — no `option:router`, no `address=/#/`; see [Networking — dual-homed laptop](03-networking.md#dual-homed-laptop-wi-fi--command-cable-simultaneously) |
| **COMMAND cable dual-homed laptop** | Wi-Fi + Ethernet both up; default route stolen | Laptop `10.0.0.2/24`, **gateway blank**, DNS automatic; run `.\scripts\install-laptop-command-port.ps1` (Windows) |
| **Engine ZMQ `EBUSY`** | `curxor-engine` crash loop · `Socket is busy reading` | Repo fix: `mesh-client.ts` uses `receiveTimeout` instead of `Promise.race` on vision receive — ship via `deploy-to-box.ps1` |
| **dnsmasq bind conflict** | `cannot set --bind-interfaces and --bind-dynamic` | Re-run `setup-captive-portal.sh` (comments out `bind-dynamic` in `/etc/dnsmasq.conf`) |

Full pitfall table: [UNBOX-FIELD-LOG.md](../curxor-os/UNBOX-FIELD-LOG.md).

### Operator URLs (this hardware)

| What | Value |
|------|--------|
| Dashboard | `http://10.0.0.1:3080/home` |
| FRE | `http://10.0.0.1:3080/setup` |
| SSH | `ssh user@10.0.0.1` (COMMAND cable) |
| Deploy from laptop | `.\scripts\deploy-to-box.ps1` (updates after stack exists; first install: manual SCP + `install-all.sh`) |

## Configuration files created on install

| File | Pillar |
|------|--------|
| `/etc/curxor/compute.env` | Pillar 1 |
| `/etc/curxor/engine.env` | Pillar 2 |
| `/etc/curxor/telemetry-broker.env` | Pillar 3 |
| `/etc/curxor/dashboard.env` | Pillar 4 |
| `/etc/curxor/fre-state.json` | Dashboard FRE |
| `/etc/curxor/app-fre/{appId}.json` | Per-app agent FRE (8 OOTB modules) |
| `/etc/curxor/claw-profiles.json` | Claw wizard |
| `/etc/curxor/ota.env` | OTA (after `install-ota-cron.sh`) |

Symlink: `/opt/curxor/pillar-1-compute/.env` → `/etc/curxor/compute.env`

## First Run Experience (FRE)

On first dashboard visit, `/setup` runs a 3-step wizard until `/etc/curxor/fre-state.json` has `"initialized": true`.

Reset FRE:

```bash
sudo bash -c 'echo "{\"initialized\":false,\"selectedApps\":[],\"provisionedAt\":null}" > /etc/curxor/fre-state.json'
sudo chown curxor:curxor /etc/curxor/fre-state.json
sudo systemctl restart curxor-dashboard
```

## Manual service control

```bash
sudo systemctl restart curxor-os.target   # all pillars
sudo systemctl stop curxor-os.target
journalctl -u curxor-engine -f
journalctl -u curxor-telemetry-broker -f
```

## Next steps

- [Quick Start](00-quick-start.md) — operators: Claws, LLM, Forge
- [Architecture](02-architecture.md) — understand how pillars connect
- [Networking](03-networking.md) — Command Port (`enp98s0`) vs Egress Port (`enp97s0`)
- [Inference & Compute](04-inference-compute.md) — models and UMA
- [MS-S1 MAX Hardware & BIOS](10-ms-s1-max-hardware-bios.md) — BIOS UMA, gfx1151, NIC names
- [OTA Updates](08-ota-updates.md) — Settings → Updates tab (post GR-1)
- [Unbox field log](../curxor-os/UNBOX-FIELD-LOG.md) — verified pitfalls and session notes
- [Printable unbox guide](../curxor-os/UNBOX-PRINTABLE-GUIDE.md) — step-by-step checklist
- [Kiosk Mode](19-kiosk-mode.md) — optional monitor-first boot
