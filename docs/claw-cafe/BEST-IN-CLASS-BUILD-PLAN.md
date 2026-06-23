# Claw Cafe — Best-in-Class Build Plan

> **Baseline:** v0.6.5 · CC0 + CC3 scaffold shipped (tabs, ascension G1–G6, event bus, CSS spatial grid, SSE)  
> **Vision:** [CLAW-CAFE-PRD.md](../curxor-os/CLAW-CAFE-PRD.md)  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Forge handoff:** F8–F12 mint/archive events + CCP — **done**  
> **Status:** Active — hand to Cafe Agent chat  
> **Target band:** v0.7.0–v0.7.2

---

## North star

Claw Cafe is the **living mirror of CurXor OS use** — pixel room where Claws walk, react to **real activity**, and aggregate **Sprout → Infinity** ascension. On-ramp to **Master AI** (patron chat deferred to v0.8+).

**Buyer promise:** “Your Claws have a home. Your habits become identity. Your box remembers.”

**Best in class means:**

1. **Observational room** — characters move on real events, not fake NPC loops  
2. **Dual progression** — app L1–L5 epithets + G1–G6 ascension (already split in code)  
3. **Playable patron** — walk, proximity inspect, Open Claw  
4. **Cross-Claw feed** — Work, Creator, Capital, Forge, Swarm (+ forged desks)  
5. **Honest delight** — level-up ceremonies, easter eggs tied to OS behavior  
6. **GTM** — demo tour, capture, storefront narrative  

**Do not build:** autonomous LLM banter between Claws, multiplayer, 3D/VR, full Engage/DM product (CC2 stays light).

---

## Current state vs target (honest inventory)

### Shipped — keep

| Area | What exists |
|------|-------------|
| **Workspace tabs** | Play · Ascension · Progress · Host (`cafe-level-gates.ts`) |
| **Ascension G1–G6** | Mythic + neutral titles, affinities, milestones, XP thresholds |
| **Event ledger** | `cafe-state.json` · ingest · sync · SSE `/api/stream/cafe` |
| **Spatial scaffold** | Station grid, character states, bubbles (`CafeSpatialRoom` CSS grid) |
| **Live ingest** | Work XP · Swarm XP · Forge mint/archive (`syncCafeEventSources`) |
| **Forge integration** | Door-enter bubbles, forged `appId`, walk-out on archive |
| **Settings hook** | `cafeTitleStyle` mythic \| neutral |
| **QA** | `npm run qa:cafe-ascension` (in `qa:local`) |
| **Demo** | `demo:capture:cafe-swarm` · `screenshots/cafe/18-ascension-tab.png` |

### Gaps — this plan closes them

| Gap | PRD / vision | Wave |
|-----|--------------|------|
| **CSS grid ≠ pixel room** | Canvas 2D, integer zoom, walk animation | **C4** |
| **No patron avatar** | WASD / click-to-move, proximity inspect | **C4** |
| **Creator + Capital not in sync** | Feed copy claims Capital; sync omits them | **C5** |
| **Progress tab redundant** | Merge Work XP into Ascension; slim or remove tab | **C5** |
| **No level-up ceremony** | Modal + optional chime on tier change | **C6** |
| **Gamification opt-out split** | Unify work opt-out + cafe ascension opt-out in Settings | **C6** |
| **Play tab default** | L2+ default **Ascension**; Play = kiosk sub-lane | **C6** |
| **No Go Live / demo tour** | `demoReady` + `run_cafe_demo_tour` skill | **C7** |
| **No easter eggs** | Cat, eno2 freeze, constellation marks | **C7** |
| **Physical mesh dock** | CLAW sprites at `yard_dock` when vision live | **C7** |
| **CC1 FRE / growth** | Cafe growth intent in FRE; level-up nudge | **C8** |
| **GTM docs + scorecard** | BEST-IN-CLASS.md, RELEASE-NEXT, capture | **C9** |
| **Master AI patron chat** | “What did my Claws do?” | **Deferred v0.8** |

---

## Scope boundary

### In scope

| Track | Waves | Outcome |
|-------|-------|---------|
| **Pixel room + patron** | C4 | Canvas room replaces CSS grid; avatar + inspect |
| **Event completeness** | C5 | Creator/Capital/Forged desk emitters; feed honesty |
| **Progression UX** | C6 | Ceremonies, opt-out, default tab, epithets on profile |
| **Delight + mesh** | C7 | Easter eggs, yard dock, Go Live + demo tour |
| **Growth + FRE** | C8 | Cafe L1–L5 persona, coach, nudge |
| **QA + GTM** | C9 | checklist, captures, docs, v0.7.0 tag |

### Out of scope (this arc)

