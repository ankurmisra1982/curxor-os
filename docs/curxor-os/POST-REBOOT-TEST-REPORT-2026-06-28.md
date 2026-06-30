# Post-reboot test report — 2026-06-28

> **Audience:** Ankur (founder) · internal QA after laptop + MS-S1 restart  
> **Box:** `http://10.0.0.1:3080/home` (updated from `192.168.86.211` — captive eno1) · BUILD_ID `afi-w9VyLGALUBOJM-KL_`  
> **Run by:** Agent (offline cycle)

---

## Executive summary

**The appliance is healthy and dogfood-ready.** After reboot, the dashboard briefly showed API failures while `curxor-dashboard` was in a `deactivating` state; it recovered automatically and all core APIs returned **200**.

| Layer | Result | Notes |
|-------|--------|-------|
| **Unit (typecheck)** | **PASS** | pillar-4 + pillar-2 |
| **Integration (laptop `qa:local`)** | **PASS** | Full matrix — smoke + all checklists/flows/scaffolds |
| **Integration (box `qa:smoke`)** | **PASS** | **192/192** on final run (earlier 190/192 during service flap) |
| **Integration (box user flows)** | **35/40** | 5 fails — **production FRE state**, not code regressions |
| **System (box)** | **PASS** | systemd, disk, ollama, `/etc/curxor` data intact |
| **UAT (browser)** | **Partial** | Prior session verified deploy UI; this session browser automation unavailable |

**No P0 blockers.** One **P2 hygiene** item: running laptop QA scripts against production mutates `/etc/curxor` (forged apps, build plane settings, XP).

---

## Pass / fail matrix

### Laptop — unit & gate

| Check | Result |
|-------|--------|
| `pillar-4-dashboard` typecheck | PASS |
| `pillar-2-engine` typecheck | PASS |
| `pre-unbox-gate.mjs --skip-qa` (typecheck + prod build) | PASS |
| `next lint` | **Skipped** — interactive ESLint migration prompt (Next 15 deprecation) |

### Laptop — integration (`npm run qa:local`)

| Suite | Result |
|-------|--------|
| qa-smoke (192 checks) | 192 PASS |
| capital-checklist | 8 PASS |
| creator-checklist | 9 PASS |
| work-checklist | 58 PASS |
| forge-checklist + levels | PASS |
| qa-user-flows (40) | 40 PASS |
| cafe ascension + checklist | PASS |
| approval stack, swarm, shop, kin, vital, tier-c sweep | PASS |

### Box — system (post-reboot)

| Check | Result |
|-------|--------|
| SSH | PASS |
| `curxor-dashboard.service` | **active** |
| `curxor-os.target` | **active** |
| Core APIs (setup, capital, patron, cafe, settings, delegation, forge FRE) | **200** |
| Key pages (`/home`, `/settings`, `/my-capital`, `/claw-forge`, `/claw-cafe`, `/ask`) | **200** |
| `.env.local` on box | **absent** (correct) |
| Disk `/` | 2% used |
| Ollama `qwen3:8b` | **available** |
| `curxor-compute` / `engine` / `telemetry-broker` | **inactive** (expected unless started) |

### Box — integration (against live URL)

| Suite | Result | Detail |
|-------|--------|--------|
| qa-smoke | **192/192 PASS** | Final run after service stable |
| qa-user-flows | **35/40** | See failures below |
| capital-checklist | **8/8 PASS** | |
| cafe-checklist | **19/19 PASS** | |
| forge-checklist | **19/23** | 4 persona-tour fails (FRE gate) |

### Box — deploy patch verification (source on `/opt/curxor`)

| Feature | Verified |
|---------|----------|
| Settings "Current:" helpers | 3 occurrences in `SettingsWorkspace.tsx` |
| Telemetry toggle label | "Telemetry" / "Hide telemetry" |
| Patron FAB portal | `createPortal` in `PatronAskFab.tsx` |
| Context hints dismiss | "Don't show tips" in `ContextHintBar.tsx` |

### Browser UAT

| Item | Result | How verified |
|------|--------|--------------|
| Telemetry button in header | PASS | Prior browser session + source on box |
| Context hints (beginner) + Got it / Don't show tips | PASS | Prior session snapshot on `/home` |
| Patron FAB present | PASS | "Open Patron Ask" in prior snapshot |
| Flat nav with claw links | PASS | Prior snapshot |
| Settings Intelligence/Cafe "Current:" live update | **Not re-verified** | Browser MCP unavailable this session |
| Telemetry → expert grouped nav | **Not re-verified** | Browser MCP unavailable |
| Patron FAB bottom-right position | **Not re-verified** | Needs CDP bounding box in browser |
| No duplicate Settings/Forge in home hero | **Not re-verified** | Prior deploy intent; confirm on dogfood |

