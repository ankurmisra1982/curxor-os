# Full Audit · Debug · Optimization — Agent Scope

**Created:** 2026-06-23  
**Purpose:** Handoff for a new agent session. Do **not** treat this as already executed.  
**Repo:** `C:\Users\ankur\curxor-os` · branch `master` (ahead of `origin/master` by ~10 commits)  
**Primary surface:** `pillar-4-dashboard` (+ `pillar-3-telemetry` bridges where relevant)

---

## 1. Objective

After ~24h of intense shipping (Forge F10–F15, Work v0.6.2, Forge v0.6.3/v0.6.5 WIP), run a **careful, evidence-based** pass:

1. **Audit** — correctness, auth, data paths, regression matrix  
2. **Debug** — reproduce and fix failures with runtime proof  
3. **Optimize** — only where measured (no speculative refactors)

**Exit criteria:** `npm run typecheck` green · `npm run qa:local` green · Forge checklist 23/23 · Bugbot P0/P1 resolved or explicitly waived · v0.6.5 release artifacts committed with clean dev-qa seeds.

---

## 2. What shipped (last 24h — audit focus)

### Forge arc (F10–F15, mostly uncommitted on `master`)

| Wave | Capability | Key paths |
|------|------------|-----------|
| **F10** | Forged creator-desk v2 | `lib/forged-creator-store.ts`, `ForgedDeskPanels.tsx`, `executeForgedCreatorSkill` |
| **F11** | Fleet lifecycle (archive, promote, batch export) | `lib/forge-fleet-lifecycle.ts`, `ForgeFleetPanel.tsx`, `/api/forge/status` |
| **F12** | Cafe + CCP handoff | `lib/forge-cafe-events.ts`, `lib/forged-context-mesh.ts`, `publish_context` skill |
| **F13** | Forged capital-desk v2 | `lib/forged-capital-store.ts`, capital panel + L4-capital tour |
| **F14** | GTM finalize | `version.json` 0.6.5, `release-notes.json`, `docs/forge/BEST-IN-CLASS.md` |
| **F15** | Work send stub + CCP read + Setup Wizard | `sendForgedSequenceStep`, `claw-context-store` profileId fix, `ForgeSetupWizard.tsx` |

### Also in working tree (non-Forge — still in scope for full audit)

- Shop Claw desk + commerce bridges (Shopify/eBay/Printify) — **many TS errors**
- Vital / Kin / Swarm / Optimus leveling + checklists
- Work W21–W35 arc (CRM, outbound worker, Cafe XP)
- Channel router, scheduler, humanoid hub expansions

### Committed recently (already on `master`)

- `0db5e10` — Forge v0.6.3 (work-desk v2 day-one)
- `30f9ef6` — Work v0.6.2 day-one finalize

---

## 3. Repo state warnings (read first)

| Signal | Detail | Action in audit |
|--------|--------|-----------------|
| **Large dirty tree** | 100+ modified + 200+ untracked files | Stage/commit strategy before release; separate shop WIP if needed |
| **`typecheck` red** | 40+ errors (shop-dashboard-types circular imports, content/status body types, `ForgeFleetCounts.archived`, `forge-fleet-lifecycle` return type) | **Phase 0 blocker** — fix before claiming green |
| **dev-qa pollution** | Dozens of `forged-checklist-*` workspaces from checklist runs | Trim seeds; add `.gitignore` or cleanup script |
| **Version drift** | `version.json` = 0.6.5 but F15 + release notes may be uncommitted | Align `RELEASE-NEXT.md`, tag only after QA green |
| **Dev server env** | Long-lived `next dev` without `CURXOR_*` paths → 500s / wrong stores | Always use `qa-local.mjs` env or document port 3092 pattern |
| **Windows ports** | `npm run dev -- --port X` may ignore port | Use `npx next dev --hostname 127.0.0.1 --port X` |

---

## 4. Bugbot pre-scan (branch changes)

Run Bugbot again at start (`/review-bugbot` or Task `bugbot`, `Diff: branch changes`). Initial findings:

| Severity | Location | Finding |
|----------|----------|---------|
| **High** | `pillar-4-dashboard/app/api/channels/slack/events/route.ts:8-31` | Slack signature verifies `JSON.stringify(payload)` not raw body → 401 when signing secret set |
| **High** | `pillar-3-telemetry/src/curxor_broker/digital_bridges.py:3412-3440` | Printify `_cents_to_dollars`: amounts &lt;100 cents treated as dollars → margin corruption |
| **Medium** | `pillar-4-dashboard/app/api/work/approval-callback/route.ts:26-36` | `approveSend` / `executeOutboundSend` skip desk permission checks |
| **Medium** | `pillar-4-dashboard/app/api/humanoid/hub/route.ts:35-40` | GET status requires LAN auth unlike peer desk routes |
| **Medium** | `pillar-3-telemetry/.../digital_bridges.py:2996-3001` | Shopify custom domain used as API host instead of `*.myshopify.com` |
| **Low** | `pillar-4-dashboard/app/(desktop)/layout.tsx:16-17` | Archived forged slugs may still appear in nav if slug removal failed |

### Waivers (post-fix)

| Severity | Location | Waiver |
|----------|----------|--------|
| **Medium** | `app/api/humanoid/hub/route.ts` GET | Intentionally no `requireLanAuth` on GET — matches `/api/work/status` and `/api/vital/status` desk bootstrap; `qa-smoke` humanoid suite depends on unauthenticated localhost reads. POST mutations remain LAN-gated. |

**Forge-specific areas Bugbot should re-check:**

- `sendForgedSequenceStep` — double-send, draft→active edge cases
- `claw-context-store` `profileId == null` filter — regression for profile-scoped queries
- `ForgeSetupWizard` — island mode selected but always calls `provision-app` (framework only)
- `getMergedContextForAgent` forged dedupe + limit 40 eviction
- Cafe mint attribution flake (was failing before profileId fix)

---

## 5. Phased execution plan

### Phase 0 — Baseline (30–60 min)

**Goal:** Reproducible environment + honest health snapshot.

```powershell
cd C:\Users\ankur\curxor-os\pillar-4-dashboard
git status -sb
git log --oneline -15
npm run typecheck 2>&1 | Tee-Object typecheck-baseline.txt
```

- [ ] Record typecheck error count and group by subsystem (shop / forge / content / other)
- [ ] Confirm `scripts/dev-qa/README.md` env vars match `qa-local.mjs`
- [ ] Kill stale dev servers; prefer `npm run qa:local` over ad-hoc `next dev`
- [ ] Run Bugbot on `branch changes`; merge new findings into tracking table

**Acceptance:** Baseline log saved; no fixes yet unless blocking Phase 1.

---

### Phase 1 — Typecheck & compile gate (P0)

Fix in priority order:

1. **`lib/shop-dashboard-types.ts`** — circular re-exports (`EbayBridgeStatus`, etc.)
2. **`lib/forge-fleet-lifecycle.ts`** — `ArchiveClawResult` missing `ok` on error path
3. **`components/apps/ClawForgeWorkspace.tsx`** — `EMPTY_COUNTS` missing `archived`
4. **`components/apps/forge/forged/ForgedDeskPanels.tsx`** — `json.status` possibly undefined
5. **`app/api/content/status/route.ts`** — POST body type missing `title`, `contextLabel`, `detail`, `targetCell`

```powershell
npm run typecheck
```

**Acceptance:** `npm run typecheck` exits 0.

---

### Phase 2 — Bugbot P0/P1 remediation

| ID | Fix approach | Verify |
|----|--------------|--------|
| Slack signature | Read raw body before parse; verify then `JSON.parse` | Unit test or manual curl with signed payload |
| Printify cents | Always `n / 100.0` for cent integers | Shop margin watch fixture &lt; $1 |
| Work approval callback | Mirror `readWorkDeskPermissions` from `/api/work/status` | Viewer role blocked |
| Humanoid GET auth | Align with `/api/work/status` GET (no auth) or document exception | `qa-smoke` humanoid bootstrap |
| Shopify domain | Resolve `*.myshopify.com` for Admin API | `qa:shop-bridges` mock path |
| Archived nav | Filter `forged-apps` where `status !== 'archived'` in `layout.tsx` | Archive claw → nav gone |

