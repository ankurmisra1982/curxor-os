# CurXor OS — 48-Hour Pre-Unbox Checklist

> **Window:** Tue Jun 23 → Thu Jun 25, 2026 (MS-S1 MAX arrival)  
> **Goal:** Known-good software on dev machine · zero new features · hardware session ready  
> **Owner:** Ankur (UAT smile) + CTO agent (gate + golden path)

---

## Rules for this window

1. **No new features** — bug fixes only if they block exit-demo or `qa:local`.
2. **One demo path** — canonical exit-demo per flagship; no variant forks.
3. **Tag only after gate green** — `version.json` stays **0.9.1** until pre-unbox gate passes.
4. **Hardware day is inventory-first** — do not flash blind; run `verify-unbox-day.sh`.

---

## T-48 → T-24 (dev machine — **now**)

### Gate A — automated (run together)

**Windows PowerShell** — if `npm` fails with *"running scripts is disabled"*, use either:

```powershell
cd pillar-4-dashboard
npm.cmd run pre-unbox:gate
```

or skip npm entirely:

```powershell
cd pillar-4-dashboard
node scripts/pre-unbox-gate.mjs
```

> **New to unbox?** Print the simple walkthrough: [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md)

**macOS / Linux / Git Bash:**

```bash
cd pillar-4-dashboard
npm run pre-unbox:gate
```

**Optional one-time PowerShell fix** (current user only, then plain `npm` works):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Auto-picks a free port (3081–3099) if the default is busy. Log: `docs/curxor-os/pre-unbox-gate-log.txt`.

| # | Step | Command | Pass criteria |
|---|------|---------|---------------|
| A1 | Typecheck | `npm run typecheck` | exit 0 |
| A2 | Production build | `npm run build` | exit 0 |
| A3 | Full local QA | `npm run qa:local -- --port 3081` | all suites green |
| A4 | Version pin | `cat ../version.json` | `0.9.1` stable |
| A5 | Data path | `lib/curxor-data-dir.ts` | prod → `/etc/curxor` |
| A6 | Seed script | `scripts/seed-appliance-data.sh` | exists, executable |
| A7 | Unbox verify | `scripts/verify-unbox-day.sh` | exists, executable |

Equivalent manual steps (if not using gate script):

### Gate B — scope freeze (manual, 15 min)

- [ ] **Stop** exit-demo variants `-2` … `-5` in active demo scripts (canonical slugs only).
- [ ] **Freeze** Build Plane BP5+, Cafe C11+, new broker scaffolds, Vital/Kin depth.
- [ ] **Confirm** GTM truth: “Four flagship Claws + Forge; five Coming Soon previews.”

### Gate C — physical prep (manual, 30 min)

- [ ] Laptop on same LAN as future **eno1** Command Port.
- [ ] Ethernet cable for Command Port; second cable for **eno2** mesh (label before plug-in).
- [ ] Print or offline: [10-ms-s1-max-hardware-bios.md](../guides/10-ms-s1-max-hardware-bios.md).
- [ ] Print or offline: [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md) day-zero section.
- [ ] USB with Ubuntu 24.04 minimal ISO (preferred path A) OR vendor image audit plan (path B).

### Gate D — rsync bundle (manual, 10 min)

Confirm repo is push-ready for appliance copy:

```bash
# On appliance (day zero) — from laptop with repo clone:
sudo rsync -a --delete /path/to/curxor-os/ /opt/curxor/
cd /opt/curxor && sudo bash scripts/install-all.sh
```

- [ ] No uncommitted **code** you need on the box (local `dev-qa` JSON churn is OK to omit).
- [ ] `install-all.sh` and `seed-appliance-data.sh` present at repo root / pillar-4.

---

## T-24 → T-0 (eve of unbox — **Wed**)

| # | Task | Done |
|---|------|------|
| E1 | Re-run `npm run pre-unbox:gate` | [ ] |
| E2 | Skim [FOUNDER-OVERNIGHT-AUDIT.md](./FOUNDER-OVERNIGHT-AUDIT.md) §5 gaps | [ ] |
| E3 | Decide clean install (A) vs vendor audit (B) — default **A** | [ ] |
| E4 | Charge laptop; clear calendar 2–4 h for CTO session | [ ] |
| E5 | Optional: `npm run demo:capture:forge` etc. on dev — **not** required pre-unbox | [ ] |

**Do not** bump version or tag OTA until on-device smoke passes.