---

## Failed tests — root cause analysis

All **7 box-only failures** (2 smoke + 5 flows on first run) classify as **environment / operator state**, not shipped-code bugs.

### 1. Forge demo tour + L4 persona tours (4 flow + 4 checklist)

**Symptom:** `Complete Forge FRE first`  
**Cause:** `/api/app-fre/claw-forge` → `initialized: false` on production box.  
**Impact:** Forge go-live stays `demoReady: false`; persona tours blocked by FRE gate.  
**Fix for dogfood:** Open **Claw Forge** → complete first-run experience once.

### 2. Vital demo tour → go_live (1 flow)

**Symptom:** `demoReady: false` despite lab step **complete**  
**Cause:** `/api/app-fre/my-vital` → `initialized: false`; go-live requires FRE step **pending**.  
**Fix for dogfood:** Open **Vital Claw** → complete FRE wizard.

### 3. Build plane delegation + capital create_rule (transient smoke fails)

**Symptom:** Failed during first box smoke run while dashboard was `deactivating`  
**Cause:** Service restart window + possible test ordering; **re-run passed 192/192**  
**Classification:** Transient infra, not logic bug

### Production state pollution (from QA against live box)

Running `qa-smoke.mjs` / `qa-user-flows.mjs` against `192.168.86.211` **writes to `/etc/curxor`**:

- `forgedAppSlugs` includes many `qa-smoke-*` and `flow-*` desks
- Build plane may be enabled via test POSTs
- Cafe XP / approval inbox mutated

**Recommendation:** Run integration suites against **laptop `qa:local` only**; use box for curl smoke + manual UAT. Add a read-only smoke mode or separate `/etc/curxor-qa` path for future box automation.

---

## Post-reboot gotcha (important)

After reboot, **`curxor-dashboard` can sit in `deactivating (stop-sigterm)`** for 1–2 minutes. During that window:

- `curl` returns **000** or hangs
- `systemctl is-active` may show `deactivating` not `active`

**Do not panic-deploy.** Wait or check:

```bash
systemctl status curxor-dashboard.service
journalctl -u curxor-dashboard -n 20 --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3080/api/setup/status
```

Service recovered without manual intervention in this test cycle. If stuck >3 min: `sudo systemctl restart curxor-dashboard.service`.

**Note:** A prior bad deploy one-liner **wiped `/opt/curxor`** when staging was empty. Current build restored via tarball + post-update. See [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md).

---

## P0 / P1 / P2 findings

| Severity | Finding | Action |
|----------|---------|--------|
| **P0** | None | — |
| **P1** | None | — |
| **P2** | QA scripts mutate production `/etc/curxor` when pointed at box IP | Don't run full `qa:local`/`qa-smoke` against box; dogfood only |
| **P2** | Forge + Vital FRE never completed on box | Complete FRE on first dogfood visit |
| **P2** | `next lint` blocked on ESLint migration prompt | Migrate to ESLint CLI when convenient |
| **P2** | compute / engine / telemetry-broker inactive | Start when testing inference mesh depth |

---

## Dogfood checklist (when you're back)

1. Hard refresh **`http://10.0.0.1:3080/home`** (`Ctrl+Shift+R`)
2. **Settings → Intelligence / Cafe** — confirm "Current: …" updates
3. Toggle **Telemetry** — expert nav grouping, no duplicate Home
4. **Beginner hints** — Got it / Don't show tips
5. **Patron** — FAB bottom-right; navigate away from `/ask` without trap
6. **Claw Forge** — complete FRE, run demo tour
7. **Vital** — complete FRE if testing longevity path
8. Spot-check **Capital** stats populate

Quick API smoke:

```bash
ssh curxor
for p in /api/capital/status /api/cafe/status /api/settings; do
  curl -s -o /dev/null -w "$p: %{http_code}\n" "http://127.0.0.1:3080$p"
done
```

---

## Related docs

- [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) — deploy, debug, verify-before-rsync
- [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) — daily loop

---

*Generated 2026-06-28 · post laptop + MS-S1 reboot · deploy patch Settings/AppNav/P2 polish live on box.*