- Full Engage Claw / DM inbox (CC2 heavy — preview copy only)
- Master AI unified ask panel
- Second room (Forge annex, Break room when eno2 down) — v0.8
- Nav rebrand Engage → Claw Cafe (flip when GTM ready in C9)
- Autonomous Claw-to-Claw LLM chat

### Parallel with hardware (Thu Jun 25)

Cafe is **dashboard-only** — safe to build on dev machine while MS-S1 unbox/BIOS runs. **C9 captures** should include one appliance screenshot after first on-device QA.

---

## Cafe persona matrix (L1–L5)

Uses `GROWTH_LABELS["claw-cafe"]` today (Visitor → Founder). Map FRE intent:

| Level | Label | Default tab | Unlocks |
|-------|-------|-------------|---------|
| L1 | Visitor | **Ascension** (after C6) | Spatial room, ascension bar, feed read-only |
| L2 | Regular | Ascension | Host tab (kiosk config), inspect panel |
| L3 | Host | Ascension | Level-up nudges, cross-Claw handshake hints |
| L4 | Patron | Ascension | Easter egg objects visible, constellation progress |
| L5 | Founder | Ascension | Ops strip (event debug, sync stats) — read-only |

---

## Build waves

### C4 — Pixel room + patron avatar (1–2 sprints) **P0**

**Goal:** Replace `CafeSpatialRoom` CSS grid with Canvas 2D pixel room per PRD.

| Task | Detail |
|------|--------|
| `CafePixelCanvas.tsx` | Canvas 2D, integer scale, tile floor + station sprites (simple colored rects OK v1) |
| Character sprites | OOTB short codes (OUT, CRE, CAP…) + forged label truncation |
| Pathfinding lite | Lerp between station cells on event; idle wander timer |
| **Patron avatar** | Arrow keys + click-to-move; collision with station cells |
| **Proximity inspect** | Within 1 cell → panel: label, bubble, ascension snippet, **Open Claw** link |
| Retire or shrink CSS grid | `CafeSpatialRoom.tsx` → wrapper or delete |
| SSE hook | Canvas reads `characters[]` from existing stream |

**Files:** `components/apps/cafe/CafePixelCanvas.tsx` · `lib/cafe-pixel-engine.ts` (pure TS: grid, path, avatar) · update `ClawCafeApp.tsx` Ascension tab

**Done when:**

- Patron walks room; Claw moves to Mail on simulated ingest  
- Click adjacent Claw → inspect flyout with href to app  
- `qa:cafe-ascension` still green  

**Reference:** Pixel Agents pattern — observational only, no LLM dialogue.

---

### C5 — Event bus completeness (1 sprint)

**Goal:** All Tier A flagships + forged desks feed ascension.

| Task | Detail |
|------|--------|
| `creator-xp-events.ts` | Mirror work-xp pattern; emit on publish, schedule, go_live |
| `capital-xp-events.ts` | rule_fired, go_live, demo tour |
| Extend `syncCafeEventSources()` | Pull creator + capital ledgers |
| Forged desk hooks | work-desk send, creator schedule, capital arm → cafe ingest |
| Fix feed copy | Already lists Capital — make true |
| **Progress tab** | Merge into Ascension (single Work streak strip) OR hide tab L1+ with redirect |
| Tier C claws | Show in room at `couch` with “Preview” bubble — no XP spam |

**Done when:**

- Creator publish on dev machine → character at publish_desk + feed row  
- Capital rule arm → ticker_wall act state  
- Sync ingests ≥4 sources in QA  

---

### C6 — Progression UX (0.5–1 sprint)

| Task | Detail |
|------|--------|
| `CafeLevelUpModal.tsx` | Trigger when `tier` increases after ingest/sync |
| Settings | Unified **Gamification** toggle; `cafeTitleStyle` wired to Appearance |
| Epithet strip | `{Ascension title} · {primary app epithet}` on ascension header |
| Default tab | `defaultCafeTabForGrowth`: L1 Play optional; L2+ → `ascension` |
| Opt-out | Single flag disables ingest + SSE updates (respect sovereignty) |

---

### C7 — Delight, mesh dock, Go Live (1 sprint)

| Task | Detail |
|------|--------|
| **Easter eggs (3)** | Coffee object click · Window/time easter egg · eno2-down freeze all chars (read bridge status or mock flag) |
| **Yard dock** | When `useVisionStream` connected, spawn CLAW-01..04 sprites at `yard_dock`; motor skill → brief act |
| `lib/cafe-go-live.ts` | demoReady: ascension sync + ≥1 event + inference optional |
| `CafeGoLivePanel.tsx` | Mint tab or Ascension header; **Run demo tour** |
| Skill `run_cafe_demo_tour` | Ingest tour events across Work + Forge stubs → celebrate |
| `GET/POST /api/cafe/status` | Extend with `goLive`, `demoReady` (mirror forge pattern) |

---

### C8 — FRE, coach, nudge (0.5 sprint)

