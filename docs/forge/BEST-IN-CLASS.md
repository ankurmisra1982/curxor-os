# The Forge — Best-in-Class Landscape & Scorecard

Research snapshot for the **Agent Factory** arc (June 2026).  
CurXor wedge: **sovereign create-to-earn** — mint Claws on bare metal with honest connection modes; SOUL/TOOLS on appliance; egress only via eno2 when bridges are wired.

> **Route:** `/claw-forge` · app id `claw-forge`  
> **Build plan:** [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) · **Tracking:** [RELEASE-NEXT.md](./RELEASE-NEXT.md)  
> **Master AI arc:** [CLAW-CAFE-PRD.md](../curxor-os/CLAW-CAFE-PRD.md)

---

## Competitive landscape

### Agent factory / mint-your-own

| Product | Model | Strengths | Gaps vs CurXor | Takeaway |
|---------|--------|-----------|----------------|----------|
| OpenClaw / custom SOUL repos | File-based agent bundles | Portable SOUL/TOOLS; community skills | No appliance OS; cloud egress default | **Import path (Option 3)** — validate bundle, operator confirm |
| [AgentOffice](https://github.com/harishkotra/agent-office) | Phaser office + Ollama hire loop | Autonomous team growth; local LLM | Dev toy; not retail GTM factory | **Fleet registry UX** — not autonomous hire at MVP |
| Notion / Zapier “AI agents” | Cloud agent builders | Templates, integrations | Rent + data exit | **Template packs** on metal, not cloud factory |
| Cursor / Claude “create subagent” | IDE session agents | Fast iteration | No persistent appliance employee | **Framework mint** = durable desk + FRE |

### Provisioning honesty (trust at $3,999)

| Pattern | Risk | CurXor response |
|---------|------|-----------------|
| “Create agent” = API key + prompt only | Buyer thinks they got Capital-grade desk | **Connection mode picker** — Island vs Framework vs Import |
| Engine profile labeled “Claw app” | Support debt | **Fleet badges** + copy: Island · not on OS mesh |
| Import runs untrusted tools | Security | **Warning scan** + operator confirm + no auto-bridge |

---

## CurXor position

| Dimension | Cloud agent builders | CurXor Forge |
|-----------|---------------------|--------------|
| Storage | Vendor cloud | `claw-profiles.json` + `forged-apps.json` + `agent-workspace/` |
| Mint path | Web UI → their runtime | Wizard → local LLM stack + optional engine + FRE |
| Full OS app | N/A or marketplace | **Framework** template → `/my-claw/[slug]` |
| Island / experiment | Hidden | **Explicit** engine-only profile |
| Import | Proprietary | **Bundle v1** — SOUL/TOOLS/HEARTBEAT JSON |
| Demo | Trial | **demoReady** + demo tour (F5 — planned) |
| Progression | Credits / seats | **L1–L5 Forge personas** (Sketcher → Foundry) |
| Cafe / Master AI | None | Mint events → spatial home (F8 — planned) |

**Do not rebuild:** OpenClaw parity, Docker agent host, runtime `page.tsx` codegen. **Do** template registry + dynamic forged route + honest modes.

---

## Ship state (foundation — in repo)

| Area | Status | Version note |
|------|--------|--------------|
| Workspace Mint / Fleet / Stacks | Shipped | W1 |
| `provisioningMode` + fleet badges | Shipped | P1 |
| `POST /api/claw/provision-app` + forged-apps store | Shipped | P2 |
| `POST /api/claw/import` + warning confirm | Shipped | P3 |
| Wizard → three APIs | Shipped | P2/P3 |
| `/my-claw/[slug]` + nav + agent shell | Shipped | P2 |
| Template packs (5) + intent inference | Shipped | P2 |
| Forged desk UI | **Template panels** | F4 |
| Templates / Import tabs (L4) | **Shipped** | F1 |
| Unified Fleet + `/api/forge/status` | **Shipped** | F2 |
| Go Live + demo tour | **Shipped** | F5 |
| Forge L1–L5 FRE + Ops tab | **Shipped** | F3/F7 |
| Export + import download | **Shipped** | F6 |
| Cafe mint events | **Shipped** | F8 dev ledger |

**Target best-in-class release:** v0.4.0 (F0–F5 + F9) · v0.4.1 (F6–F8)

---

## Competitive scorecard (fill as waves land)

> **Scale:** 1 = missing · 3 = credible · 5 = best-in-class **for sovereign agent factory**  
> Update scores after each wave; cite wave id in Notes column.

| Dimension | Score | Target | Notes |
|-----------|-------|--------|-------|
| **Sovereign / on-appliance mint** | **4.5** | 5.0 | F11 lifecycle + batch export |
| **Honest three connection modes** | **4.5** | 5.0 | Island E2E QA; promote path F11 |
| **Framework mint → usable desk** | **4.5** | 4.5 | F10–F13 work/creator/capital v2 |
| **Island mode clarity** | **4.5** | 5.0 | Fleet badges; island mint QA |
| **Import / bring-your-claw** | **4.5** | 4.5 | Export round-trip user flow F14 |
| **Template catalog & shortcuts** | **4.0** | 4.5 | F1 Templates tab |
| **Forge growth personas L1–L5** | **4.5** | 4.5 | L4 work/creator/capital tours |
| **Fleet registry & ops** | **4.5** | 4.5 | F11 archive, promote, fleet export |
| **Multimodal intent (photo / vision)** | **4.0** | 4.5 | Assist + wizard |
| **Go Live / exit demo** | **4.0** | 4.0 | F5 panel + demo tour |
| **QA & GTM assets** | **4.5** | 4.5 | ~22 checklist + smoke/flows F14 |
| **Cafe / Master AI handoff** | **4.5** | 4.0 | F12 per-mint + CCP publish |
| **Overall Forge (weighted)** | **~4.5** | **4.5+** | F10–F14 arc |

**Last scored:** June 2026 (post F10–F14 arc)

---

## Wave → score lift (expected)

| Wave | Dimensions that should move |
|------|---------------------------|
| **F0** | Honest three modes (+0.5) |
| **F1** | Template catalog (+1.0), Import UX (+0.5) |
| **F2** | Fleet registry (+0.5), Island clarity (+0.3) |
| **F3** | Forge personas (+1.5) |
| **F4** | Framework desk (+1.5) |
| **F5** | Go Live (+1.0), Overall GTM readiness |
| **F6** | Import/export (+0.5) |
| **F7** | Fleet ops (+0.3) |
| **F8** | Cafe handoff (+1.0) |
| **F9** | QA & GTM (+0.5) |

---

## Persona coverage (target)

| Forge level | Label | Best-in-class bar |
|-------------|-------|-------------------|
| L1 | Sketcher | First mint in &lt;5 min; demo tour optional |
| L2 | Builder | Fleet shows all claws; Open desk obvious |
| L3 | Smith | Stack recommend + manual override trusted |
| L4 | Fabricator | Template + import without wizard friction |
| L5 | Foundry | Ops tab + fleet health at a glance |

Score **Strong (4+)** when each level’s bar row is true in QA + demo capture.

---

## GTM proof checklist (scorecard gate)

Mark when true — required for **Overall ≥ 4.5**:

- [x] `forge-checklist` + `qa-forge-levels` in qa:local (capital + island + assist flows F14)
- [x] Framework mint E2E: wizard → `/my-claw/[slug]` → agent chat → skill tap (assist user flow F14)
- [x] Island mint E2E: wizard → fleet badge Island → no false nav app
- [x] Import E2E: bundle upload → warnings confirm → desk or island workspace (checklist + round-trip flow)
- [x] Go Live `demoReady` + **Run demo tour** on Forge Mint tab
- [ ] Screenshot `04-forge.png` + optional walkthrough webm (run `demo:capture:forge` before release tag push)
- [x] `forge.claw_minted` / framework events in dev-qa log after mint (F8/F12)
- [x] Storefront / FEATURE-FUNCTION Forge paragraph matches honest modes

---

## References

- Architecture + waves: [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md)
- Original provisioning spec: [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)
- Cafe north star: [CLAW-CAFE-PRD.md](../curxor-os/CLAW-CAFE-PRD.md)
- Code: `pillar-4-dashboard/components/apps/ClawForgeWorkspace.tsx` · `lib/forge-provision-service.ts`
