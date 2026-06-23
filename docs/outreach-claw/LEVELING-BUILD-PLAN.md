# Work Claw — Growth Leveling Build Plan

> **Audience:** L1–L3 core (Explorer, Side Hustler, Operator) · L4–L5 scaffolded for future  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Code seed:** `pillar-4-dashboard/lib/os-growth-level.ts`

## North star

Work Claw is a **daily coordination and opportunity desk** that grows with the user:

1. Stay on top of messages and opportunities  
2. Look more professional than they feel  
3. Turn repeat communication into repeatable systems  

Not “enterprise sales software on day one.”

---

## Current state vs target

| Today | Target |
|-------|--------|
| 3 tiers: `beginner` / `standard` / `expert` | 5 growth levels: `L1`–`L5` with Work labels |
| CRM / SMTP language in FRE & Go Live | Persona-first language per level |
| Same panels, different `minLevel` | **Different home surfaces** per level |
| Sequences visible at Standard | L2+; L1 uses “follow-up reminders” |
| Integrations tab at Expert | L4+ full vault; L3 peek; L1–L2 hidden |

**Migration:** Keep `ExperienceLevel` for shared components; Work desk reads `growthLevel` from FRE/settings via `os-growth-level.ts` mapping until all Claws migrate.

---

## Persona matrix (implementation source of truth)

### L1 — Explorer
**Who:** Student, gamer, hobbyist, no formal job yet.

| Job to be done | Work Claw feature |
|----------------|-------------------|
| Don’t drop replies | Inbox triage, “people waiting” strip |
| Sound polished in email/DM | `draft_reply`, templates |
| Track opportunities | Lightweight “Opportunities” list (reuse leads, rename UI) |
| Remember follow-ups | Tasks + morning brief |
| Try tiny outreach safely | Simulated send only; no auto-blast |

**Hide:** connector vault, MCP, approval queue, CRM sync, kill switch, “pipeline” jargon.

**Default tab:** `Start` — triage + tasks + templates.

---

### L2 — Side Hustler
**Who:** Etsy/eBay seller, freelancer, aspiring influencer, first paid gigs.

| Job to be done | Work Claw feature |
|----------------|-------------------|
| Buyer/collab inquiry tracking | Pipeline (renamed “Inquiries”) |
| Polite follow-ups | 2–3 step mini-sequences |
| Look legit | Enrich lead (demo), book meeting |
| Know what’s working | Analytics lite |
| Repeat without burnout | Templates: order support, collab, quote follow-up |

**Show:** Outreach tab, simple sequences, import CSV (customers list).

**Hide:** HubSpot, Twenty sync UI (keep in vault as “later”), executive copy.

**Default tab:** `Outreach`.

---

### L3 — Operator
**Who:** Nonprofit organizer, advocacy lead, community manager, creator-business admin.

| Job to be done | Work Claw feature |
|----------------|-------------------|
| Run campaigns | Multi-step sequences + branching on reply intent |
| Coordinate volunteers/donors | Pipeline stages + tasks linked to leads |
| Safe sending | Approval panel, kill switch, send policy |
| Connect tools | Notion push/pull, Slack digest, sync log |
| Report impact | Analytics + day brief v2 |

**Show:** Comms + Ops tabs, approvals, intent tagging, n8n webhook status.

**Default tab:** `Comms` or `Ops` based on FRE focus.

---

### L4 — Professional (scaffold)
**Who:** Solo consultant, agency owner, recruiter, service business.

| Job to be done | Work Claw feature |
|----------------|-------------------|
| Reliable revenue outreach | Full sequences, auto-send policy, deliverability (W12) |
| CRM truth | Twenty sync first-class, conflict UI |
| Scale ops | Multi-mailbox (future), enrichment APIs |
| Automate | n8n auto-emit, Work MCP execute with confirm |

**Show:** Integrations tab, full connector vault, liveReady path.

---

