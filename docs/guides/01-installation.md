# Installation Guide

Deploy CurXor OS on an MS-S1 MAX appliance running **Ubuntu 24.04 LTS**.

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

# 4. Optional: captive portal on eno1
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
- [Networking](03-networking.md) — eno1 vs eno2
- [Inference & Compute](04-inference-compute.md) — models and UMA
- [MS-S1 MAX Hardware & BIOS](10-ms-s1-max-hardware-bios.md)
- [Kiosk Mode](19-kiosk-mode.md) — optional monitor-first boot
