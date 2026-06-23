# The Forge — Dedicated Workspace & Provisioning Build Plan

> **Audience:** Product + agent build chats  
> **Route:** `/claw-forge` · app id `claw-forge`  
> **Status:** **W1 + P1 + P2 + P3 shipped** (June 2026) — framework mint, import path, `/my-claw/[slug]`  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md) (Forge column to be added)  
> **Execution scope:** [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) (F0–F9 waves)  
> **Tracking:** [RELEASE-NEXT.md](./RELEASE-NEXT.md)  

The Forge is CurXor’s **create-to-earn engine** — where operators mint digital employees. Today it only provisions **engine profiles** (model stack + motor intent). The dedicated workspace + three provisioning paths turn Forge into a real **agent factory** that can:

1. Spin up full CurXor-native apps with leveling and OS frameworks  
2. Mint sovereign disconnected claws with no OS coupling  
3. Import external agents and run them on bare metal  

**Buyer promise:** “Describe it, forge it, own it — on your metal, your rules.”

---

## Critical architecture note (read before building)

CurXor currently has **two different “claw” concepts** that Forge must unify in the product UI:

| Concept | Storage | What it is today |
|---------|---------|------------------|
| **Engine profile** | `/etc/curxor/claw-profiles.json` · `ClawProfile` in `claw-recommend.ts` | Model stack + intent → `engine.env.d/active-claw.conf` for Pillar 2 motor/vision |
| **OOTB app claw** | `ootb-apps.ts` · `/etc/curxor/app-fre/{appId}.json` · `agent-workspace/{appId}/` | Capital, Creator, Work, etc. — FRE, workspace tabs, growth gates, SOUL/TOOLS/HEARTBEAT, mesh/CCP |

**Today’s Forge only creates engine profiles.** Options 1 and 3 below require bridging (or extending) the OOTB app + agent-runtime layer. Option 2 is closest to today’s behavior but must be **explicit** in UX and data model so buyers are not confused.

---

## Three provisioning paths (product decision)

When an operator taps **Forge Claw**, the wizard gets a **first step: “How should this claw connect to CurXor?”**

### Option 1 — CurXor OS framework *(OOTB-native)*

**Operator story:** “I want a real CurXor app — leveling, growth, FRE, agent console, bridges — like Capital or Creator, but for my niche.”

**What gets provisioned:**

| Layer | Included |
|-------|----------|
| App shell | New route or cloned OOTB template · nav entry · `ClawAgentApp` split |
| FRE | Seeded `app-fre/{appId}.json` from template pack |
| Growth | `growthLevel` + `*-level-gates.ts` pattern · persona copy |
| Agent runtime | `agent-workspace/{appId}/` — SOUL.md, TOOLS.md, HEARTBEAT.md from template |
| Agent catalog | Entry in `app-agent-catalog.ts` or generated manifest |
| Mesh / CCP | Subscribe to `claw_context` scopes per template (opt-in per FRE) |
| Bridges | eno2 digital_out patterns if domain needs outbound (explicit skill taps) |
| Engine (optional) | Motor profile only if physical claw / vision loop required |

**Template sources (v1):**

- **Clone OOTB** — fork `my-work`, `my-content-creator`, `my-capital` skeleton (strip demo data)  
- **Domain packs** — retail kiosk, fleet dispatch, research desk (intent → `recommendModels` already hints domain)  
- **Blank framework** — empty workspace tabs + gates scaffold; operator fills panels later  

**Leveling:** Inherits OS growth framework. Forge persona column (proposed):

| Level | Forge persona | Meaning |
|-------|---------------|---------|
| L1 | Sketcher | First mint, intent only |
| L2 | Builder | Fleet of 2+ profiles or 1 OOTB app |
| L3 | Smith | Custom stacks + clone templates |
| L4 | Fabricator | Multi-app operator, import/export |
| L5 | Foundry | Fleet ops, delegation, governance |

**Not in v1:** Dynamic codegen of new `page.tsx` routes at runtime. v1 = **registered template IDs** that expand to known file layouts (or single dynamic `/my-claw/[slug]` route — decision required in F0).

---

### Option 2 — Fresh claw, disconnected from CurXor OS *(sovereign island)*

**Operator story:** “I want my own agent on this box. No leveling, no Cafe XP, no mesh — just my stack and my prompts.”

**What gets provisioned:**