### L5 — Executive (scaffold)
**Who:** Founder, C-suite — future full build.

| Job to be done | Work Claw feature |
|----------------|-------------------|
| Signal not noise | Executive brief, stall detection |
| Govern | Audit log, team assignment (future), SLA |
| Delegate | Agent MCP, approval tiers |

**Ship in leveling sprint:** labels, FRE option, gated panels — not full exec dashboard.

---

## Feature visibility matrix

| Feature / panel | L1 | L2 | L3 | L4 | L5 |
|-----------------|----|----|----|----|-----|
| Start / Go Live / wizard | ✅ | ✅ | ✅ | ○ | ○ |
| Morning brief | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inbox triage | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Opportunities (leads UI) | ✅ rename | ✅ | ✅ | ✅ | ✅ |
| Sequences | ○ tips | ✅ | ✅ | ✅ | ✅ |
| Pipeline kanban | hide | ✅ | ✅ | ✅ | ✅ |
| CSV import | hide | ✅ | ✅ | ✅ | ✅ |
| Comms tab | peek | ✅ | ✅ | ✅ | ✅ |
| Reply intent | hide | ○ | ✅ | ✅ | ✅ |
| Analytics | hide | lite | ✅ | ✅ | ✅ |
| Approvals | hide | hide | ✅ | ✅ | ✅ |
| Ops / recovery | hide | hide | ✅ | ✅ | ✅ |
| Integrations vault | hide | hide | peek | ✅ | ✅ |
| MCP / audit | hide | hide | hide | ○ | ✅ |
| Kill switch | hide | hide | ✅ | ✅ | ✅ |

○ = collapsed / “advanced” link

---

## Copy & language map

| Legacy term | L1 label | L2+ label |
|-------------|----------|-----------|
| Lead | Opportunity / Contact | Inquiry / Lead |
| Pipeline | Opportunities | Pipeline |
| Sequence | Follow-up plan | Sequence |
| Outbound queue | Sent messages | Outbound queue |
| CRM | People you’re talking to | Pipeline |
| SMTP bridge | Email setup (optional) | Email bridge |
| Go Live | Get set up | Go Live |

Implement via `lib/work-level-copy.ts` — `workTerm(growthLevel, key)`.

---

## Template packs (FRE + one-click)

| Pack ID | Level | Templates |
|---------|-------|-----------|
| `student_opportunities` | L1 | internship, club sponsor, tournament org, thank-you |
| `hobby_collab` | L1 | creator collab, community invite |
| `etsy_support` | L2 | order delay, custom request, review ask |
| `freelance_quote` | L2 | quote follow-up, scope clarify, invoice nudge |
| `creator_brand` | L2 | sponsor pitch, media kit send |
| `nonprofit_donor` | L3 | donor thank-you, event invite, volunteer shift |
| `advocacy_campaign` | L3 | petition, legislator, coalition invite |
| `solo_client` | L4 | discovery call, proposal, check-in |

Storage: `lib/work-template-packs.ts` + seed in `work-store` on FRE select.

---

## Implementation sprints

### Sprint WL1 — Schema & FRE (foundation)
**Goal:** User picks persona; app knows `growthLevel`.

| Task | Files |
|------|-------|
| FRE field `growthIntent` (5 options) | `app-agent-catalog.ts`, app-fre UI |
| Persist `growthLevel` on FRE complete | `app-fre-state.ts`, user-settings |
| Settings override dropdown | settings claws / experience |
| Map growth → legacy for gates | `os-growth-level.ts`, `UiModeProvider` optional read |
| Work header badge: “Explorer” not “Beginner” | `ExperienceLevelBadge.tsx` or `WorkLevelBadge.tsx` |

**Acceptance:** FRE sets L1–L5; badge shows Work label; existing 3-tier still works.

- [x] WL1 complete

---

### Sprint WL2 — L1 Explorer surface
**Goal:** Useful with zero business vocabulary.