| Task | Detail |
|------|--------|
| FRE field `cafeGrowthIntent` | Maps to L1–L5 |
| `CafeLevelUpNudge.tsx` | “Sync Claws to advance” when milestones incomplete |
| Coach catalog | Expand `claw-cafe` tips per tab + ascension |
| `resolveCafeGrowthLevel()` | Read FRE + settings |

---

### C9 — QA matrix & GTM (0.5–1 sprint)

| Task | Detail |
|------|--------|
| `scripts/cafe-checklist.mjs` | Tab gates · ingest · sync · tier-up · go_live · inspect href |
| Wire into `qa-local.mjs` | Alongside qa-cafe-ascension |
| `docs/claw-cafe/BEST-IN-CLASS.md` | Scorecard (fill after waves) |
| `docs/claw-cafe/EXIT-DEMO.md` | Walkthrough script |
| `docs/claw-cafe/RELEASE-NEXT.md` | Checkboxes |
| Capture | Ascension tab + pixel room screenshot; optional webm |
| Version | **v0.7.0** when C4–C7 green; **v0.7.1** after C9 |
| Optional nav rename | Engage Claw → Claw Cafe in `ootb-apps.ts` + storefront |

---

## Execution protocol (Cafe Agent chat)

```
1. Read wave section + files
2. Minimal diff — match Forge/Work conventions
3. npm run typecheck
4. npm run qa:local -- --port 3081
5. npm run qa:cafe-ascension -- http://127.0.0.1:3081
6. Extend cafe-checklist if API/UX changed
7. Update RELEASE-NEXT.md
8. Commit — exclude scripts/dev-qa/cafe-state.json noise unless seeding
```

**Parallel-safe:** Cafe owns `lib/claw-cafe-*`, `lib/cafe-*`, `components/apps/cafe/`, `api/cafe/`, `api/stream/cafe/`. Do not touch Forge except existing ingest hooks.

**Hardware week:** After MS-S1 first boot, run `qa:local` on appliance IP; add one line to EXIT-DEMO for on-device Cafe sync.

---

## Wave sequence

```text
C4 (pixel + avatar) → C5 (events) → C6 (UX) → C7 (delight + go live) → C8 → C9
         ↑
    START HERE — biggest vision delta
```

**Minimum viable best-in-class:** C4 + C5 + C6 + C9  
**Full arc:** through C8 before Master AI stub (v0.8)

---

## Key files

| Domain | Path |
|--------|------|
| Shell | `components/apps/ClawCafeApp.tsx` |
| Ascension | `lib/claw-cafe-ascension.ts` |
| Events | `lib/claw-cafe-events.ts` |
| Spatial | `lib/claw-cafe-spatial.ts` |
| Gates | `lib/cafe-level-gates.ts` · `lib/cafe-growth.ts` |
| Work bridge | `lib/work-xp-events.ts` |
| Forge bridge | `lib/forge-cafe-events.ts` |
| API | `app/api/cafe/status/route.ts` · `app/api/stream/cafe/route.ts` |
| QA | `scripts/qa-cafe-ascension.mjs` |

---

## Agent kickoff (copy/paste — start C4)

```markdown
Sprint: Claw Cafe C4 — Pixel room + patron avatar

Goal: Replace CSS spatial grid with Canvas 2D pixel room; patron walks with arrow keys; proximity inspect opens flyout with Open Claw link.

Done when:
- Ascension tab shows canvas room with ≥4 OOTB station sprites
- Patron avatar moves; adjacent inspect works
- SSE character updates animate lerp to station on ingest
- npm run qa:cafe-ascension green
- npm run qa:local -- --port 3081 green

@ docs/claw-cafe/BEST-IN-CLASS-BUILD-PLAN.md (C4)
@ docs/curxor-os/CLAW-CAFE-PRD.md
@ pillar-4-dashboard/components/apps/cafe/CafeSpatialRoom.tsx
@ pillar-4-dashboard/lib/claw-cafe-spatial.ts
@ pillar-4-dashboard/lib/claw-cafe-events.ts
@ pillar-4-dashboard/components/apps/ClawCafeApp.tsx

Out of scope: Creator/Capital ingest (C5), Go Live (C7), nav rebrand
```

---

## Success criteria

| Criterion | Measure |
|-----------|---------|
| Vision room | Canvas pixel room, not CSS grid |
| Patron | Walk + inspect + Open Claw |
| Cross-Claw | Work, Creator, Capital, Forge in sync |
| Ascension | G1–G6 with ceremonies + milestones |
| Forge | Mint enters room; archive walks out |
| Honest | No fake NPC chat; bubbles from real events |
| GTM | demo tour + capture + scorecard ≥4.0 |
| Master AI | Event ledger ready; patron chat deferred |

When C9 green, return to Vision chat for v0.8 Master AI patron scope.
