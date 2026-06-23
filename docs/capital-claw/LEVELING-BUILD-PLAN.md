# Capital Claw — Growth Leveling Build Plan

> **Audience:** L1–L4 core (Learner → Allocator) · L5 scaffolded  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Code seed:** `pillar-4-dashboard/lib/os-growth-level.ts` (`CapitalGrowthIntent`)  
> **Status:** Dev-only · GTM/demo waves run in parallel — do not block on Alpaca keys

## North star

Capital Claw is a **sovereign wealth desk** that grows with financial responsibility — not a Bloomberg terminal on day one:

1. **Learn** — understand a ticker, watchlist, and paper/demo fills without broker jargon  
2. **Build** — first rules, pilots, thesis journal, Alpha feed  
3. **Operate** — auto-approval, PFM, agents with guardrails  
4. **Allocate** — multi-broker, analytics, MCP, tax-aware ops  
5. **Principal** — live-money governance, delegation, portfolio policy (future)

Not “Robinhood for memecoins.” Not fake social trading.

---

## Current state vs target

| Today | Target |
|-------|--------|
| 3 tiers: `beginner` / `standard` / `expert` | 5 growth levels: `L1`–`L5` with Capital labels |
| Alpha tab at Standard+ only | **Different home surfaces** per level |
| Same panels, different `minLevel` | Growth-aware `capitalSectionVisible(growth, …)` |
| FRE: risk + watchlist only | FRE: persona intent → `growthLevel` + seed pack |
| Coach says “Growth level: Learner” placeholder | Badge + copy from `capital-level-copy.ts` |
| Sovereign Alpha P0 shipped | Alpha becomes **L3 home**; L1–L2 get Learn/Build surfaces |

**Migration:** Keep `ExperienceLevel` for unmigrated shared components. Capital desk reads `growthLevel` from FRE/settings via `os-growth-level.ts` until full migration.

**Mapping bridge (default):**

| Growth | Legacy gate | Capital label |
|--------|-------------|---------------|
| L1 | beginner | Learner |
| L2 | beginner | Builder |
| L3 | standard | Operator |
| L4 | standard | Allocator |
| L5 | expert | Principal |

---

## Persona matrix (implementation source of truth)

### L1 — Learner
**Who:** Student, first job, “I want to learn investing,” never placed a trade.

| Job to be done | Capital feature |
|----------------|-----------------|
| Understand a stock | Ticker research (basic): price, smart take, 3 headlines |
| Try without risk | Demo tour, simulated fills, Go Live checklist |
| Build habits | Watchlist chips, Setup Wizard |
| Not feel stupid | No “bridge,” “MCP,” “auto-approval,” “allocator” language |

**Hide:** Alpha tab, analytics, agents/MCP, auto-approval, intel alerts, PFM, brokers vault, pending banner, tax lots, walk-forward.

**Default tab:** `trade` — Go Live + recent trades + basic research.

**FRE seed:** watchlist `SPY`, `AAPL` · risk `conservative` · mode `dry_run` or demo.

---

### L2 — Builder
**Who:** Side income saver, first 401k rollover, “I want simple rules,” hobbyist trader.

| Job to be done | Capital feature |
|----------------|-----------------|
| First IF/THEN rule | Visual rule builder, dip rules, arm/execute |
| Follow smarter money | Pilot marketplace subscribe (demo) |
| Remember why I bought | Thesis journal |
| See what moved | Movers strip, watchlist pulse |
| Social-style discovery (sovereign) | **Alpha feed** (simplified — no pilot leaderboard depth) |

**Show:** Rule engine, pilots, thesis journal, Alpha feed, movers.

**Hide:** Agent/MCP panel, auto-approval stack, PFM Plaid, brokers (except Alpaca paper CTA in Go Live), analytics tab, tax lots.

**Default tab:** `trade` with Alpha strip pinned above Go Live OR `alpha` as secondary tab.

**FRE seed:** watchlist growth names + `BTC-USD` optional · risk `balanced` · mode `paper` (demo OK).

---

### L3 — Operator
**Who:** Active paper trader, FIRE-curious, runs rules daily, nonprofit treasurer with small portfolio.

| Job to be done | Capital feature |
|----------------|-----------------|
| Run the desk daily | **Alpha tab default home** — full feed |
| Safe automation | Auto-approval stack, pending banner, risk permissions |
| Research depth | Standard research: chart, chatter, intel alerts |
| Personal finance context | PFM demo / Plaid when keys |
| Copy with disclosure | Pilot subscriptions + sync |

