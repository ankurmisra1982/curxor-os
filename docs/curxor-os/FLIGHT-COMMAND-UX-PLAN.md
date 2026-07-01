# Flight Command — OS UX Redesign Plan

> **Room:** Vision & Strategy → Agent build handoff  
> **Scope:** Operator shell only (`pillar-4-dashboard`) — **not** storefront, dream-state hero, or G4 rebrand copy  
> **Persona:** **Alex** — solo operator, API-rent fatigue, wants proof the box works while they sleep  
> **Status:** Locked direction (Jun 2026) · **phased execution**  
> **Related:** [FLIGHT-COMMAND-UX-RESEARCH.md](./FLIGHT-COMMAND-UX-RESEARCH.md) · [13-universal-ui-design.md](../guides/13-universal-ui-design.md) · [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) · [UNIVERSAL-OS-LAYER.md](./UNIVERSAL-OS-LAYER.md)

---

## Executive summary

Three homework concepts collapse into **one product with progressive disclosure**:

| Homework concept | Role in shipped OS |
|------------------|-------------------|
| **Concept 3** — Minimal Sovereign Portal | **Simple mode** default · calm Home · exception-based attention |
| **Concept 2** — Pragmatic Mission Control | **Expert mode** shell · multi-panel monitoring · Bloomberg density |
| **Concept 1** — Cognitive Conduct Desk | **Out of Flight Command** · Claw Cafe / demo film only |

**Spine:** File 1 three-zone layout (operate · workspace · status rail) + Alex homework (While You Slept feed, sovereignty strip, honesty grid).

**Reject permanently for OS shell:** 30/70 Master Claw terminal sidebar (legacy README split), full-monospace chrome, holographic neural mesh as default home.

---

## Design principles (Alex-first)

1. **Proof before poetry** — first screen answers: *what did my team do?* and *is my data still on metal?*
2. **Honesty over breadth theater** — Tier A vs Preview is structural in nav, not fine print.
3. **Exception-based interaction** — calm until APPROVE / Go Live / egress crossing; system interrupts only when intent is required.
4. **Progressive disclosure** — Simple = Concept 3 frame + Concept 2 data; Expert = full mission control.
5. **Typography** — sans for labels and navigation; mono for metrics, timestamps, and log lines only.
6. **Sovereignty visible** — local inference, UMA, egress state always one glance away (not buried in Settings).
7. **Home stays the front door** — roster and nav are not the only entry; `/home` is the novice hub.

---

