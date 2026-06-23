# The Forge — Best-in-Class Build Plan

> **Baseline:** W1 + P1 + P2/P3 backend + wizard wiring (in repo)  
> **Scorecard:** [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — update after each wave  
> **North star doc:** [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) · [CLAW-CAFE-PRD.md](../curxor-os/CLAW-CAFE-PRD.md)  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Status:** Active scope push — hand to Forge Agent chat  
> **Target band:** v0.4.0–v0.4.2 (Forge arc before Cafe C1)

---

## North star

The Forge is CurXor’s **create-to-earn engine** — where operators mint digital employees that feed the **Master AI arc**:

```text
Describe intent → choose connection mode → provision on bare metal
    → Claw appears in Fleet + nav (+ Cafe room later)
    → SOUL/TOOLS + optional CCP publish → Master AI learns from use
```

**Buyer promise:** “Describe it, forge it, own it — on your metal, your rules.”

**Best in class for this purpose means:**

1. **Honest three paths** — Framework / Island / Import never confuse engine profiles with full desks.  
2. **L1–L5 Forge personas** — creation maturity (Sketcher → Foundry), not operator skill flex.  
3. **Parity with Tier A apps** — tabs, growth gates, coach tips, Go Live, demo tour, QA matrix.  
4. **Forged desks that work** — `/my-claw/[slug]` is a real agent workspace, not a placeholder card.  
5. **Cafe-ready** — mint events stubbed for Claw Cafe C2 (no Cafe UI in this arc).

**Do not rebuild:** OpenClaw cloud marketplace, arbitrary Docker agent hosts, runtime codegen of new Next routes. **Do** template registry + dynamic `/my-claw/[slug]`.

---

## Current state vs target (honest inventory)

### Shipped (keep — do not regress)

| Area | What works |
|------|------------|
| **Workspace shell** | `ClawForgeWorkspace` · Mint / Fleet / Stacks tabs · `ForgeLevelBadge` |
| **Wizard** | 5-step flow · all 3 modes call correct APIs (`create` / `provision-app` / `import`) |
| **Backend P2** | `provisionFrameworkApp` · `forged-apps.json` · FRE seed · agent workspace · nav slugs |
| **Backend P3** | `importClawBundle` · warning scan · 409 confirm flow |
| **Forged route** | `/my-claw/[slug]` · `ForgedClawAppShell` · agent console + FRE |
| **Templates** | 5 packs: blank, work, creator, capital, kiosk · intent inference |
| **Fleet badges** | `provisioningMode` on profiles · Island/Framework/Imported labels |
| **Smoke** | `qa-smoke.mjs`: assist, tab gates, forged-apps GET, provision-app, import reject |
| **Assist** | `ForgeAssistProvider` · multimodal · `?new=1` · skills list_fleet / attach_vision |

### Gaps (this plan closes them)

| Gap | Impact | Wave |
|-----|--------|------|
| **`/api/claw/create` accepts framework/imported** | Fake “full app” engine profiles; smoke expects reject | **F0** |
| **Stale UI copy** (“Framework ships later”) | Trust hit at $3,999 | **F0** |
| **L4 tabs defined but not rendered** | Templates / Import gates exist in `forge-level-gates.ts` only | **F1** |
| **Fleet = profiles only** | Forged apps without engine link invisible; no unified registry | **F2** |
| **Forge growth not in FRE/settings** | Tabs use legacy `experienceLevel`; no Forge persona progression | **F3** |
| **Forged desk = placeholder** | Framework mint feels hollow vs Capital/Work | **F4** |
| **No Go Live / demo tour** | No exit-demo path for GTM | **F5** |
| **Import UX wizard-only** | No file upload, template download, dedicated tab | **F6** |
| **No L5 Ops tab** | Foundry persona incomplete | **F7** |
| **No Cafe mint events** | Blocks Cafe C2 wiring | **F8** |
| **qa-forge-levels not in qa:local** | Regressions slip through | **F9** |
| **No RELEASE-NEXT / BEST-IN-CLASS** | GTM docs lag Tier A apps | **F9** |
| **CCP: forged apps not in registry** | Master AI mesh blind to forged desks | **F8** (optional) |

---

## Scope boundary

### In scope

| Track | Waves | Outcome |
|-------|-------|---------|
| API hygiene | F0 | Island-only `create`; clear errors |
| Workspace completeness | F1–F2 | Templates + Import tabs; unified Fleet |
| Growth & persona | F3 | Forge L1–L5 in FRE, settings, coach |
| Forged desk depth | F4 | Template-specific minimal panels + gates |
| GTM proof | F5 | Go Live + demo tour + bootstrap status |
| Import/export craft | F6 | Upload, template JSON, export bundle |
| Foundry ops | F7 | L5 Ops tab scaffold |
| Cafe handoff | F8 | `forge.claw_minted` events (+ optional CCP) |
| QA + docs | F9 | checklist, qa:local, RELEASE-NEXT, capture |

### Explicitly deferred

- Full clone of Work/Creator/Capital tab matrices on forged apps  
- Dynamic CCP registry codegen per forged app (v2 — manual opt-in publish skill only in F8)  
- Claw Cafe pixel room (separate arc)  
- Master AI patron chat panel  
- Box-to-box migration wizard  
- Arbitrary OpenClaw skill adapters  
- Delete/archive API (nice-to-have post-F9)

---

## Forge persona matrix (L1–L5)

| Level | Label | Who | Default tab | Visible capabilities |
|-------|-------|-----|-------------|----------------------|
| **L1** | Sketcher | First mint, learning the factory | **Mint** | Intent, connection mode, embedded wizard, Stacks hidden |
| **L2** | Builder | 2+ claws or 1 forged desk | **Fleet** | Fleet registry, active profile, Open desk links |
| **L3** | Smith | Tuning stacks, multimodal | **Fleet** or Stacks | Stacks catalog, manual model pick, recommend preview |
| **L4** | Fabricator | Template power-user, imports | **Templates** | Template catalog shortcuts, Import tab, export bundle |
| **L5** | Foundry | Fleet operator, governance | **Ops** | Fleet health, inference status, batch scaffold |

**FRE intent → `forgeGrowthLevel`** (add to Forge FRE fields):

| Intent | Level |
|--------|-------|
| `first_claw` | L1 |
| `side_projects` | L2 |
| `custom_stacks` | L3 |
| `templates_import` | L4 |
| `fleet_operator` | L5 |

Store: `user-settings.forgeGrowthLevel` · FRE config mirror · `resolveForgeGrowthLevel()` already reads `config.growthLevel`.

Add Forge column to [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md): Sketcher → Foundry.

---

## Connection modes (product contract)

| Mode | API | Nav | FRE | Mesh | Cafe event |
|------|-----|-----|-----|------|------------|
| **Island** | `POST /api/claw/create` (island only) | No | No | No | `forge.claw_minted` island |
| **Framework** | `POST /api/claw/provision-app` | Yes `/my-claw/{slug}` | Yes | Opt-in FRE | `forge.claw_minted` framework |
| **Imported** | `POST /api/claw/import` | If framework integration | Yes if framework | Per bundle | `forge.claw_minted` imported |

**Island rule:** `/api/claw/create` MUST reject `provisioningMode !== "island"` with 400 (smoke already expects this).

---

## Build waves

### F0 — API hygiene & copy truth (0.5 day)

**Goal:** Backend matches wizard; no lying UI.

| Task | File(s) |
|------|---------|
| Reject non-island on `create` | `app/api/claw/create/route.ts` |
| Split helpers: `islandCreateAvailable` vs wizard modes | `lib/forge-provisioning.ts` |
| Fix picker copy (“All three paths live — island = engine only”) | `components/apps/forge/ForgeConnectionModePicker.tsx` |
| Align wizard step 0 description | `components/claw/NewClawWizard.tsx` |

**Done when:** `qa-smoke` check `forge create rejects framework mode` passes.

---

### F1 — Templates & Import tabs (L4 UI) (1 sprint)

**Goal:** Render tabs already gated in `forge-level-gates.ts`.

**New components:**

| Component | Purpose |
|-----------|---------|
| `ForgeTemplatesPanel.tsx` | Grid of `FORGE_TEMPLATE_LIST` · “Mint with template” → opens wizard pre-filled |
| `ForgeImportPanel.tsx` | File upload → JSON · paste area · integration toggle · warnings list · confirm checkbox |

**Wire:** `ClawForgeWorkspace.tsx` — `workspaceTab === "templates" | "import"`.

**Done when:**

- L4 growth (patch FRE or dev-qa) shows 5 tabs in UI  
- Template card click → wizard with `templateId` + inferred intent placeholder  
- Import tab can call `/api/claw/import` without opening overlay wizard  

---

### F2 — Unified Fleet registry (1 sprint)

**Goal:** Single pane for engine profiles + forged apps.

| Task | Detail |
|------|--------|
| Bootstrap fetch | `GET /api/claw/forged-apps` + existing profiles — new `GET /api/forge/status` optional |
| Fleet rows | Group by mode · show engine stack · forged href · created date |
| Actions | **Set active** (engine) · **Open desk** · **Mint again** (prefill intent) |
| Empty state | CTA to Mint tab with connection mode explanation |

**Files:** `ForgeFleetPanel.tsx` · `lib/forge-fleet-service.ts` (client helper) · optional `app/api/forge/status/route.ts`

**Done when:** Framework mint from F1 appears in Fleet with Open desk without reading claw-profiles alone.

---

### F3 — Forge growth leveling (1 sprint)

**Goal:** Persona progression like Work/Capital.

| Task | File(s) |
|------|---------|
| `forgeGrowthIntent` FRE field + mapping | `lib/forge-growth.ts` · `app-agent-catalog.ts` claw-forge fre |
| Persist `forgeGrowthLevel` in settings merge | `lib/user-settings.ts` |
| Use growth for `ExperienceAppSection` min levels on Forge sections | Forge panels — map L1→beginner, L3→standard, L5→expert OR add growth-aware wrapper |
| Expand coach catalog L1–L5 tips | `lib/experience-coach-catalog.ts` claw-forge |
| Persona copy module | extend `lib/forge-level-copy.ts` with section subtitles |

**Done when:** Changing FRE intent changes visible tabs without manual settings hack.

---

### F4 — Forged desk depth (1–2 sprints)

**Goal:** Framework mint opens a desk that feels real, not a bullet list.

| Task | Detail |
|------|--------|
| `lib/forged-level-gates.ts` | Per `templateId` section visibility (mirror work-level-gates pattern) |
| Template mini-panels | |
| → `work-desk` | Pipeline stub + “Create lead” skill CTA |
| → `creator-desk` | Draft textarea stub + schedule CTA |
| → `capital-desk` | Watchlist chips from FRE + research CTA |
| → `kiosk-desk` | Lane status + link to vision stream hint |
| → `blank-desk` | Desk focus field + publish_context CTA |
| Fix persona label | Use `FORGE_GROWTH_LABELS` or template-specific epithet — not `growthLabel("my-work")` |
| `appId` on sections | Pass forged `appId` to `ExperienceAppSection` when component supports it (or forge-specific sections without wrong appId) |

**Files:** `ForgedClawWorkspace.tsx` · `components/apps/forge/forged/*Panel.tsx`

**Done when:** Each template shows ≥1 interactive panel + agent console works post-FRE.

---

### F5 — Go Live & demo tour (1 sprint)

**Goal:** GTM exit path like Work/Creator.

| Task | Detail |
|------|--------|
| `lib/forge-go-live.ts` | Checks: inference reachable · ≥1 claw OR forged app · FRE complete |
| `ForgeGoLivePanel.tsx` | Steps · demoReady banner · **Run demo tour** |
| Skill `run_forge_demo_tour` | Plan skill: framework blank-desk mint with `demo` flag OR simulated matrix |
| Bootstrap | `GET /api/forge/status` returning `{ profiles, forgedApps, goLive, demoReady }` |
| Wire skill executor | `lib/skill-executors.ts` |

**Done when:** Demo tour completes without SMTP/hardware; Go Live panel shows green demoReady in dev-qa.

---

### F6 — Import/export craftsmanship (0.5–1 sprint)

| Task | Detail |
|------|--------|
| Download template JSON button | `emptyImportBundleTemplate()` |
| File upload → parse client-side → preview warnings | `ForgeImportPanel.tsx` |
| `POST /api/claw/export` | Body: `{ forgedAppId \| profileId }` → bundle v1 JSON |
| Round-trip QA smoke | export → import → same name/intent |

**Done when:** Operator can download template, edit offline, import from Import tab.

---

### F7 — Ops tab (L5 Foundry) (0.5 sprint)

| Task | Detail |
|------|--------|
| Add `ops` to `ForgeWorkspaceTab` at L5 | `forge-level-gates.ts` |
| `ForgeOpsPanel.tsx` | Fleet counts by mode · active profile · Ollama ping · forged app count |
| Placeholder actions | “Restart active engine profile” · “Export fleet bundle” (disabled if not F6) |

---

### F8 — Cafe & Master AI handoff (0.5 sprint)

| Task | Detail |
|------|--------|
| `lib/forge-cafe-events.ts` | `emitForgeCafeEvent({ kind, appId, mode, name })` |
| Call from `create`, `provisionFrameworkApp`, `importClawBundle` | store append-only log: `cafe-events.json` dev path |
| Event kinds | `forge.claw_minted`, `forge.import_completed`, `forge.framework_provisioned` |
| Optional: `publish_context` skill on forged apps writes CCP slice when FRE meshPublish | `skill-executors.ts` + mesh context POST |

**Cafe C2 will consume** — no Cafe UI here.

**Done when:** After mint, dev-qa log contains event row; smoke GET optional.

---

### F9 — QA matrix & GTM docs (0.5–1 sprint)

| Task | Detail |
|------|--------|
| `scripts/forge-checklist.mjs` | Tab gates L1–L5 · provision-app · import confirm · forged route 200 · go_live fields |
| Wire `qa-forge-levels.mjs` + checklist into `qa-local.mjs` | parallel to work-checklist |
| `docs/forge/RELEASE-NEXT.md` | Shipped / Next checkboxes |
| `docs/forge/BEST-IN-CLASS.md` | Scorecard vs promise |
| `docs/forge/EXIT-DEMO.md` | Steps for recording Forge walkthrough |
| Refresh `04-forge.png` | `capture-one-demo.mjs` or marketing script |
| Bump `version.json` minor | v0.4.0 when F0–F5 green; v0.4.1 when F6–F9 |

**Done when:** `npm run qa:local -- --port N` 0 failures including forge suites.

---

## Execution protocol (Forge Agent chat)

Every wave:

```
1. Read this wave section + files touched
2. Minimal diff — match Work/Capital conventions
3. npm run typecheck
4. npm run qa:local -- --port 3081  (or free port)
5. Extend forge-checklist / qa-smoke if API changed
6. Update docs/forge/RELEASE-NEXT.md checkboxes
7. Commit — exclude scripts/dev-qa/*.json unless wave seeds fixtures
```

**Do not:** force-push main · commit `.next/` · block on hardware · implement Cafe canvas.

**Parallel-safe with Cafe stream:** Forge owns `lib/forge-*`, `components/apps/forge/`, `api/claw/*`, `api/forge/*`. Cafe owns `lib/claw-cafe-*` — only touch `forge-cafe-events.ts` in F8.

---

## Wave sequence (recommended)

```text
F0 → F1 → F2 → F3 → F4 → F5 → F9 (docs/QA partial)
         ↘ F6 can parallel F4
F7 after F2 · F8 after F5 · F9 final gate
```

**Minimum viable best-in-class (GTM):** F0 + F1 + F2 + F3 + F5 + F9  
**Full arc:** through F8 before Cafe C1 build chat.

---

## Key files reference

| Domain | Path |
|--------|------|
| Workspace | `components/apps/ClawForgeWorkspace.tsx` |
| Wizard | `components/claw/NewClawWizard.tsx` |
| Gates | `lib/forge-level-gates.ts` · `lib/forge-level-copy.ts` |
| Provisioning | `lib/forge-provisioning.ts` · `lib/forge-provision-service.ts` |
| Import | `lib/forge-import.ts` · `lib/forge-import-service.ts` |
| Templates | `lib/forge-templates.ts` |
| Forged store | `lib/forged-apps-store.ts` · `lib/forged-apps-types.ts` |
| Agent defs | `lib/forged-agent-catalog.ts` |
| Forged UI | `components/apps/forge/ForgedClaw*.tsx` · `app/(desktop)/my-claw/[slug]/page.tsx` |
| APIs | `app/api/claw/create|provision-app|import|forged-apps/route.ts` |
| QA | `scripts/qa-forge-levels.mjs` · `scripts/qa-smoke.mjs` |

---

## Cafe handoff checklist (for after Forge arc)

When Forge F8 lands, Cafe C2 can wire without rework:

- [ ] `forge.claw_minted` events in shared ledger schema  
- [ ] `GET /api/claw/forged-apps` returns stable `id`, `name`, `slug`, `provisioningMode`, `templateId`  
- [ ] Nav slugs in `user-settings.forgedAppSlugs`  
- [ ] Framework mint → character spawn metadata: `{ sprite: templateId, enter: "door" }`  

See [CLAW-CAFE-PRD.md](../curxor-os/CLAW-CAFE-PRD.md) event schema.

---

## Agent kickoff template (copy/paste)

```markdown
Sprint: Forge F1 — Templates & Import tabs (L4 UI)

Goal: Render Templates + Import workspace tabs; template quick-mint; Import tab provisions without overlay wizard.

Done when:
- L4 operator sees 5 tabs (mint, fleet, stacks, templates, import)
- Template card opens embedded wizard with templateId prefilled
- Import tab: upload JSON + warnings confirm + POST /api/claw/import success
- npm run qa:local -- --port 3081 green
- RELEASE-NEXT.md F1 checked

@ docs/forge/BEST-IN-CLASS-BUILD-PLAN.md
@ pillar-4-dashboard/components/apps/ClawForgeWorkspace.tsx
@ pillar-4-dashboard/lib/forge-level-gates.ts
@ pillar-4-dashboard/lib/forge-templates.ts
@ pillar-4-dashboard/lib/forge-import.ts

Out of scope: Cafe canvas, forged desk F4 panels, Go Live F5
```

---

## Success criteria (Forge = best in class)

| Criterion | Measure |
|-----------|---------|
| Honest provisioning | Buyer never gets framework UX from island API |
| Three paths work E2E | Wizard → API → Fleet → Open desk (framework/import) |
| Growth personas | L1 Sketcher → L5 Foundry changes tabs and copy |
| Forged desk | Template-specific panel + agent chat + FRE |
| GTM | Go Live demoReady + demo tour + 04-forge capture |
| QA | forge-checklist + qa-forge-levels in qa:local |
| Master AI path | Mint events + mesh opt-in on forged desks |

When all rows green, return to **Vision & Strategy** chat to scope Cafe C1, then open Cafe Agent chat.
