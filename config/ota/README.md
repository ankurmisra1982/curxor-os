# OTA release manifests

CurXor appliances poll a remote `version.json` (see `scripts/ota-updater.sh`).

## Layout

| Path | Role |
|------|------|
| `mock-release/version.json` | Integration test manifest (v0.2.0 mock) |
| `/opt/curxor/version.json` | Installed version on appliance |

## Production checklist (pre golden image)

1. Bump semver in repo root `version.json`
2. Build signed artifact: `curxor-os-{version}.tar.gz` of `/opt/curxor/` tree
3. Publish manifest with real `artifact.url` and `sha256`
4. Set `CURXOR_OTA_VERSION_URL` in `/etc/curxor/ota.env`
5. Dry-run on lab box: `sudo /opt/curxor/scripts/ota-updater.sh --force-check`
6. Verify rollback tarball in `/var/backups/curxor/`

## Mock testing (dev)

Point `ota.env` at a local file server serving `config/ota/mock-release/version.json`.
The placeholder SHA256 will fail verification unless `CURXOR_OTA_VERIFY_SHA256=0`.