| Layer | Included | Excluded |
|-------|----------|----------|
| Engine profile | ✅ `claw-profiles.json` + model stack | — |
| Agent workspace | ✅ Minimal SOUL.md / TOOLS.md (operator-editable) | No growth gates |
| Dashboard app | ⚠️ Optional thin shell at `/my-claw/{id}` or engine-only | No FRE wizard, no tab matrix |
| Nav | Hidden from AppNav unless pinned | Not in global FRE module list |
| Mesh / CCP | ❌ No publish/subscribe by default | No cross-claw context |
| Growth / Cafe | ❌ No XP events, no level badges | — |
| Bridges | ❌ Unless operator later wires skills manually | — |

**This is essentially today’s forge**, made honest in copy and schema:

```ts
// Proposed field on ClawProfile (or sibling record)
provisioningMode: "island";
osIntegration: "none";
```

**Use cases:** Custom motor claw, private experiment, air-gapped agent, “I don’t trust your frameworks yet.”

**Buyer trust:** Label clearly in fleet registry — **Island · not on OS mesh**. Prevents $3,999 buyers thinking they got a full Capital-grade desk when they minted a model profile.

---

### Option 3 — Bring your claw to CurXor *(import / adopt)*

**Operator story:** “I already have an agent (OpenClaw, custom SOUL, API bot, another CurXor box). Run it here.”

**Import surfaces (phased):**

| Source | v1 | v2 |
|--------|----|----|
| **CurXor agent bundle** | Zip or JSON: SOUL.md + TOOLS.md + HEARTBEAT.md + optional FRE config | Box-to-box export |
| **OpenClaw-compatible** | Map known manifest fields → `workspace-store.ts` | Skill adapter registry |
| **Model endpoint only** | Point at local Ollama model + system prompt (no workspace files) | vLLM / custom OpenAI-compatible |
| **Full OOTB app-fre dump** | Restore `app-fre/*.json` + workspace from backup | Migration wizard |

**Validation pipeline:**

1. Parse import → schema check (`workspace-types.ts`)  
2. Scan for secrets / outbound URLs → operator confirm  
3. Choose integration level post-import: **Island (2)** or **Adopt framework (1)**  
4. Write to `agent-workspace/{appId}/` + register profile  
5. Optional: run Go Live checklist (inference up, bridge dry-run)  

**Honest v1 scope:** File-based import of SOUL/TOOLS/HEARTBEAT + model selection. **Not** full OpenClaw parity or arbitrary Docker agents on day one.

---

## Provisioning wizard — target flow

```
Step 0: Connection mode     →  [1] CurXor framework  |  [2] Island  |  [3] Bring yours
Step 1: Intent (+ multimodal) →  (existing)
Step 2: Mode-specific         →  Template pick | Import upload | Stack-only confirm
Step 3: Choose LLMs           →  (existing)
Step 4: Provision             →  (existing matrix UI; extended actions per mode)
```

**API evolution:**

| Endpoint | Today | Target |
|----------|-------|--------|
| `POST /api/claw/create` | Engine profile only | `provisioningMode` + mode-specific payload |
| — | — | `POST /api/claw/import` (Option 3) |
| — | — | `POST /api/claw/provision-app` (Option 1 — seeds FRE + workspace) |
| `GET /api/claw/profiles` | Flat list | Include `mode`, `ootbAppId?`, `meshConnected` |

---

## Dedicated workspace (UI scaffold)

Structural parity with Work / Creator / Capital. **Does not depend on all three provisioning paths** — can ship earlier as Wave W1.

| Tab | Min level | Content |
|-----|-----------|---------|
| **Mint** | L1 | Intent brief, multimodal, **connection mode picker**, embedded `NewClawWizard` (`variant="embedded"` exists, unused) |
| **Fleet** | L2 | Registry with mode badges (Framework / Island / Imported) · active profile |
| **Stacks** | L3 | UMA tiers, `LOCAL_LLM_CATALOG`, recommend preview |
| **Templates** | L4 | OOTB clone packs (Option 1 shortcuts) |
| **Import** | L4 | Bring-your-claw upload UI (Option 3) |
| **Ops** | L5 | Fleet health, batch actions (scaffold) |

**Default tab:** L1 → **Mint** · L2+ → **Fleet**

**New files (W1):**

