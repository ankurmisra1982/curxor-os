# OTA Updates Guide

> **Product roadmap:** End-user delivery program — [UPDATE-DELIVERY-ROADMAP.md](../curxor-os/UPDATE-DELIVERY-ROADMAP.md) (CI, signing, Settings UI).  
> **This guide:** What is **already on the appliance** today.

CurXor OS includes a secure **over-the-air update daemon** with backup, checksum verification, rollback, and nightly scheduling.

## Components

| Component | Path |
|-----------|------|
| Updater script | `/opt/curxor/scripts/ota-updater.sh` |
| Post-update hook | `/opt/curxor/scripts/post-update.sh` |
| Cron installer | `/opt/curxor/scripts/install-ota-cron.sh` |
| Config | `/etc/curxor/ota.env` |
| Local version | `/opt/curxor/version.json` |
| Backups | `/var/backups/curxor/curxor-pre-ota-*.tar.gz` |
| Log | `/var/log/curxor/ota-update.log` |

## Setup

```bash
sudo cp /opt/curxor/config/ota/ota.env.example /etc/curxor/ota.env
# Edit CURXOR_OTA_VERSION_URL for your release mirror
sudo /opt/curxor/scripts/install-ota-cron.sh
```

Cron installed:

| File | Schedule |
|------|----------|
| `/etc/cron.d/curxor-ota` | **03:00 daily** (exact) |
| `/etc/cron.daily/curxor-ota` | Distro early-morning window (fallback) |

## Update flow

1. Fetch remote `version.json` from `CURXOR_OTA_VERSION_URL` (HTTPS required)
2. Compare semver with local `/opt/curxor/version.json`
3. If remote is newer:
   - **Backup** entire `/opt/curxor/` to `/var/backups/curxor/`
   - Download artifact tarball
   - Verify SHA256 (when manifest provides non-placeholder hash)
   - Extract to staging, `rsync` into `/opt/curxor/`
   - Run `post_update` hook from manifest (default: `scripts/post-update.sh`)
     - Ensures `/etc/curxor/app-fre` exists
     - Rebuilds **pillar-2-engine** (`dist/`) and **pillar-4-dashboard** (`.next/`)
   - `systemctl restart curxor-os.target`
   - Health-check broker, engine, dashboard
   - On failure → **automatic rollback** from backup
4. Write new local version only after health check passes

## Remote manifest format

```json
{
  "version": "0.2.0",
  "released": "2026-06-19",
  "channel": "stable",
  "artifact": {
    "url": "https://releases.example.com/curxor-os-0.2.0.tar.gz",
    "sha256": "abc123…"
  },
  "post_update": "scripts/post-update.sh"
}
```

Mock manifest for testing: `config/ota/mock-release/version.json`

## Release tarball layout

Artifact must unpack to a tree containing at least:

```
version.json
scripts/
pillar-1-compute/
pillar-2-engine/
…
```

Nested one level deep is also supported (auto-detected).

## Manual commands

```bash
# Check only (no apply if versions equal)
sudo /opt/curxor/scripts/ota-updater.sh

# Dry run (log intent, no changes)
sudo /opt/curxor/scripts/ota-updater.sh --dry-run

# Watch log
sudo tail -f /var/log/curxor/ota-update.log

# View in dashboard
# Flight Command → System Health
```

## Configuration reference

`/etc/curxor/ota.env`:

```bash
CURXOR_OTA_VERSION_URL=https://…/version.json
CURXOR_OTA_ROOT=/opt/curxor
CURXOR_OTA_BACKUP_DIR=/var/backups/curxor
CURXOR_OTA_LOG=/var/log/curxor/ota-update.log
CURXOR_OTA_REQUIRE_HTTPS=1
CURXOR_OTA_VERIFY_SHA256=1
CURXOR_OTA_HEALTH_WAIT_SEC=15
```

## Security notes

- Manifest and artifact URLs must use HTTPS when `CURXOR_OTA_REQUIRE_HTTPS=1`
- Placeholder SHA256 (`000…000`) skips verification — dev/mock only
- Single-instance lock at `/run/curxor-ota.lock` prevents concurrent runs
- Backups retained in `/var/backups/curxor/` — prune manually or via retention policy

## Surfacing logs in Flight Command

SSE route `/api/stream/ota-logs` tails the log file in real time. See [Flight Command Dashboard](07-flight-command-dashboard.md).

## Related guides

- [Installation](01-installation.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
