# Update & Patch Delivery — End-user program (vision capture)

> **Room:** Vision & Strategy · capture only · **no build** until gated  
> **Operator guide (today):** [08-ota-updates.md](../guides/08-ota-updates.md)  
> **Roadmap:** Program **UP** in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) · ties **GR** golden release  
> **Status:** scoped · **Last updated:** June 2026

---

## One-line vision

When CurXor ships, **every operator gets safe, auditable updates** — nightly or on-demand — without surrendering sovereignty. Patches land on **their** box: backup first, verify checksum, health-check, auto-rollback on failure. **No forced CurXor cloud account**; releases hosted on a mirror **you** trust (CurXor CDN default · self-host optional).

---

## What already exists (dev / appliance-ready)

| Piece | Status |
|-------|--------|
| `scripts/ota-updater.sh` | **Shipped** — manifest fetch · semver compare · backup · SHA256 · apply · rollback |
| `scripts/post-update.sh` | **Shipped** — rebuild engine/dashboard · mesh · FRE dirs |
| Nightly cron `03:00` | **Shipped** — `install-ota-cron.sh` |
| `/etc/curxor/ota.env` | **Shipped** — `CURXOR_OTA_VERSION_URL` |
| `version.json` + mock manifest | **Shipped** — `config/ota/mock-release/` |
| Dashboard | **Partial** — `OtaTerminalWidget` · SSE `/api/stream/ota-logs` · `ota.available` OS event |
| `lib/ota-available-check.ts` | **Shipped** — dev QA check + Cafe event |

**Gap:** Production **release pipeline**, **operator-facing Updates UI**, **signed manifests**, and **data-migration discipline** for paying customers.

---

## Delivery channels (locked)

| Channel | When | Operator |
|---------|------|----------|
| **OTA (primary)** | Steady state after unbox | Automatic nightly or **Check for updates** in Settings |
| **USB factory refresh** | Dead box · air-gap · major recovery | [IDEA-A03](./FUTURE-ROADMAP.md) golden image |
| **Manual tarball** | Power users · self-host mirror | Same artifact as OTA · `ota-updater.sh` local manifest |

All three consume the **same signed release artifact** — one build, many paths.

---

## Release topology

```text
Git tag v1.2.3 (curxor-os)
    → CI: build tarball · run tests · SHA256 · sign manifest
    → Publish to releases.curxor.ai (or operator mirror)
         stable/version.json
         stable/curxor-os-1.2.3.tar.gz
         beta/version.json   (opt-in channel)
    → Appliance (eno2 egress):
         ota-updater.sh @ 03:00
         or operator "Install now"
    → post-update.sh → restart curxor-os.target → health → commit version
```

**Sovereignty rules:**

1. **eno2** fetches manifests/artifacts — unplug = no phone-home (operator choice).
2. **HTTPS required** (`CURXOR_OTA_REQUIRE_HTTPS=1`).
3. **No auto-update without visibility** — log + Settings history + optional Patron Link notify.
4. **Operator can pin** channel or defer (UP3).

---

## What gets updated vs preserved

| Path | OTA behavior |
|------|----------------|
| `/opt/curxor/` | **Replaced** (code · scripts · pillars) — rsync excludes `node_modules`, `.next`, `dist` (rebuilt in post-update) |
| `/etc/curxor/` | **Preserved** — keys, FRE, claw profiles, digital.env, ota.env |
| `/var/lib/curxor/` | **Preserved** — queues, cafe-state, forged apps, patron devices |
| `/var/backups/curxor/` | **Pre-OTA tarball** — rollback source |

**Migrations:** Breaking schema changes ship **`scripts/migrations/NNN-description.sh`** run from `post-update.sh` — idempotent, logged.

---

## Manifest evolution (production)

Today:

```json
{
  "version": "1.2.3",
  "released": "2026-06-24",
  "channel": "stable",
  "artifact": { "url": "…", "sha256": "…" },
  "post_update": "scripts/post-update.sh"
}
```

Add at ship (UP1):

```json
{
  "min_version": "1.0.0",
  "release_notes_url": "https://curxor.ai/releases/1.2.3",
  "signature": "base64-ed25519…",
  "severity": "patch | minor | major",
  "requires_reboot": false
}
```

| Field | Purpose |
|-------|---------|
| `min_version` | Block skip-upgrade chains that need intermediate migrations |
| `signature` | Verify manifest + artifact authenticity (public key baked in appliance) |
| `severity` | UI copy · Patron Link urgency |
| `release_notes_url` | Human-readable changelog |

