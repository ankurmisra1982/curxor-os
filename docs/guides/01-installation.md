# Installation Guide

Deploy CurXor OS on an MS-S1 MAX appliance running **Ubuntu 24.04 LTS**.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Hardware | MINISFORUM MS-S1 MAX, 64 GB UMA recommended |
| OS | Ubuntu 24.04 minimal, cloud-init or manual install |
| BIOS | Set GPU UMA heap to maximum (~48 GB) — see [MS-S1 MAX BIOS guide](docs/guides/10-ms-s1-max-hardware-bios.md) |
| Network | Two NICs: **eno1** (user LAN), **eno2** (robotics mesh) |

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
2. Configures **eno2 mesh** at `10.77.0.1/24` via `setup-mesh-network.sh`
3. Installs `curxor-os.target` and enables the full stack

## Method B — Cloud-init / autoinstall (offline media)

1. Bake the repo onto install media at **`/cdrom/curxor-os/`**
2. Merge `config/cloud-init/late-commands.yaml` into your autoinstall user-data
3. First boot runs `curxor-first-boot-install.service`, which executes `install-all.sh`

Do **not** use `git clone /opt/curxor` in cloud-init — copy the payload from CD-ROM instead.

## Post-install checklist

```bash
# 1. Pull inference models (first boot — can take 30+ minutes)
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models

# 2. Verify systemd stack
systemctl status curxor-os.target
systemctl status curxor-compute curxor-telemetry-broker curxor-engine curxor-dashboard

# 3. Optional: captive portal on eno1
sudo /opt/curxor/scripts/setup-captive-portal.sh

# 4. Optional: nightly OTA checks
sudo /opt/curxor/scripts/install-ota-cron.sh

# 5. Open dashboard
# http://<appliance-ip>:3080  or  http://10.0.0.1  (captive mode)
```

## Configuration files created on install

| File | Pillar |
|------|--------|
| `/etc/curxor/compute.env` | Pillar 1 |
| `/etc/curxor/engine.env` | Pillar 2 |
| `/etc/curxor/telemetry-broker.env` | Pillar 3 |
| `/etc/curxor/dashboard.env` | Pillar 4 |
| `/etc/curxor/fre-state.json` | Dashboard FRE |
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

- [Architecture](02-architecture.md) — understand how pillars connect
- [Networking](03-networking.md) — eno1 vs eno2
- [Inference & Compute](04-inference-compute.md) — models and UMA
- [MS-S1 MAX Hardware & BIOS](10-ms-s1-max-hardware-bios.md)
