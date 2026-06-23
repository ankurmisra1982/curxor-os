# The Forge — Release Next



> Tracking: [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) · [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)



## Shipped (foundation)



- [x] W1 — Workspace tabs Mint / Fleet / Stacks + `forge-level-gates.ts`

- [x] P1 — `provisioningMode` on profiles · fleet badges · connection picker

- [x] P2 backend — `provision-app` · `forged-apps.json` · agent workspace seed · nav slugs

- [x] P3 backend — `/api/claw/import` · bundle validation · warning confirm

- [x] Wizard — 5 steps · framework / island / import API routing

- [x] `/my-claw/[slug]` · `ForgedClawAppShell` · template desk panels

- [x] Smoke — assist · tab gates · forged-apps · provision-app · import reject



## Best-in-class arc



- [x] **F0** — `create` island-only · copy truth

- [x] **F1** — Templates + Import tabs (L4 UI) · Import tab provisions without overlay

- [x] **F2** — Unified Fleet registry · `/api/forge/status` · Set active

- [x] **F3** — Forge growth leveling FRE + settings + coach

- [x] **F4** — Forged desk template panels + `forged-level-gates.ts`

- [x] **F5** — Go Live + demo tour · status API `goLive` / `demoReady`

- [x] **F6** — Import download template · `POST /api/claw/export`

- [x] **F7** — L5 Ops tab · `ForgeOpsPanel`

- [x] **F8** — Cafe mint events · `forge-cafe-events.json` dev ledger

- [x] **F9** — forge-checklist + qa-forge-levels in qa:local · docs refresh



## Shipped (Forge day-one — v0.6.3)

- [x] **Forged work-desk v2** — per-desk `work-queue.json`, `/api/forged/[appId]/status`, server skills
- [x] **Persona demo tours** — L1 / L4 work-desk / L5 ops via `run_demo_tour` persona
- [x] **ForgeLevelUpNudge** — fleet-based growth tips on Mint tab
- [x] **QA + GTM** — verify-forge-exit-demo-scaffold, user flows, capture-forge-demo, forge-exit walkthrough

## Shipped (F10 — creator-desk v2)

- [x] **Forged creator-desk v2** — per-desk `content-queue.json`, draft + schedule server skills
- [x] **ForgedCreatorDeskPanel** — real queue UI with draft, schedule, post list
- [x] **L4-creator demo tour** — `run_demo_tour` persona `L4-creator`
- [x] **Forged skill execution** — agent console taps call `executeSkillMesh` on forged desks
- [x] **QA** — smoke, checklist, user flows, exit-demo scaffold for creator round-trip

## Shipped (F11 — fleet lifecycle)

- [x] **Archive claw** — `POST /api/forge/status` action `archive_claw` (soft archive, nav slug removed)
- [x] **Promote island → framework** — action `promote_to_framework` with template inference
- [x] **Batch export** — `POST /api/claw/export` `{ exportAll: true }` + Ops/Fleet UI
- [x] **Fleet UI** — Archive, Promote, per-row Export on Fleet tab

## Shipped (F12 — Cafe + CCP handoff)

- [x] **Cafe mint consumer** — mint events attribute to forged/profile `appId`; sync uses per-claw id
- [x] **Archive walk-out** — `forge.claw_archived` → Cafe walk state
- [x] **CCP forged publish** — `publishForgedDeskContext` + real `publish_context` skill/API
- [x] **FRE mesh sync** — `meshPublish` toggle updates `meshConnected` on forged record + profile

## Shipped (F13 — capital-desk v2)

- [x] **Forged capital-desk v2** — per-desk `capital-queue.json`, research + rules + arm server skills
- [x] **ForgedCapitalDeskPanel** — watchlist, rule list, arm rule UI
- [x] **L4-capital demo tour** — `run_demo_tour` persona `L4-capital`

## Shipped (F14 — GTM finalize)

- [x] **Island mint E2E** — smoke + checklist + user flow (fleet badge, no nav href)
- [x] **Import/export round-trip** — user flow export → re-import with operator confirm
- [x] **Forged assist E2E** — user flow work-desk `create_lead` via `/api/app-agent/assist`
- [x] **Scorecard + storefront** — `BEST-IN-CLASS.md` refresh, `FEATURE-FUNCTION.md` honest modes
- [x] **QA expansion** — capital smoke/flows, exit-demo scaffold, checklist ~22 checks
- [x] **Version** — `0.6.5` + release notes

## Shipped (F15 — audit hardening + desk send stub)

- [x] **Forged work send stub** — `sendForgedSequenceStep` simulated send advances sequence
- [x] **CCP profileId fix** — `claw-context-store` null profile filter; Cafe mint attribution stable
- [x] **ForgeSetupWizard** — first-visit auto-open; framework provision path
- [x] **Audit remediation** — Slack raw-body signature, Printify cents, work approval permissions, archived nav filter, Shopify `*.myshopify.com` domain guard
- [x] **QA harness** — `qa-local-suites.mjs` (Windows Node 24 spawn fix), shop `reset_commerce_demo`, tier-c sweep 21/21

## Deferred



- Full OOTB tab clone on forged apps

- Claw Cafe pixel room

- Master AI patron panel

- Hard delete claw (files on disk) — soft archive only for now



## GTM capture



See [EXIT-DEMO.md](./EXIT-DEMO.md) for walkthrough recording steps.