## Locked shell wireframe (UX-0)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  SOVEREIGNTY STRIP (always)                                               │
│  Local inference · UMA · Egress (eno2) · optional frontier indicator      │
├──────────────────────────────────────────────────────────────────────────┤
│  HEADER                                                                   │
│  Flight Command · ⌘K Search · Settings · Health · + Forge                 │
├──────────────────────────────────────────────────────────────────────────┤
│  EXPERT ONLY: Live telemetry strip (eno1/eno2 · tok/s · mesh heartbeat)   │
├──────────┬───────────────────────────────────────────────┬───────────────┤
│ UNIVERSAL│                                               │               │
│  strip   │  CENTER CANVAS                                │  RIGHT RAIL   │
│ Cafe ·   │                                               │  (Expert or   │
│ Signal · │  SIMPLE + /home: "While You Slept" feed       │   collapsible)│
│ Kin ·    │  + attention queue (approvals first)          │               │
│ Ask      │                                               │  · Egress     │
├──────────┤  CLAW ROUTES: full workspace (existing apps)  │    toggle     │
│ OPERATE  │                                               │  · Unified    │
│ roster   │                                               │    activity   │
│ (honesty │                                               │  · Team       │
│  tiers)  │                                               │    status     │
│          ├───────────────────────────────────────────────┤               │
│          │  PATRON DOCK (bottom) — conduct / approve     │               │
└──────────┴───────────────────────────────────────────────┴───────────────┘
```

### Zone jobs

| Zone | Simple mode | Expert mode |
|------|-------------|-------------|
| **Sovereignty strip** | Local · UMA · egress badge (plain language) | + tok/s · pillar health dots |
| **Universal strip** | Icons + labels: Cafe, Signal, Kin, Ask | Same; Preview badges where honest |
| **Operate roster** | Icon rail; Tier A full color; Preview desaturated | + live status dot per claw (idle / running / awaiting / paused) |
| **Center** | Home = feed + approvals dominate | Claw workspace full width; Home feed moves to rail |
| **Right rail** | Hidden; egress toggle duplicated in strip | Full: egress toggle, unified feed, team status |
| **Patron dock** | Slim bar: "Conduct your team…" → expands to sheet | Same; does not replace per-claw chat |

### Copy rules (in-app · Act I GTM)

| Surface | Use | Do not use (G4 dream state) |
|---------|-----|------------------------------|
| Home H1 | *Your digital employees, on your metal* (or close variant) | *Designed around you. Owned by you.* |
| Shell title | *Flight Command* | *Sovereign Mission Control* as brand H1 |
| Patron placeholder | *Conduct your team…* | *Vibe-code the physical world* |
| Outreach label | **Outreach** in UI copy | Internal id stays `my-work` |

---

## Honesty grid (tier model)

Align nav and Home cards with buyer trust — extend existing `claw-preview-apps.ts`.

| Tier | Label in UI | Claws (Act I) | Visual treatment |
|------|-------------|---------------|------------------|
| **Production** | Tier A | Capital, Creator, Outreach (`my-work`) | Full color · no suffix |
| **Mint** | Always on | The Forge | Accent · never desaturated |
| **Preview** | Preview / hardware-bound | Kin, Vital, Signal, Swarm, Arbitrage, Cafe* | Desaturated · explicit badge |

\* Cafe is **universal** per OL1 — ships real (C4–C10) but nav still says Engage until OL1; honesty badge = *Patron Hall* not *production desk*.

**FRE default:** enable Capital, Creator, Outreach + Forge only; Preview claws opt-in with honest FRE copy (already partially shipped).

---

## Concept salvage map

| Idea | Include | Where |
|------|---------|-------|
| While You Slept feed | **Yes — center on Simple Home** | UX-2 · `HomeOverview` |
| Sovereignty strip | **Yes — always visible** | UX-1 · new `SovereigntyStrip` |
| Egress toggle + airgap banner | **Yes** | UX-2 · wire to eno2 health |
| Honesty grid | **Yes** | UX-1 + UX-3 |
| Team status dots | **Yes — Expert** | UX-2 |
| Four-pillar panel | **Yes — Expert drawer** | UX-2 · extends `SystemHealthDrawer` |
| Unified feed (all claws) | **Yes** | UX-2 · OS event bus + per-claw emitters |
| Bottom patron dock | **Yes** | UX-1 · complement `PatronAskFab` |
| Creator pipeline viz (intent → draft → egress) | **Yes — inside Creator workspace** | UX-4 |
| Capital bridge / reasoning cards | **Yes — inside Capital workspace** | UX-4 |
| ZMQ traffic cards | **Expert only · per-claw or drawer** | UX-4 |
| 30% Master terminal column | **No** | — |
| Holographic neural mesh | **No in shell** | Claw Cafe / G3 film |
| Starship / vibe easter egg | **No in default chrome** | Optional hidden gag post-G3 |
| Single Cognitive Hub as only UI | **No** | Simple Home is calm, not empty |

---

## Phased execution

### UX-0 — Wireframe & primitives lock

**Goal:** Agree on zones, modes, and anti-patterns before code moves.

**Deliverables:**
- This doc approved
- Figma or Cursor canvas optional (`flight-command-shell.canvas.tsx`) — zones only, no claw depth
- Decision log: patron dock vs FAB-only (recommendation: **both** — dock for conduct metaphor, FAB for mobile/kiosk)

**Gate:** Founder sign-off · no G1 hardware required

**Out of scope:** Claw workspace internals, OL1 data model migration

---

### UX-1 — Shell layout primitives

**Goal:** New `FlightCommandShell` layout without breaking routes or claw apps.

**Build targets:**

| Component | Responsibility |
|-----------|----------------|
| `SovereigntyStrip` | Local inference, UMA readout, egress badge; polls existing health/metrics APIs |
| `UniversalStrip` | Cafe, Signal, Kin, Ask — visually distinct from operate rail |
| `OperateRail` | Grouped icons; honesty tier styling; links to existing routes |
| `FlightCommandHeader` | Extract from `FlightCommandDesktop.tsx` — Search, Settings, Health, Forge |
| `PatronDock` | Bottom input; opens `PatronAskSheet` on focus/submit |
| `ShellLayout` | Composes zones; `children` = center canvas |

**Migration strategy (no big-bang):**
1. Introduce `ShellLayout` wrapping current `FlightCommandDesktop` inner content
2. Keep horizontal `AppNav` behind feature flag `CURXOR_SHELL_V2=1` until UX-3
3. Preserve `UiModeProvider`, `PatronAskProvider`, `CommandPalette`, `DesktopRouteGuard`

**Files:**
- `pillar-4-dashboard/components/desktop/FlightCommandDesktop.tsx`
- New: `components/shell/*`
- `lib/ui-categories.ts` — prep `layer: "universal" | "operate"` field (types only; populate in UX-3)

**Research requirements (UX-1):**
- [ ] Icon rail 64px collapsed / 256px expanded
- [ ] Universal band visually distinct from operate (bg `surface` vs `void`)
- [ ] Touch targets ≥ 44px on rail items (kiosk / MS-S1 display)
- [ ] Rename user-facing toggle: **Simple / Expert** (not “Telemetry”)

**Done when:** Shell renders on dev with flag on; all existing routes work; Simple mode hides right rail; UX-1 research checkboxes complete

**Gate:** G0 (dev QA) · can start before G1

---

### UX-2 — Sovereignty + unified activity feed

**Goal:** Alex's two psychological wins — proof of autonomous work + verifiable metal.

**2a — Sovereignty (real data)**

| Readout | Source (existing) |
|---------|-------------------|
| Local inference | `/api/setup/status`, inference router health |
| UMA | `lib/metrics.ts` / compute metrics |
| Egress eno2 | `eno2.down` OS event · network health API |
| Frontier mode | `user-settings.json` intelligence mode |

- Egress toggle: **read-only at first** if physical toggle not wired — show state + link to Settings; full toggle when appliance API exists
- Airgap banner when egress disconnected (from homework File 1)

**2b — While You Slept feed**

| Phase | Implementation |
|-------|----------------|
| **2b-i** | Aggregate `OsEventRecord` + scheduler heartbeat summaries into `GET /api/activity/feed` |
| **2b-ii** | Per-claw emitters: Capital trades, Creator drafts, Outreach sequences (extend event bus kinds) |
| **2b-iii** | Home Simple layout: feed replaces hero prominence; claw grid moves below fold |

**Extend event bus kinds** (additive):
```text
claw.skill_completed · claw.approval_required · scheduler.heartbeat · bridge.receipt
```

**Files:**
- `lib/os-event-bus-types.ts` · `lib/os-event-bus.ts`
- `components/shell/ActivityFeed.tsx` · `components/shell/AttentionQueue.tsx`
- `components/desktop/HomeOverview.tsx` — Simple vs Expert layouts
- `components/os/OsApprovalStrip.tsx` — merge into attention queue

**Orchestration views mapped (research):**

| View | Surface |
|------|---------|
| Fleet status | Operate rail status dots |
| Execution timeline | Unified activity feed |
| HITL inbox | Attention queue (+ `OsApprovalStrip`) |
| Error log | Feed filter: errors → claw / Health |
| Cost analytics | Expert: tok/s · UMA · frontier (optional) |

**Research requirements (UX-2):**
- [ ] Feed row schema: `time · claw · summary · tier · expandable evidence`
- [ ] Attention queue sort: approvals → errors → system → info
- [ ] Calm / Regular / Power notification mode in Settings
- [ ] “Since you last visit” feed filter on Home
- [ ] Empty feed honest state: “Your team is ready — enable Outreach sequences to start”
- [ ] Egress paused copy: cognition active · outbound paused (not error state)
- [ ] Agency Gate on feed rows: collapsed reasoning · expand for evidence · Approve / Dismiss

**Done when:** `qa:local` green; Home shows last 24h feed from real events on dev; egress strip reflects eno2 mock state; UX-2 research checkboxes complete

**Gate:** G0 · G1 validates sovereignty readouts on box

---

### UX-3 — OL1 layer split in navigation

**Goal:** Universal vs operate separation in shell — matches [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) OL1.

**Changes:**

| Item | Action |
|------|--------|
| `claw-cafe` | `layer: "universal"` · nav label **Claw Cafe** · remove from operate ten |
| `tesla-optimus-engine` | `layer: "universal"` · nav **Signal** |
| `my-family` | `layer: "universal"` · nav **Kin** · FRE decouple (OL-Kin1) |
| `robotaxi-fleet-manager` | stay operate · Swarm |
| Horizontal `AppNav` | Retire when `CURXOR_SHELL_V2` default; operate rail + universal strip replace it |

**FRE:** Stop listing Kin, Signal, Cafe as “employees to hire”; universal strip always visible post-setup.

**Files:**
- `lib/ootb-apps.ts` · `lib/ui-categories.ts` · `lib/claw-preview-apps.ts`
- `components/setup/SetupWizard.tsx` · `AppFreWizard.tsx`
- `components/shell/OperateRail.tsx` · `UniversalStrip.tsx`

**Research requirements (UX-3):**
- [ ] IA governance rule: new features map to `universal` | `operate` | `platform` before ship
- [ ] Breadcrumbs on forged `/my-claw/{slug}` routes
- [ ] Quarterly nav audit checklist (doc maintenance)

**Done when:** Nav matches OL1 table; FRE only picks operate claws; qa-smoke FRE + nav tests updated; UX-3 research checkboxes complete

**Gate:** G2 recommended (touches FRE) · can prototype behind flag at G0

---

### UX-4 — Per-claw workspace patterns

**Goal:** Industrial desk interiors for Tier A claws — homework File 2 ingredients **inside** workspaces, not global chrome.

| Claw | Pattern | Source |
|------|---------|--------|
| **Capital** | Bridge status grid · ruleset · reasoning log · pending approvals | File 1 + File 2 capital panel |
| **Creator** | Pipeline viz: intent → draft → egress | File 2 creator panel |
| **Outreach** | Sequence stats · lead activity timeline | existing `work-lead-activity` |
| **Preview claws** | Keep `previewWorkspaceBanner` · no Go Live theater | honesty grid |

**Shared workspace shell:**
- Header: claw name · tier badge · claw-specific status
- Body: desk panels (cards) + existing agent chat column
- Expert: optional mesh/debug drawer

**Home sections (task-driven · research):** Simple Home groups — *Overnight work* · *Needs you* · *Your team* (not pillar jargon)

**Research requirements (UX-4):**
- [ ] Claw workspace grid (HA sections pattern) — 2-col cards, predictable layout
- [ ] Creator pipeline stepper (intent → draft → egress)
- [ ] Capital reasoning accordion (collapsed by default)
- [ ] Preview claws: tier badge consistent with honesty grid

**Done when:** Capital + Creator match wireframe cards on dev; Preview claws unchanged except tier badge consistency; UX-4 research checkboxes complete

**Gate:** G2+ · per-claw waves can ship independently after UX-1

---

### UX-5 — Shell polish & Simple/Expert matrix

**Goal:** Close gaps from UX-1/2 research checklist and founder parking-lot items.

| Item | Implementation |
|------|----------------|
| Operate rail status dots | Expert · `GET /api/shell/team-status` · `OperateRail` |
| Team status in right rail | `TeamStatusPanel` in `ShellStatusRail` |
| Text scale (Settings) | Appearance → `textScale` · `data-text-scale` on `html` · default **large** |
| Feed evidence expand | `FeedRow` show/hide evidence (agency gate lite) |
| Notification mode | `flightCommand.notificationMode` in settings (calm default) |

**Done when:** Settings text scale persists; Expert rail shows team dots; qa-smoke team-status green

---

### UX-6 — Gap refinement pass

**Goal:** Post-implementation review — wiring, copy, and checklist items not caught in UX-1–5.

- Home task sections: **Overnight work** · **Needs you** · **Your team**
- Forged route breadcrumbs (`WorkspaceBreadcrumbs`)
- OL1 `lib/ol1-layer.ts` — single source for universal vs FRE pickable
- Cafe sprites include universal claws even when not in `selectedApps`
- QA: FRE picker excludes universal · activity visit · team status

---

### UX-7 — Intuitiveness audit

**Goal:** Walk the Alex persona path and roadmap checklist; fix friction without new features.

| Check | Status |
|-------|--------|
| First login → proof of metal (sovereignty strip) | Shipped UX-2 |
| First login → proof of work (feed / empty honest state) | Shipped UX-2 |
| Approval path obvious (attention queue → desk) | UX-2 + UX-4 panels |
| Expert depth one click (header toggle) | UX-1 |
| Preview claws visually distinct | UX-1 honesty tiers |
| Universal vs operate mentally separable | UX-3 |
| Text readable on display | UX-5 text scale |
| No spinner on local feed read | ActivityFeed no loading flash |

**Activation metrics** (post-ship): see Research checklist · measure after G1 dogfood

---

## Simple vs Expert matrix

| Feature | Simple | Expert |
|---------|--------|--------|
| Home center | While You Slept feed + attention queue | Claw cards + compact feed link |
| Operate rail | Icons + names | + status dots |
| Right rail | Off | Unified feed + team status |
| Telemetry strip | Off | On |
| Four-pillar drawer | Off | On (via Health) |
| Category labels in nav | Hidden | Shown (or rail group headers) |
| ZMQ / mesh cards | Hidden | Per-claw or drawer |
| Typography | Mostly sans | Mono in logs/metrics only |

**Toggle:** Existing `UiModeProvider` (`simple` | `expert`) — rename user-facing copy from “Telemetry” to **Simple / Expert** when shell ships.

---

## Patron interaction model

| Entry | Behavior |
|-------|----------|
| **Patron dock** (bottom) | Global conduct: “pause Outreach until tomorrow” · routes via patron chat |
| **PatronAsk FAB** | Keep for kiosk/mobile; same backend as dock |
| **`/ask` fullscreen** | Deep session; unchanged |
| **Attention queue** | Surfaces `claw.approval_required` · tap → claw workspace or inline approve |
| **Per-claw chat** | Unchanged in workspace; dock does not replace |

---

## Migration & risk

| Risk | Mitigation |
|------|------------|
| Big-bang layout break | Feature flag `CURXOR_SHELL_V2`; ship UX-1–2 behind flag |
| Feed empty on day zero | Seed “system ready” + FRE completion events; honest empty state |
| Egress toggle liability | Read-only until appliance confirms physical eno2 state |
| OL1 FRE regression | OL-Kin1 tests in qa-smoke before flag default |
| Monospace creep | Lint/review rule: mono only in `font-mono` utility classes for data |
| Concept 1 scope creep | Explicit **out of scope** for Flight Command issues |

---

## Parking lot (founder notes · post UX-2)

Captured during dogfood — not in current sprint unless promoted.

| Idea | Notes | Suggested phase |
|------|-------|-----------------|
| **CurXor floating action button** | Next.js **N** is framework-only; a sovereign **FAB** (Patron Ask / quick conduct / approvals badge) could mirror that pattern on kiosk + desktop. Distinct from patron dock — dock = conduct; FAB = jump menu or attention. | UX-2+ or Patron Link |
| **Text scale in Settings** | Default body type reads small on monitor / MS-S1 display. Add **Appearance → Text size** (`default` \| `large` \| `extra-large`) — CSS variable on `html` or `data-text-scale`, not browser zoom. Applies OS-wide, unlike Next.js dev prefs. | UX-2b or Settings wave |

---

## Out of scope (this program)

- Storefront / curxor.ai visual rebrand (G4)
- Dream-state hero copy on appliance
- Concept 1 holographic mesh in OS shell
- Learn · Gamer · Estate desks (G4 programs LR / GM / ES)
- Master AI horizontal beyond existing Patron Ask
- Kiosk tty1 install polish ([KIOSK-MODE-BUILD-PLAN.md](./KIOSK-MODE-BUILD-PLAN.md) separate)
- Claw Cafe pixel room internals (Cafe program)

---

## Build chat handoff template

```text
Sprint: UX-1 Flight Command shell primitives
Goal: SovereigntyStrip + OperateRail + UniversalStrip + PatronDock behind CURXOR_SHELL_V2
Done when: qa:local green · all routes work with flag on · Simple hides right rail
@ docs/curxor-os/FLIGHT-COMMAND-UX-PLAN.md
@ docs/curxor-os/FLIGHT-COMMAND-UX-RESEARCH.md
@ pillar-4-dashboard/components/desktop/FlightCommandDesktop.tsx
@ pillar-4-dashboard/components/shell/
Out of scope: OL1 FRE changes, per-claw desk panels, feed API
```

---

## Sequencing summary

```text
UX-0  Wireframe lock (this doc)           ── now
UX-1  Shell primitives + flag             ── G0
UX-2  Sovereignty strip + activity feed   ── G0 · validate on G1
UX-3  OL1 nav / FRE layer split           ── G2 (flag default)
UX-4  Tier A workspace interiors          ── G2+ per claw
UX-5  Shell polish (dots, text scale)     ── G0
UX-6  Gap refinement pass                 ── G0
UX-7  Intuitiveness audit                 ── G0 · post dogfood
```

**Parallel allowed:** UX-4 Capital/Creator panels can start after UX-1 while UX-2 feed API is in flight.

---

## Research-backed requirements (master checklist)

> Source: [FLIGHT-COMMAND-UX-RESEARCH.md](./FLIGHT-COMMAND-UX-RESEARCH.md) §12 · merged into phases above.

### UX-1 — Shell

- [ ] Icon rail 64px collapsed / 256px expanded
- [ ] Universal band visually distinct from operate (bg `surface` vs `void`)
- [ ] Touch targets ≥ 44px on rail items
- [ ] Rename user-facing toggle: Simple / Expert (not “Telemetry”)

### UX-2 — Sovereignty & feed

- [ ] Feed row schema: `time · claw · summary · tier · expandable evidence`
- [ ] Attention queue sort: approvals → errors → system → info
- [ ] Calm / Regular / Power notification mode in Settings
- [ ] “Since you last visit” feed filter on Home
- [ ] Empty feed honest state
- [ ] Agency Gate on outbound rows (reasoning accordion · Approve / Dismiss)
- [ ] Five orchestration views wired (fleet · timeline · HITL · errors · cost)

### UX-3 — OL1 IA

- [ ] IA governance: universal | operate | platform
- [ ] Breadcrumbs on forged routes
- [ ] Quarterly nav audit checklist

### UX-4 — Workspaces

- [ ] Claw workspace 2-col card grid
- [ ] Creator pipeline stepper
- [ ] Capital reasoning accordion (collapsed default)
- [ ] Home task sections: Overnight work · Needs you · Your team

### Cross-cutting (all phases)

- [ ] Every autonomous feed row links to audit evidence (skill id · bridge receipt)
- [ ] Demo/prod explicit in Expert Health drawer
- [ ] Audit `font-mono` in shell chrome — mono for data only
- [ ] Feed renders from local event log without spinner on read
- [ ] Notification interrupt only: `approval_required` · `go_live.failed` · `eno2.down`
- [ ] Expert toggle one click in header (not buried in Settings)

### Activation metrics (post-ship · measure redesign)

| Metric | Target signal |
|--------|---------------|
| D1 return to Home | Feed is valuable |
| Time to first approval | HITL path obvious |
| Simple → Expert conversion | Voluntary depth |
| Settings claw toggles | Freedom without confusion |
| Preview claw bounce rate | Honesty grid working |
| Patron dock usage | Conduct metaphor lands |

### Stickiness rules (no gamification on Home)

- Morning Home → “Since you last visited”
- Batch low-priority events into feed; no push-per-claw-event
- Cafe XP stays off Simple Home for Alex
- Optional evening digest row in feed (Expert)

---

## Related docs

| Doc | Role |
|-----|------|
| [FLIGHT-COMMAND-UX-PLAN.md](./FLIGHT-COMMAND-UX-PLAN.md) | This plan |
| [FLIGHT-COMMAND-UX-RESEARCH.md](./FLIGHT-COMMAND-UX-RESEARCH.md) | Deep dive · IA · trends · adoption |
| [13-universal-ui-design.md](../guides/13-universal-ui-design.md) | Research + shipped touchpoints |
| [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) | OL1 roster lock |
| [07-flight-command-dashboard.md](../guides/07-flight-command-dashboard.md) | Operator guide (update post UX-3) |
| [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) | Gates G0–G4 |

---

## Anti-patterns (do not ship)

**Shell & layout**
1. 30/70 Master Claw terminal column as default layout
2. Neural mesh / spatial orchestrator as OS home
3. Top nav feature creep (horizontal tab overflow)
4. Dashboard as junk drawer — every metric on Home

**Trust & honesty**
5. Full-monospace UI for labels and navigation
6. Preview claws visually equal to Tier A
7. Egress state only in Settings or Expert mode
8. Fake production signals on Preview claws
9. Black-box AI — no expandable reasoning on outbound actions

**Copy & scope**
10. Dream-state copy on cold operator first login
11. Removing `/home`, ⌘K, or Settings freedom
12. “Starship sync” or meme chrome in default shell

**Retention**
13. Notification = engagement hack — ping per claw event
14. Chat as only interface — agents need desks + feed
15. Spinner on local feed reads
16. Amputate power tools — hide Expert behind maze