**Show:** Current Standard+ surface minus Expert-only chart depth.

**Hide:** Lightweight Charts expert depth, full MCP tool surface, live-money confirm.

**Default tab:** `alpha`.

---

### L4 — Allocator
**Who:** Solo wealth builder, multi-account, uses agents carefully, tax-aware.

| Job to be done | Capital feature |
|----------------|-----------------|
| Deep research | Expert chart, full chatter, consensus meter (Wave 1) |
| Multi-broker | Brokers panel, TV webhook, Webull/E*TRADE links |
| Agent-assisted trades | Agent & MCP panel, audit log, kill switch |
| Measure rules | Analytics, scorecard, walk-forward, NL portfolio Q&A |
| Tax awareness | Tax lots beta |

**Show:** Expert gates + integrations tab emphasis.

**Default tab:** `alpha` or `research` based on FRE focus (`research_heavy` vs `automation_heavy`).

---

### L5 — Principal (scaffold)
**Who:** Founder, family office curious, live-money operator — future full build.

| Job to be done | Capital feature |
|----------------|-----------------|
| Govern live capital | Live money gate, autonomous modes, crisis pause |
| Delegate | Agent auto-approval tiers, MCP without preview (opt-in) |
| Policy | Portfolio health + rebalance at scale, multi-pilot |

**Ship in leveling sprint:** labels, FRE option, gated panels — not full family-office suite.

---

## Feature visibility matrix

| Feature / panel | L1 | L2 | L3 | L4 | L5 |
|-----------------|----|----|----|----|-----|
| Setup Wizard | ✅ | ✅ | ○ | ○ | ○ |
| Go Live | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recent trades strip | ✅ | ✅ | ○ | ○ | ○ |
| Basic research | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rule engine | ○ tips | ✅ | ✅ | ✅ | ✅ |
| Pilot marketplace | hide | ✅ | ✅ | ✅ | ✅ |
| Thesis journal | hide | ✅ | ✅ | ✅ | ✅ |
| Alpha feed | hide | ✅ lite | ✅ | ✅ | ✅ |
| Pilot leaderboard | hide | hide | ✅ | ✅ | ✅ |
| Movers & positions | hide | ✅ | ✅ | ✅ | ✅ |
| Intel alerts | hide | hide | ✅ | ✅ | ✅ |
| Market digest | hide | ○ | ✅ | ✅ | ✅ |
| Auto-approval | hide | hide | ✅ | ✅ | ✅ |
| PFM | hide | hide | ✅ | ✅ | ✅ |
| Portfolio health | hide | hide | ✅ | ✅ | ✅ |
| Pending banner | hide | hide | ✅ | ✅ | ✅ |
| Trade log (full) | hide | ○ | ✅ | ✅ | ✅ |
| Analytics tab | hide | hide | ○ | ✅ | ✅ |
| Agent & MCP | hide | hide | hide | ✅ | ✅ |
| Brokers vault | hide | peek | peek | ✅ | ✅ |
| Expert chart / consensus | hide | hide | hide | ✅ | ✅ |
| Tax lots | hide | hide | hide | ✅ | ✅ |
| Live money confirm | hide | hide | hide | ○ | ✅ |
| Autonomous `auto_armed_rules` | hide | hide | hide | ○ | ✅ |

○ = collapsed / “Advanced” link · peek = one CTA, not full panel

---

## Workspace tabs by level

| Tab | L1 | L2 | L3 | L4 | L5 |
|-----|----|----|----|----|-----|
| **Learn** (new, optional rename of trade) | ✅ default | ○ | hide | hide | hide |
| **Alpha** | hide | ○ | ✅ default | ✅ default | ✅ default |
| **Trade** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Research** | ○ | ✅ | ✅ | ✅ default? | ✅ |
| **Risk** | peek | ✅ | ✅ | ✅ | ✅ |
| **Agents** | hide | hide | peek | ✅ | ✅ |
| **Analytics** | hide | hide | ○ | ✅ | ✅ |

Implement in `CapitalWorkspaceTabs.tsx` — `defaultCapitalTab(growthLevel)` replaces experience-only default.

---

## Copy & language map