---

## Operator UX (Settings → Updates)

| Surface | v1 (UP2) | Later |
|---------|----------|-------|
| **Current version** | From local `version.json` | + commit hash |
| **Channel** | `stable` (default) · `beta` opt-in | Insider |
| **Check now** | Triggers `ota-updater.sh --dry-run` or API wrapper | |
| **Install** | Confirm → apply · show live log (existing widget) | Schedule window |
| **History** | Last 10 runs from ota log parse | Export for support |
| **Rollback** | **Manual** — restore latest backup (support doc) | One-click (UP5) |

**Patron Link (MO):** push `ota.available` — “1.2.3 ready — install tonight?” (not silent).

**Patron Ask:** “What changed in 1.2.3?” → fetch release notes summary (local cache).

---

## Patch vs major release

| Type | Semver | Contents | Risk |
|------|--------|----------|------|
| **Patch** | `x.y.Z` | Dashboard · scripts · bugfixes | Low · auto-apply OK with notify |
| **Minor** | `x.Y.0` | New Claw features · migrations | Medium · confirm in UI |
| **Major** | `X.0.0` | Pillar breaking · ROCm bump | High · require explicit + USB fallback doc |

**Delta artifacts** (optional UP6): binary diff for large tarballs — defer until download size hurts on slow links.

---

## CI / release engineering (UP1 · IDEA-F02)

| Step | Owner |
|------|-------|
| Tag `v1.2.3` on `main` | Release manager |
| GitHub Action: `pnpm test` · `qa-smoke` · build tarball | CI |
| Compute SHA256 · sign manifest with release key | CI |
| Upload to `releases.curxor.ai/stable/` | CI |
| Smoke: fresh VM + OTA from `1.2.2` → `1.2.3` | CI gate |
| Update storefront “latest version” | GTM |

**Brutal honesty:** Until UP1 ships, OTA is **dev-tested only** — do not claim auto-update in $3,999 GTM.

---

## Security

| Threat | Mitigation |
|--------|------------|
| MITM on manifest | HTTPS + cert pinning horizon (UP7) |
| Tampered tarball | SHA256 + ed25519 manifest signature |
| Bad release bricks box | Backup · health check · **auto-rollback** (already in updater) |
| Forced downgrade attack | Updater only applies `version_gt` remote > local |
| CurXor holds kill switch | **No** — operator controls `CURXOR_OTA_VERSION_URL` |

---

## Support playbook (brief)

| Symptom | Action |
|---------|--------|
| Update failed, services up | Check `/var/log/curxor/ota-update.log` |
| Update failed, dashboard down | Rollback from `/var/backups/curxor/latest` |
| Stuck lock | Remove `/run/curxor-ota.lock` after confirming no run |
| Air-gap | USB with manifest pointing to `file://` or local nginx mirror |

---

## UP waves

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **UP0** | G1 OTA smoke on real MS-S1 | G1 | `1.0.0` apply + rollback tested |
| **UP1** | CI release job · signed manifest · `releases.curxor.ai` | G2 | IDEA-A02 + IDEA-F02 closed |
| **UP2** | Settings **Updates** panel · Check / Install · log embed | G2 | Operator installs without SSH |
| **UP3** | Channel stable/beta · defer updates | G2+ | ota.env channel switch |
| **UP4** | `ota.available` → Patron Link + Cafe toast | G3 | Mobile + desktop notify |
| **UP5** | One-click rollback UI (restore latest backup) | G3+ | Support burden cut |
| **UP6** | Migration scripts framework in post-update | G3 | Schema change safe |
| **UP7** | Manifest signature verify in updater | G3+ | Supply-chain hardening |
| **UP8** | Factory USB ships same version as latest stable | G2 | IDEA-A03 aligned |

Nested under **Program GR** (golden release).

---

## GTM honesty

| Say | Don't say |
|-----|-----------|
| “Secure OTA with backup and automatic rollback” | After UP0–UP1 only |
| “You control the update mirror” | “We push silently whenever we want” |
| “Nightly check · install when you confirm” (UP2+) | “Always auto-updates” (until policy clear) |
| Factory USB recovery path | “Unbrickable” |

---

## References

- Operator OTA guide: [08-ota-updates.md](../guides/08-ota-updates.md)
- Installation: [01-installation.md](../guides/01-installation.md)
- Operations: [09-operations-troubleshooting.md](../guides/09-operations-troubleshooting.md)
- Golden release: [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) · IDEA-A02 · IDEA-A03 · IDEA-F02
- Mobile notify: [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md)
