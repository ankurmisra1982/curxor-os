# CurXor OS — Hardware Readiness Checklist (MS-S1 MAX)

> **Audience:** Ankur + first-boot operator session  
> **Trigger:** Hardware arrival (expected Thu Jun 25, 2026)  
> **Goal:** First prod smile — not cry. Software is dev-validated; this doc closes appliance gaps.

---

## Pre-arrival (dev machine — do now)

| # | Task | Command / artifact | Status |
|---|------|-------------------|--------|
| 1 | Local QA green | `cd pillar-4-dashboard && npm run qa:local -- --port 3081` | Run before unbox |
| 2 | Typecheck | `npm run typecheck` | |
| 3 | Production build | `npm run build` | Catches Next.js issues |
| 4 | Tag known-good | `version.json` → bump after QA | Currently **0.8.1** (Cafe C10 + Build Plane BP1) |
| 5 | Repo rsync plan | `install-all.sh` from clean Ubuntu 24.04 | See [01-installation.md](../guides/01-installation.md) |
| 6 | Seed script | `scripts/seed-appliance-data.sh` | Seeds `/etc/curxor` JSON + `digital.env` |
| 7 | Data path fix | `lib/curxor-data-dir.ts` | Production XP/Cafe → `/etc/curxor` (not install tree) |

---

## Day-zero hardware session (2–4 hours together)

### A. Inventory + full verify (30 min)

**One-shot CTO session** (inventory → GPU → eno1/eno2 → mesh → inference → stack):

```bash
sudo chmod +x /opt/curxor/scripts/verify-unbox-day.sh
sudo /opt/curxor/scripts/verify-unbox-day.sh
# After deploy.sh --pull-models:
sudo /opt/curxor/scripts/verify-unbox-day.sh --post-models
```

Paste the **GOLDEN PATH NOTES** block from script output into install addendum / GitHub issues.

**Decide:** Clean Ubuntu 24.04 minimal (**preferred**) vs audit vendor image → overlay `/opt/curxor`.

### B. BIOS (15 min)

Follow [10-ms-s1-max-hardware-bios.md](../guides/10-ms-s1-max-hardware-bios.md):

- UMA / GPU memory → **Maximum**
- Label **eno1** = Command Port (operator LAN)
- Label **eno2** = Egress Port (mesh + bridges)

### C. Install stack (60–90 min)

```bash
sudo rsync -a /path/to/curxor-os/ /opt/curxor/
cd /opt/curxor
sudo bash scripts/install-all.sh
```

Verify:

```bash
systemctl status curxor-dashboard curxor-engine curxor-telemetry-broker
curl -s http://127.0.0.1:3080/api/setup/status | jq .
```

### D. First boot UX (30 min)

1. Browse to `http://<eno1-ip>:3080` from laptop on Command Port
2. Complete **FRE** (`/setup`) — pick Capital, Creator, Work, Forge
3. Open each flagship Claw — confirm FRE wizards, no 500s
4. **Claw Cafe** — Ascension tab → Sync → pixel room populates
5. **Settings** — appearance, gamification toggle, optional Build Plane demo link

### E. Inference smoke (30 min)

```bash
curl -s http://127.0.0.1:11434/api/tags  # Ollama
curl -s http://127.0.0.1:3080/api/metrics/compute | jq .
```

Open agent chat in Work or Capital — confirm local inference or honest rule-only fallback.

### F. On-device QA (30 min)

```bash
cd /opt/curxor/pillar-4-dashboard
# Point env at /etc/curxor (production default — do NOT set CURXOR_DEV_QA_DIR)
sudo -u curxor NODE_ENV=production node scripts/qa-smoke.mjs http://127.0.0.1:3080
```

---

## Persistence map (what must live in `/etc/curxor`)

| File | Purpose |
|------|---------|
| `fre-state.json` | Global FRE |
| `user-settings.json` | Nav modules, appearance, buildPlane |
| `digital.env` | Bridge credentials (Alpaca, SMTP, social) |
| `cafe-state.json` | Ascension + pixel room ledger |
| `*-xp-events.json` | Cross-Claw gamification |
| `work-queue.json` / `capital-queue.json` / `content-queue.json` | Flagship desks |
| `claw-profiles.json` | Forge fleet |
| `claw-context.json` | CCP mesh |

**systemd** `ReadWritePaths` allows `/etc/curxor` — never rely on writes under `/opt/curxor/.../scripts/dev-qa`.

---

## Known first-boot limitations (honest)

| Area | On appliance without keys | What user sees |
|------|---------------------------|----------------|
| Capital live trading | No Alpaca keys | Paper/demo mode — labeled |
| Creator publish | No social keys | Schedule + demo publish |
| Work outbound | No SMTP | Demo sequences — labeled |
| Vision mesh | No cameras on eno2 | Cafe yard dock idle; lane A “AWAITING FRAME” |
| Ollama | Models not pulled | Rule-based chat; Go Live shows optional step |
| Tier C claws | N/A | Coming Soon badges — honest |

---

## Post-validation

- [ ] Re-capture demo screenshots from appliance IP
- [ ] Add one line to `docs/claw-cafe/EXIT-DEMO.md` — “verified on MS-S1”
- [ ] Update `docs/guides/01-installation.md` addendum with actual NIC names
- [ ] Tag release + OTA manifest only after on-device smoke passes
- [ ] File issues for anything that fails — do not force-ship

---

## Rollback

```bash
sudo systemctl stop curxor-dashboard
# Restore /etc/curxor backup if taken pre-install
sudo systemctl start curxor-dashboard
```

OTA rollback: `ota-updater.sh` — see [guides/09-ota-updates.md](../guides/09-ota-updates.md).

---

## References

- [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md)
- [FOUNDER-OVERNIGHT-AUDIT.md](./FOUNDER-OVERNIGHT-AUDIT.md)
- [03-networking.md](../guides/03-networking.md)
- [07-flight-command-dashboard.md](../guides/07-flight-command-dashboard.md)