Re-run Bugbot after fixes.

**Acceptance:** No High/Medium Bugbot findings open (or documented waiver in this file).

---

### Phase 3 — Forge F10–F15 regression matrix

**Server:** use `qa-local` env (all `CURXOR_*` paths).

```powershell
# After qa:local starts server OR with env vars exported:
node scripts/forge-checklist.mjs http://127.0.0.1:3080
node scripts/qa-forge-levels.mjs http://127.0.0.1:3080
```

**Manual / scripted checks:**

| # | Scenario | API / UI | Expected |
|---|----------|----------|----------|
| 1 | Work forged send stub | `POST /api/forged/{id}/status` `send_sequence_step` | `send.status === "simulated"`, sequence advances |
| 2 | CCP publish + read | publish_context → `GET /api/mesh/context?appId=my-work` | `forged.{appId}.desk` in `context.work` |
| 3 | CCP profile filter | Same with `profileId={clawProfileId}` | Forged slice still visible when profile matches |
| 4 | Setup wizard | First visit Forge, no forged apps | Wizard auto-opens once |
| 5 | Setup wizard mint | Finish framework path | `forgeSetupComplete` in FRE; nav to forged desk |
| 6 | Archive + promote | Fleet panel | Slug removed; promote creates framework href |
| 7 | Batch export | Ops export fleet | ZIP/bundles count matches fleet |
| 8 | Demo tours | L1, L4-work, L4-creator, L4-capital, L5 | Each returns `forgedHref` or ops steps |
| 9 | Assist on forged | `/api/app-agent/assist` create_lead | Desk refreshes |

**Known flake:** Cafe mint consumer — verify after CCP fix; re-run checklist 3× if intermittent.

**Acceptance:** `forge-checklist.mjs` → **23/23 passed** (3 consecutive runs).

---

### Phase 4 — Full `qa:local` matrix

```powershell
npm run qa:local
# or with rebuild:
npm run qa:local -- --rebuild
```

Includes: smoke, user flows, capital/creator/work/forge/vital/kin/swarm/shop checklists per `qa-local.mjs`.

- [ ] Capture first failing script name + assertion
- [ ] Fix root cause (not skip tests)
- [ ] Re-run full `qa:local` until green

**Acceptance:** `qa:local` exit 0 end-to-end.

---

### Phase 5 — Security & auth consistency audit

**Checklist:**

- [ ] POST routes that mutate state call `requireLanAuth` (forged status, forge status, work status)
- [ ] GET desk bootstrap routes consistent (document intentional exceptions)
- [ ] Forged archived apps return 400 on desk API
- [ ] Import bundle warning confirm cannot be bypassed
- [ ] CCP consent matrix includes new scopes (`my-work`+work, `my-capital`+finance, `my-content-creator` subscription)
- [ ] No secrets in `scripts/dev-qa/` committed

**Files:** `lib/lan-auth.ts`, `app/api/**/route.ts`, `lib/ccp-consent-store.ts`

---

### Phase 6 — Performance & optimization (measure first)

Only optimize with evidence:

| Area | Hypothesis | Measure | Candidate fix |
|------|------------|---------|---------------|
| `claw-context.json` | 500-record cap evicts forged slices | Log record count after checklist | Raise limit or scope-specific purge |
| `getMergedContextForAgent` | Double `queryClawContext` | Time assist prompt build | Single query if subscriptions suffice |
| `qa-local` | Cold Next compile races | `qa-http.mjs` retries | Already has retries — tune if needed |
| Forged desk panels | Redundant `loadStatus` on every keystroke | React profiler | Debounce or narrow deps |
| `provision-app` | Fixed 1.5s sleep | Wall clock | Reduce in dev only |

**Rule:** No optimization PR without before/after metric in commit message.

---

### Phase 7 — Hygiene & release

