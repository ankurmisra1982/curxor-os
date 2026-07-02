# CurXor OS — OTA release manifests

Appliances poll a remote `version.json` (see `scripts/ota-updater.sh`).

## Layout

| Path | Role |
|------|------|
| `mock-release/version.json` | Integration test manifest (v1.0.1 mock — newer than stable for dry-run smoke) |
| `ota.env.example` | Example `/etc/curxor/ota.env` |
| `release-public.pem` | Ed25519 public key (future UP7 verify; optional today) |
| `/opt/curxor/version.json` | Installed version on appliance |

## Production release (UP1)

1. Tag `v1.0.0` on `main` — GitHub Action `.github/workflows/release.yml` runs:
   - typecheck + dashboard build gate
   - `scripts/build-release-artifact.sh` → tarball + SHA256 manifest
   - optional ed25519 signature when `CURXOR_RELEASE_SIGNING_KEY` secret is set
   - uploads `curxor-os-{version}.tar.gz` + `version.json` to GitHub Releases
2. Self-host mirror (optional): copy assets to `https://your-mirror/stable/` and set:

   ```bash
   CURXOR_OTA_VERSION_URL=https://your-mirror/stable/version.json
   ```

3. Dry-run on box: `sudo /opt/curxor/scripts/ota-updater.sh --dry-run`
4. Settings → Updates — Check / Install without SSH

## Mock testing (dev / box smoke)

Default `ota.env.example` points at mock manifest on GitHub raw:

```bash
CURXOR_OTA_VERSION_URL=https://raw.githubusercontent.com/curxor/curxor-os/main/config/ota/mock-release/version.json
```

Mock manifest uses placeholder SHA256 — verification skipped (dev only). With box at **1.0.0**, mock **1.0.1** triggers “update available” in dry-run.

Local file server (air-gap lab):

```bash
cd config/ota/mock-release && python3 -m http.server 8765
# CURXOR_OTA_VERSION_URL=http://127.0.0.1:8765/version.json
# CURXOR_OTA_REQUIRE_HTTPS=0  # lab only
```

## Manual build (laptop)

```bash
./scripts/build-release-artifact.sh 1.0.0
ls -la dist/release/
```

## Production checklist

1. Bump semver in repo root `version.json`
2. Tag `v{version}` and let CI publish, or run build script + upload manually
3. Set `CURXOR_OTA_VERSION_URL` in `/etc/curxor/ota.env`
4. Dry-run: `sudo /opt/curxor/scripts/ota-updater.sh --dry-run`
5. Verify rollback tarball in `/var/backups/curxor/` after apply test