| Legacy / jargon | L1 label | L2+ label |
|-----------------|----------|-----------|
| Execute trade | Try a practice buy | Execute |
| Digital bridge | (hidden) | Paper bridge |
| Pilot marketplace | Ideas to follow | Pilot marketplace |
| Auto-approval | (hidden) | Auto-approve rules |
| Agent & MCP | (hidden) | Agent trading |
| Go Live | Get started | Go Live |
| Armed rule | Turn on rule | Arm rule |
| Pending approval | (hidden) | Needs your OK |
| Allocator / Principal | (hidden) | Level badge only |

Implement via `lib/capital-level-copy.ts` — `capitalTerm(growthLevel, key)`.

---

## Rule & pilot seed packs (FRE)

| Pack ID | Level | Contents |
|---------|-------|----------|
| `learner_watchlist` | L1 | `SPY`, `AAPL` · one paused manual rule template |
| `builder_dip_spy` | L2 | `SPY`, `QQQ`, `NVDA` · dip rule 5% template |
| `operator_multi` | L3 | FRE watchlist + congress pilot hint · auto-approval defaults paper-first |
| `allocator_growth` | L4 | Sector tilt watchlist · rebalance hint rules |
| `principal_policy` | L5 | Risk limits tight · autonomous off until confirm |

Storage: `lib/capital-fre-seed-packs.ts` · applied on FRE complete from `growthIntent`.

---

## Implementation sprints

### Sprint CL1 — Schema & FRE (foundation)
**Goal:** User picks wealth persona; desk knows `growthLevel`.

| Task | Files |
|------|-------|
| `CapitalGrowthIntent` + labels in `os-growth-level.ts` | ✅ seed in framework pass |
| FRE question: wealth persona (5 options) | global FRE + `app-fre/my-capital` UI |
| Persist `growthLevel` on Capital FRE complete | `app-fre-state.ts`, `user-settings` |
| Settings override per app | `/settings` claws section |
| `CapitalLevelBadge` or extend `ExperienceLevelBadge` | `components/apps/capital/` |
| Map growth → legacy for unmigrated gates | `capitalGrowthGate.ts` helper |

**Acceptance:** FRE sets L1–L5; header shows “Builder” not “Standard”; existing 3-tier still works.

---

### Sprint CL2 — L1 Learner surface
**Goal:** Zero brokerage vocabulary; demo tour is the hero path.

| Task | Files |
|------|-------|
| `capital-level-copy.ts` | new |
| `capitalSectionVisible(growth, sectionId, tab)` | `CapitalWorkspaceTabs.tsx` |
| Hide Alpha, agents, analytics for L1 | `MyCapitalApp.tsx` |
| Go Live + Wizard copy L1 variant | `CapitalGoLivePanel.tsx`, `capital-go-live.ts` |
| Coach tips L1 rewrite | `experience-coach-catalog.ts` |
| `defaultCapitalTab(L1) → trade` | `CapitalWorkspaceTabs.tsx` |

**Acceptance:** L1 FRE → demo tour → simulated fill → never sees “MCP” or “Alpha.”

---

### Sprint CL3 — L2 Builder surface
**Goal:** First rules + thesis + Alpha lite.

| Task | Files |
|------|-------|
| Show thesis journal + Alpha feed (no leaderboard) | gating matrix |
| Pilot subscribe path prominent | `CapitalPilotMarketplacePanel` L2 copy |
| Rule builder as default CTA on research | `CapitalTickerIntelPanel` |
| Unlock nudge L1→L2: “First fill? Unlock Builder for Alpha feed” | `CapitalAnalyticsPanel` nudge variant |
| FRE seed pack `builder_dip_spy` | `capital-fre-seed-packs.ts` |

**Acceptance:** L2 path: research NVDA → thesis → dip rule → arm → fill → appears in Alpha feed.

---

### Sprint CL4 — L3 Operator surface
**Goal:** Match today’s Standard+ (post–Alpha P0).

| Task | Files |
|------|-------|
| Alpha default tab | `defaultCapitalTab(L3)` |
| Full Alpha: feed + leaderboard | existing panels, growth gates |
| Unhide auto-approval, PFM, intel alerts, pending banner | gating |
| Agent panel “peek” — link only, not full MCP | `MyCapitalApp.tsx` |
| Growth-aware coach tips | `experience-coach-catalog.ts` |

**Acceptance:** L3 = current Standard+ behavior with Operator badge.

---

### Sprint CL5 — L4/L5 scaffold + upgrade path
**Goal:** Expert depth + live-money path without building family office.