- [ ] Trim `scripts/dev-qa/agent-workspace/forged-checklist-*` (keep 1–2 fixtures max)
- [ ] Update `docs/forge/RELEASE-NEXT.md` — add **F15** section
- [ ] Update `release-notes.json` for 0.6.5 if not done
- [ ] `docs/forge/BEST-IN-CLASS.md` — GTM capture checkbox honesty
- [ ] Commit strategy: logical commits (forge / shop / fixes) — **ask user before push**
- [ ] Optional: `git tag v0.6.5` after user approval

---

## 6. Out of scope (defer)

- Full OOTB tab clone on forged apps
- Claw Cafe pixel room / Master AI patron panel
- Live SMTP on forged work-desk (stays simulated)
- Hard delete claw files on disk
- kiosk-desk v2
- Production deployment / CI matrix expansion (unless `qa:local` fails in CI — then fix CI only)

---

## 7. Agent prompt (copy into new session)

```text
Execute docs/AUDIT-SCOPE-2026-06-23.md systematically.

Rules:
- Follow phases 0→7 in order; do not skip typecheck gate.
- Run Bugbot at start and after Phase 2 fixes (Task bugbot, Diff: branch changes).
- Use npm run qa:local for integration tests; export CURXOR_* paths if running checklists manually.
- Fix root causes; minimal diffs; match existing conventions.
- Document waivers in docs/AUDIT-SCOPE-2026-06-23.md §4 if not fixing a finding.
- Do not git push or tag without explicit user request.
- End with: typecheck status, qa:local status, forge-checklist score, Bugbot summary, recommended commit breakdown.
```

---

## 8. Quick reference commands

```powershell
cd C:\Users\ankur\curxor-os\pillar-4-dashboard

# Typecheck
npm run typecheck

# Full local QA (starts server + all suites)
npm run qa:local

# Forge only
npm run qa:forge-excellence

# Work / Capital / Creator
npm run qa:work-excellence
npm run qa:capital-checklist
npm run qa:creator-checklist

# Dev server with correct env (manual)
$env:CURXOR_DEV_QA_DIR="$PWD\scripts\dev-qa"
# ... copy remaining vars from scripts/qa-local.mjs ...
npx next dev --hostname 127.0.0.1 --port 3080
```

---

## 9. Success report template (agent fills in)

```markdown
## Audit complete — 2026-06-23

| Gate | Result |
|------|--------|
| typecheck | ✅ |
| qa:local | ✅ (after `--rebuild`; stale `.next` caused preview-page 500s) |
| forge-checklist | 23/23 |
| Bugbot High/Med (audit scope) | 0 open (6/6 remediated or waived) |

### Fixes landed
- Typecheck P0: shop-dashboard-types circular imports, forge-fleet-lifecycle `ok`, EMPTY_COUNTS.archived, ForgedDeskPanels narrowing, content/status POST body
- Bugbot P0/P1: Slack raw-body signature, Printify `_cents_to_dollars`, work approval-callback permissions, Shopify myshopify domain, archived nav filter
- Humanoid hub push knowledge mesh publications; relationship normalize; GET auth aligned with work/vital (waiver)
- Forge cafe mint `await ingestCafeEvent`; forge-checklist cafe ledger assertion
- Shop `reset_commerce_demo` API + qa-shop-bridges dev-state reset (idempotent mock bootstrap)
- QA harness: `qa-local-suites.mjs` (Windows Node 24 libuv spawn fix), graceful `process.exitCode` in verify/checklist scripts
- Tier C: signal-claw + vital-claw FREEZE.md, verify-tier-c-sweep 21/21

### Waivers
- Humanoid hub GET — no LAN auth (desk bootstrap parity with work/vital; localhost QA)

### Post-audit Bugbot follow-ups (not blocking)
- Signal `/api/signal/status` GET LAN auth vs browser fetch
- Capital alpha `set_alert_preferences` not applied in `buildAlphaFeed`
- Telegram approval callback missing `canApprove` deskRole gate

### Recommended commits
1. `fix(audit): typecheck + Bugbot P0/P1 security/commerce`
2. `fix(qa): qa-local-suites Windows harness + shop bridge reset`
3. `docs: audit scope report, F15 RELEASE-NEXT, tier-c FREEZE`
```