| Task | Files |
|------|-------|
| `work-level-copy.ts` | new |
| Rename leads → Opportunities in L1 UI | `WorkPipelinePanel.tsx`, `MyWorkApp.tsx` |
| **Start home:** People waiting + tasks + templates | `WorkStartHomePanel.tsx` (new) |
| Template picker on Start | wire to `work-template-packs.ts` |
| Hide sequences, vault, approvals for L1 | `workSectionVisible(level, …)` |
| Coach copy rewrite for L1 | `experience-coach-catalog.ts` |
| Go Live steps L1 variant (no SMTP required) | `work-go-live.ts` — `buildGoLiveForLevel(growth)` |

**Acceptance:** L1 user completes wizard without seeing “CRM” or “sequence”; can draft reply + add opportunity.

- [x] WL2 complete

---

### Sprint WL3 — L2 Side Hustler surface
**Goal:** Hustle desk out of the box.

| Task | Files |
|------|-------|
| Default tab Outreach; show kanban + import | `WorkWorkspaceTabs.tsx`, `defaultWorkTab` |
| Mini-sequence wizard (2–3 steps) | `WorkMiniSequenceWizard.tsx` |
| Template pack selector in FRE | FRE + `create_sequence` with pack |
| Enrich + book meeting CTAs on pipeline row | `WorkPipelinePanel.tsx` |
| Analytics lite card (sends/replies only) | `WorkAnalyticsPanel.tsx` variant |

**Acceptance:** L2 FRE → Etsy template pack seeded; one inquiry → follow-up plan → simulated send.

- [x] WL3 complete

---

### Sprint WL4 — L3 Operator surface
**Goal:** Nonprofit/advocacy/community ops.

| Task | Files |
|------|-------|
| Unhide Comms + Ops; approvals + kill switch | gating matrix |
| Campaign preset: pipeline stages for nonprofit | `work-store` seed |
| Branching on reply intent surfaced in UI | `WorkSequencePanel.tsx` |
| Sync log on Ops tab | existing panel, level copy |
| Slack digest + Notion sync prominent | `WorkConnectorVaultPanel.tsx` L3 hints |

**Acceptance:** L3 demo path: import volunteers CSV → sequence → interested reply → Slack notify.

- [x] WL4 complete

---

### Sprint WL5 — L4/L5 scaffold + upgrade path
**Goal:** Future-proof without building exec suite.

| Task | Files |
|------|-------|
| Integrations tab L4+; L3 “peek” modal | tabs + gate |
| Work MCP tools hidden L1–L3 | `MyWorkApp.tsx`, agent panel filter |
| “Level up?” nudge component | `WorkLevelUpNudge.tsx` — usage heuristics |
| Placeholder Executive brief panel (L5) | `WorkExecutiveBriefPanel.tsx` stub |
| Docs: L4/L5 deferred scope | `RELEASE-NEXT.md` |

**Heuristics for nudge (no XP yet):**
- L1→L2: ≥3 opportunities + 1 draft_reply sent/simulated  
- L2→L3: ≥1 active sequence + 5 sends  
- L3→L4: approvals used + connector linked  

- [x] WL5 complete

---

### Sprint WL6 — OS placeholders & QA
**Goal:** Other apps acknowledge framework; Work leveling tested.

| Task | Files |
|------|-------|
| Creator/Capital coach tips: one line “Growth level: Maker” placeholder | `experience-coach-catalog.ts` |
| `docs/creator-claw/LEVELING-PLACEHOLDER.md` | new stub |
| `docs/capital-claw/LEVELING-PLACEHOLDER.md` | new stub |
| QA: per-level smoke paths | `work-checklist.mjs`, `qa-user-flows.mjs` |
| `npm run qa:work-levels` script | optional dedicated checklist |

**Flows to add:**
- L1: opportunity → draft_reply → task complete  
- L2: import → mini sequence → activate (simulated)  
- L3: approval queue → approve → sent/simulated  

- [x] WL6 complete

---

