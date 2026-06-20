# CurXor OS — Meta-Installer

Unified deployment for all four software pillars on the MS-S1 MAX appliance.

## Documentation

Full guides: **[docs/README.md](docs/README.md)**

| Guide | Topic |
|-------|-------|
| [Installation](docs/guides/01-installation.md) | First boot & meta-installer |
| [Architecture](docs/guides/02-architecture.md) | Four pillars & data flows |
| [Networking](docs/guides/03-networking.md) | eno1 captive + eno2 mesh |
| [Inference](docs/guides/04-inference-compute.md) | Ollama / vLLM / UMA |
| [Engine & Claws](docs/guides/05-engine-and-claws.md) | Agent loop & claw wizard |
| [Telemetry](docs/guides/06-telemetry-mesh.md) | ZeroMQ broker & wire formats |
| [Dashboard](docs/guides/07-flight-command-dashboard.md) | Flight Command UI |
| [OTA Updates](docs/guides/08-ota-updates.md) | Secure updater & rollback |
| [Operations](docs/guides/09-operations-troubleshooting.md) | Day-2 ops & troubleshooting |
| [MS-S1 MAX BIOS](docs/guides/10-ms-s1-max-hardware-bios.md) | Hardware & UMA firmware |
| [PDF Export](docs/guides/11-pdf-export.md) | Printable docs |
| [Operator card](docs/quick-reference/operator-card.md) | One-page field reference |

```bash
./docs/scripts/export-guides-pdf.sh    # → docs/pdf/
```

## Prerequisites

1. Ubuntu 24.04 LTS minimal (cloud-init provisioned)
2. Full `curxor-os` tree copied to `/opt/curxor/`

```bash
sudo rsync -a ./ /opt/curxor/
sudo chmod +x /opt/curxor/scripts/install-all.sh
sudo chmod +x /opt/curxor/pillar-*/scripts/install.sh
```

## One-Command Deploy

```bash
sudo /opt/curxor/scripts/install-all.sh
```

This script:

1. Creates `/opt/curxor/scripts` if missing
2. Runs each pillar's `scripts/install.sh` in order:
   - `pillar-1-compute`
   - `pillar-2-engine`
   - `pillar-3-telemetry`
   - `pillar-4-dashboard`
3. Installs `curxor-os.target` → `/etc/systemd/system/`
4. Runs `systemctl enable --now curxor-os.target`

## Master Systemd Target

File: `/etc/systemd/system/curxor-os.target`

```ini
[Unit]
Description=CurXor OS Appliance Master Target
Wants=curxor-compute.service curxor-telemetry-broker.service curxor-engine.service curxor-dashboard.service
After=curxor-compute.service curxor-telemetry-broker.service

[Install]
WantedBy=multi-user.target
```

## Post-Install

```bash
# Pillar 1: pull inference models (first boot)
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models

# Verify stack
systemctl status curxor-os.target
journalctl -u curxor-engine -f

# Dashboard (direct)
# http://<appliance-ip>:3080

# Smart-hub captive portal (eno1 user LAN)
sudo chmod +x /opt/curxor/scripts/setup-captive-portal.sh
sudo /opt/curxor/scripts/setup-captive-portal.sh
# Clients on eno1: any URL → http://10.0.0.1 → dashboard :3080
```

## Manual Control

```bash
sudo systemctl start curxor-os.target
sudo systemctl stop curxor-os.target
sudo systemctl restart curxor-os.target
```

## Layout

```
/opt/curxor/
├── scripts/
│   ├── install-all.sh
│   ├── ota-updater.sh              # secure OTA daemon
│   ├── install-ota-cron.sh         # 03:00 nightly cron
│   ├── post-update.sh              # payload hook after extract
│   └── setup-captive-portal.sh     # dnsmasq + iptables network trap
├── config/ota/
│   ├── ota.env.example
│   └── mock-release/version.json
├── docs/                           # guides, operator card, PDF export
│   ├── guides/                     # 01–11
│   ├── quick-reference/
│   ├── scripts/export-guides-pdf.sh
│   └── pdf/                        # generated PDFs (gitignored)
├── config/captive-portal/
│   └── dnsmasq-captive.conf
├── pillar-1-compute/
├── pillar-2-engine/
├── pillar-3-telemetry/
└── pillar-4-dashboard/
```

## Captive Portal (Smart-Hub Mode)

`setup-captive-portal.sh` configures bare-metal networking on **eno1 only**:

| Layer | Behavior |
|-------|----------|
| **dnsmasq** | DHCP `10.0.0.50–250` · wildcard DNS `address=/#/10.0.0.1` |
| **iptables** | `eno1:80` and `eno1:443` → `localhost:3080` |
| **Persistence** | `iptables-persistent` + `netfilter-persistent` |
| **Isolation** | **eno2** robotics mesh is never modified |

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
```

## Cloud-Init / Autoinstall

Bake `curxor-os/` onto install media at **`/cdrom/curxor-os/`**, then merge:

`config/cloud-init/late-commands.yaml`

**Do not use** `git clone /opt/curxor` — that is invalid syntax (no source repo, wrong path). Use `cp -a /cdrom/curxor-os/. /opt/curxor/` or a `file://` git remote.

The reference uses a **first-boot systemd unit** (`curxor-first-boot-install.service`) instead of running `install-all.sh` inside curtin's chroot, because Docker/ROCm/systemd services require a live kernel. Reboot once; the meta-installer runs automatically.

## Over-The-Air (OTA) Updates

Automated, secure updates with backup + rollback:

| Component | Path |
|-----------|------|
| Updater | `/opt/curxor/scripts/ota-updater.sh` |
| Config | `/etc/curxor/ota.env` |
| Local version | `/opt/curxor/version.json` |
| Backups | `/var/backups/curxor/*.tar.gz` |
| Log | `/var/log/curxor/ota-update.log` |

```bash
# One-time cron setup (03:00 nightly + cron.daily wrapper)
sudo /opt/curxor/scripts/install-ota-cron.sh

# Manual check / dry run
sudo /opt/curxor/scripts/ota-updater.sh --dry-run
sudo tail -f /var/log/curxor/ota-update.log
```

Remote manifest format (`version.json`):

```json
{
  "version": "0.2.0",
  "artifact": {
    "url": "https://…/curxor-os-0.2.0.tar.gz",
    "sha256": "…"
  },
  "post_update": "scripts/post-update.sh"
}
```

Mock manifest for integration testing: `config/ota/mock-release/version.json`.

## Holding pattern (MS-S1 MAX pending)

Appliance validation is blocked until hardware arrives. Continue GTM in the sibling repo:

**`../curxor storefront/`** — landing site, audit docs, Stripe pre-order, GTM checklist.

See also: [docs/HOLDING-PATTERN.md](docs/HOLDING-PATTERN.md)