| Task | Files |
|------|-------|
| L4: Expert chart, agents, brokers, analytics | existing expert gates → growth |
| L5: live money + autonomous labels in FRE | `CapitalPermissionsPanel` copy |
| `CapitalLevelUpNudge.tsx` — heuristics | new |
| Executive brief stub (L5) | `CapitalPrincipalBriefPanel.tsx` stub |
| Filter agent skills by growth | `app-agent-catalog.ts` |

**Heuristics (no XP yet):**
- L1→L2: demo tour complete + 1 simulated fill  
- L2→L3: ≥1 armed rule + thesis entry + pilot subscribe  
- L3→L4: auto-approval configured + 5 fills + intel alert set  
- L4→L5: broker linked OR walk-forward run (paper)

---

### Sprint CL6 — QA & dev fixtures
**Goal:** Per-level paths in `qa:local`.

| Task | Files |
|------|-------|
| `npm run qa:capital-levels` or extend checklist | `scripts/capital-checklist.mjs` |
| dev-qa FRE fixtures per level | `scripts/dev-qa/app-fre/my-capital-L*.json` |
| Docs sync | `RELEASE-NEXT.md`, retire `LEVELING-PLACEHOLDER.md` |

**Flows:**
- L1: wizard → demo tour → recent trades only  
- L2: thesis → rule → alpha feed item  
- L3: auto-approval toggle → pending approve  
- L4: MCP preview_trade smoke  

---

## Agent skills by level

| Skill | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| run_demo_tour | ✅ | ✅ | ○ | ○ | ○ |
| research_ticker | ✅ | ✅ | ✅ | ✅ | ✅ |
| create_rule / arm_rule | hide | ✅ | ✅ | ✅ | ✅ |
| create_rule_from_thesis | hide | ✅ | ✅ | ✅ | ✅ |
| subscribe_pilot | hide | ✅ | ✅ | ✅ | ✅ |
| execute_now / execute_trade | ○ | ✅ | ✅ | ✅ | ✅ |
| preview_trade | hide | hide | ○ | ✅ | ✅ |
| agent_execute_trade | hide | hide | hide | ✅ | ✅ |
| portfolio_query | hide | hide | ✅ | ✅ | ✅ |
| walk_forward_backtest | hide | hide | hide | ✅ | ✅ |
| pfm_refresh | hide | hide | ✅ | ✅ | ✅ |

Filter in `app-agent-catalog.ts` + skill button render by `growthLevel`.

---

## Relationship to other Capital tracks

| Parallel track | Relationship to leveling |
|----------------|-------------------------|
| **Wave 1 GTM Demo Lock** (separate agent) | Uses L3 Operator as demo persona; don’t block CL sprints |
| **Sovereign Alpha P0** | Alpha = L2 lite + L3+ full — gating only |
| **Exit demo / Alpaca paper** | L4+ credibility; not required for CL1–CL4 |
| **Work Claw leveling** | Pattern donor — `work-level-copy.ts`, FRE intents |

**Dev priority order:**

```
CL1 (FRE) → CL2 (L1) → CL3 (L2) → CL4 (L3) → CL5 (L4/L5 scaffold) → CL6 (QA)
```

Run **one sprint per build chat**. Do not mix with GTM capture or pillar-3 bridge work.

---

## Gamification seed (do not build now)

Record for Claw Cafe:

- XP events: `capital.demo_tour`, `capital.first_thesis`, `capital.first_armed_rule`, `capital.pilot_subscribed`, `capital.paper_fill`, `capital.go_live_paper_ready`
- Cross-Claw: Work invoice paid → Capital “save & invest” PFM suggestion
- Levels never down-rank — suggest persona change in settings only

---

## Success metrics (dev)

| Metric | L1 | L2 | L3 |
|--------|----|----|-----|
| Time to first simulated fill | < 2 min | < 5 min | < 5 min |
| % L1 seeing “MCP” or “bridge” | 0% | — | — |
| FRE → growthLevel persisted | 100% | 100% | 100% |
| Alpha feed items after L2 path | — | ≥ 2 | ≥ 5 |

---

## Deferred (not in CL sprints)

- Claw Cafe XP UI  
- Forced level locks  
- Full Principal / family-office dashboard  
- SnapTrade execution worker (pillar-3)  
- Public social graph  
- Mobile push  

---

## Next action

**Start Sprint CL1** in a dedicated build chat:

> Capital CL1 — FRE growth intent, persist `growthLevel`, `CapitalLevelBadge`, `capitalGrowthGate` helper. No panel gating yet.

After CL1: CL2 (L1 Learner hide Alpha/agents) delivers the biggest “persona” win for dev testing.