## File checklist (new / major edits)

| File | Sprint |
|------|--------|
| `lib/os-growth-level.ts` | ✅ seed done |
| `lib/work-level-copy.ts` | WL2 |
| `lib/work-template-packs.ts` | WL2–WL3 |
| `lib/work-go-live.ts` | WL2 — per-level steps |
| `components/apps/work/WorkStartHomePanel.tsx` | WL2 |
| `components/apps/work/WorkMiniSequenceWizard.tsx` | WL3 |
| `components/apps/work/WorkLevelBadge.tsx` | WL1 |
| `components/apps/work/WorkLevelUpNudge.tsx` | WL5 |
| `components/apps/work/WorkWorkspaceTabs.tsx` | WL2–WL5 — growth gates |
| `components/apps/MyWorkApp.tsx` | all |
| `lib/experience-coach-catalog.ts` | WL2–WL4 |
| `lib/app-agent-catalog.ts` | WL1 — FRE intents |

---

## FRE wizard changes (WL1)

Add after workspace name:

```
What best describes you right now?
( ) Student, gamer, or hobby projects          → L1
( ) Etsy, freelance, or creator side income   → L2
( ) Nonprofit, advocacy, or community ops     → L3
( ) Solo business or client acquisition       → L4
( ) Founder or executive team lead            → L5
```

Optional second question (L1–L2):

```
What are you organizing first?
[ ] School / applications
[ ] Shop or orders (Etsy, eBay)
[ ] Gaming / community
[ ] Creator collabs
```

Sets `defaultTemplatePack` and coach tips.

---

## Agent skills by level

| Skill | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| draft_reply | ✅ | ✅ | ✅ | ✅ | ✅ |
| summarize_day / morning_brief | ✅ | ✅ | ✅ | ✅ | ✅ |
| draft_sequence | hide | ✅ | ✅ | ✅ | ✅ |
| send_sequence_step | hide | ○ | ✅ | ✅ | ✅ |
| enrich_lead | hide | ✅ | ✅ | ✅ | ✅ |
| book_meeting | hide | ✅ | ✅ | ✅ | ✅ |
| slack_digest | hide | hide | ✅ | ✅ | ✅ |
| run_demo_tour | ✅ | ✅ | ✅ | ○ | ○ |

Filter in `app-agent-catalog.ts` or client skill button render by `growthLevel`.

---

## Gamification seed (do not build now)

Record for Claw Cafe:

- XP events: `work.first_opportunity`, `work.first_followup`, `work.sequence_completed`, `work.reply_handled`, `work.connector_linked`, `work.go_live_demo_ready`
- Cross-Claw bonus: Creator publish + Work follow-up same week
- Levels never down-rank on inactivity — only suggest “switch persona” in settings

---

## Success metrics

| Metric | L1 target | L2 target | L3 target |
|--------|-----------|-----------|-----------|
| Time to first draft_reply | < 3 min | < 5 min | < 5 min |
| % users seeing “CRM” in L1 | 0% | — | — |
| Demo tour completion | > 80% | > 70% | > 60% |
| FRE → first opportunity | > 90% | > 85% | > 85% |

---

## Recommended execution order

```
WL1 (schema + FRE) → WL2 (L1) → WL3 (L2) → WL4 (L3) → WL5 (L4/L5 scaffold) → WL6 (QA + placeholders)
```

**Estimated:** WL1–WL4 = core product win (L1–L3 customers). WL5–WL6 = polish + OS seed.

---

## Deferred (not in leveling sprints)

- Claw Cafe XP UI  
- Deliverability suite (W12 — parallel track)  
- LinkedIn automation  
- Full executive dashboard  
- Forced level locks  

---

## Next action

WL1–WL8 + W13–W35 complete (v0.6.2). Phase 3 excellence arc closed — GTM assets + live proof per [RELEASE-NEXT.md](./RELEASE-NEXT.md). No further leveling sprints until Phase 4 scope is defined.