---

## T-0 — Unbox day (Thu — **hardware session**)

### Hour 0 — Inventory (30 min)

```bash
sudo chmod +x /opt/curxor/scripts/verify-unbox-day.sh
sudo /opt/curxor/scripts/verify-unbox-day.sh
```

Paste **GOLDEN PATH NOTES** from output into `docs/guides/01-installation.md` addendum (or GitHub issue).

**Decision:** Path A clean Ubuntu 24.04 **or** Path B vendor overlay.

### Hour 0.5 — BIOS (15 min)

- UMA / GPU memory → **Maximum**
- **eno1** = Command Port · **eno2** = Egress / mesh

### Hour 1–2 — Install (60–90 min)

```bash
sudo rsync -a /path/to/curxor-os/ /opt/curxor/
cd /opt/curxor && sudo bash scripts/install-all.sh
# Pro 128 only — before model pull:
sudo cp /opt/curxor/pillar-1-compute/config/compute.env.pro128.example /etc/curxor/compute.env
sudo ln -sfn /etc/curxor/compute.env /opt/curxor/pillar-1-compute/.env
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models
sudo /opt/curxor/scripts/verify-unbox-day.sh --post-models
```

```bash
systemctl status curxor-dashboard curxor-engine curxor-telemetry-broker
curl -s http://127.0.0.1:3080/api/setup/status
```

### Hour 2–3 — First-boot UAT (30 min)

1. `http://<eno1-ip>:3080` from laptop *(optional: on-box display — `http://127.0.0.1:3080`; not default · not storefront)*
2. FRE — select Capital, Creator, Work, Forge
3. Each flagship — FRE wizard, no 500s
4. Claw Cafe — Ascension → Sync → pixel room populates
5. Settings — gamification toggle, appearance

### Hour 3 — Inference + smoke (30 min)

```bash
curl -s http://127.0.0.1:11434/api/tags
curl -s http://127.0.0.1:3080/api/metrics/compute
cd /opt/curxor/pillar-4-dashboard
sudo -u curxor NODE_ENV=production node scripts/qa-smoke.mjs http://127.0.0.1:3080
```

Agent chat in Work or Capital — local LLM or honest rule-only fallback.

---

## T+0 → T+48 (post-unbox — **only if gate F passes**)

**On appliance after golden path** (optional kiosk — monitor-first boot):

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh
# or: sudo CURXOR_ENABLE_KIOSK=1 /opt/curxor/scripts/install-all.sh
sudo reboot
```

| # | Task | Blocked until |
|---|------|----------------|
| P0 | **Founder cockpit** — SSH, `BOX_IP`, deploy loop ([FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) F1–F6) | smoke green |
| P1 | Appliance demo captures (storefront) | UAT smile · P0 |
| P2 | `EXIT-DEMO.md` line “verified on MS-S1” | smoke green |
| P3 | Version bump + git tag | on-device qa-smoke |
| P4 | OTA manifest freeze | golden path doc |
| P5 | Investor / buyer one-pager with appliance screenshot | P1 |

---

## Exit-demo capture order (appliance IP)

Record on **127.0.0.1:3080 on the box** (re-host captures from operator laptop):

1. **Forge** — island mint → fleet → Cafe walk-out  
2. **Work** — demo tour → Go Live  
3. **Creator** — wizard → demo publish  
4. **Capital** — demo tour → paper rule  
5. **Cafe** — ascension sync → level-up ceremony (if XP events fired)

---

## Rollback

```bash
sudo systemctl stop curxor-dashboard
# restore /etc/curxor backup if taken pre-install
sudo systemctl start curxor-dashboard
```

---

## Quick reference

| Doc | Use |
|-----|-----|
| [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md) | Persistence map, limitations |
| [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) | Post-HW laptop + box loop (internal) |
| [FOUNDER-OVERNIGHT-AUDIT.md](./FOUNDER-OVERNIGHT-AUDIT.md) | What ships vs dev |
| [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md) | Scope tiers |
| `scripts/verify-unbox-day.sh` | CTO unbox session |
| `scripts/seed-appliance-data.sh` | First-boot `/etc/curxor` |

---

*Last gate run: see `pre-unbox-gate-log.txt`*

**Gate status (2026-06-24):** **PASS** on dev machine — typecheck, build, `qa:local` (port 3084), 184 smoke + all checklists green. Version pinned **0.9.1**.