- `lib/forge-level-gates.ts` · `lib/forge-level-copy.ts`  
- `components/apps/forge/ForgeWorkspaceTabs.tsx`  
- `components/apps/forge/ForgeIntentPanel.tsx` · `ForgeFleetPanel.tsx` · `ForgeStacksPanel.tsx`  
- `components/apps/forge/ForgeLevelBadge.tsx`  
- Refactor `ClawForgeWorkspace.tsx` → tab router  

---

## Build waves (sequencing)

| Wave | Scope | Depends on | Rough effort |
|------|-------|------------|--------------|
| **F0 — Spec lock** | This doc + connection-mode UX copy + schema RFC · dynamic route decision | — | 1 session |
| **W1 — Workspace scaffold** | Tabs, gates, panel extract, embedded Mint tab | F0 | ~1 sprint · **shipped** |
| **P1 — Island explicit** | `provisioningMode` on profile · fleet badges · honest copy | W1 | ~3–5 days · **shipped** |
| **P2 — Framework mint** | Template registry · seed FRE + agent-workspace · nav registration | W1, workspace-store | 2–3 sprints · **shipped** |
| **P3 — Import path** | Upload UI · `/api/claw/import` · validation | P1 | 1–2 sprints · **shipped** |
| **P4 — Ops + Cafe hooks** | Forge events → growth XP · fleet ops tab | Claw Cafe C2 | defer |

**CTO sequencing:**

- **W1 + P1** are safe pre-hardware — improve demo honesty without new backend risk.  
- **P2** is the big build — touches FRE, nav, middleware, agent catalog, possibly routing. Do not start until Tier A GTM polish is green.  
- **P3** can parallel P2 only if import schema is frozen in F0.  
- Update [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md) Forge column when W1 lands.

---

## What already works — do not break

- `/api/claw/assist` · `ForgeAssistProvider` · agent console sync  
- `?new=1` one-shot wizard open  
- FRE: `defaultBudget`, `autoRecommend`, `multimodalDefault`  
- Demo: `04-forge.png` · `qa-smoke.mjs` claw assist + `claw-forge` FRE  
- `ALWAYS_ENABLED_APP_IDS` — Forge always reachable  

---

## Risks & guardrails

| Risk | Mitigation |
|------|------------|
| Buyers confuse engine profile vs full app | Mode picker + fleet badges day one (P1) |
| Nav explosion (10+ custom apps) | Dynamic `/my-claw/[slug]` or “My Claws” sub-nav |
| Import runs untrusted prompts/tools | Schema validation + operator confirm + no auto-bridge |
| Scope blocks Capital/Creator GTM | Tier A rule: no P2 until exit-demo green |
| Fake “full OS app” from thin template | Go Live checklist per provisioned app |

---

## Kickoff copy (agent build chat)

> **Forge Wave W1** — Dedicated workspace scaffold only.  
> Tabs: Mint (embedded wizard), Fleet, Stacks. Extract panels to `components/apps/forge/`. Add `forge-level-gates.ts` + `ForgeLevelBadge`. Do **not** implement three provisioning paths yet — stub connection mode UI as disabled “coming soon” chips if needed.  
> QA: extend smoke for tab visibility. Preserve `?new=1` and overlay wizard.

> **Forge Wave P1** — Island mode explicit.  
> Extend `ClawProfile` with `provisioningMode: "island" | "framework" | "imported"`. Default existing profiles to `island`. Fleet panel badges + copy. Wizard step 0 UI (Island fully wired; others disabled).

> **Forge Wave P2** — Framework mint (Option 1).  
> Template registry, `POST /api/claw/provision-app`, seed app-fre + agent-workspace from pack. Requires F0 route decision.

> **Forge Wave P3** — Bring your claw (Option 3).  
> Import upload, `/api/claw/import`, map to workspace-store.

---

## References

- Engine profiles: `pillar-4-dashboard/lib/claw-profiles.ts`, `lib/claw-recommend.ts`, `app/api/claw/create/route.ts`  
- Agent workspace: `lib/agent-runtime/workspace-store.ts` (SOUL / TOOLS / HEARTBEAT)  
- OOTB apps: `lib/ootb-apps.ts`, `lib/app-agent-catalog.ts`  
- UI today: `components/apps/ClawForgeWorkspace.tsx`, `components/claw/NewClawWizard.tsx`  
- Day-one tier: [DAY-ONE-BUILD-PLAN.md](../curxor-os/DAY-ONE-BUILD-PLAN.md) — Forge = maintain until this arc starts  
