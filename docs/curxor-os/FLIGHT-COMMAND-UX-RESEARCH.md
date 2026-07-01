# Flight Command — UX Research & Design Synthesis

> **Room:** Vision & Strategy · informs [FLIGHT-COMMAND-UX-PLAN.md](./FLIGHT-COMMAND-UX-PLAN.md)  
> **Scope:** OS operator shell only · Alex (solo operator) · Act I GTM  
> **Date:** June 2026  
> **Verdict:** Research **validates File 1** (hybrid top bar + left rail + center canvas + right status rail) with specific additions below.

---

## 1. Executive synthesis

CurXor OS is not a SaaS dashboard, not a chat app, and not a Linux admin panel. It is a **local-first hardware appliance** running an **always-on multi-agent workforce**. The UX research landscape in 2025–2026 converges on patterns that map cleanly to File 1 — with one critical caveat:

**Spatial / holographic agent canvases (Concept 1) are trending in agent-UI discourse but fail the Alex test.** They optimize for *supervision of swarms* by technical operators, not *trust + proof of autonomous work* by a solo buyer escaping API rent. Quarantine spatial UI to Claw Cafe and demo film.

### Research-backed spine (unchanged)

```text
TOP:    sovereignty strip + header (global context)
LEFT:   universal segment + operate rail (persistent IA)
CENTER: Home (attention) → claw workspaces (depth)
RIGHT:  status rail — egress, feed, team (Expert / collapsible)
BOTTOM: patron dock (conduct + approve)
```

### Top 10 research additions to bake into the plan

| # | Addition | Source lane |
|---|----------|-------------|
| 1 | **Attention-first Home** — feed + approval queue before claw grid | Operator consoles · Alex persona |
| 2 | **Hybrid nav** — top bar for global actions, left rail for modules (not tabs) | Enterprise IA · 6+ module rule |
| 3 | **Fleet status semantics** — idle / running / awaiting / error per claw | Agent orchestration dashboards |
| 4 | **HITL approval inbox** as first-class surface (not buried in claw chat) | Agentic UI · finance/trading UX |
| 5 | **Sovereignty strip** always visible — local · UMA · egress | Local-first · Ink & Switch ideals |
| 6 | **Calm / Regular / Power** notification modes (not per-event pings) | Notification UX 2026 |
| 7 | **Progressive disclosure with escape hatches** — Expert is one click, not a maze | Platform control-plane UX |
| 8 | **Task-driven Home sections**, not device/pillar jargon | Home Assistant · appliance UX |
| 9 | **Evidence on every autonomous action** — expandable “why” on feed rows | Operator trust · audit timeline |
| 10 | **Icon rail collapse** (64px) + expand (256px) for 10+ modules | Sidebar scaling pattern |

---

## 2. Persona & jobs-to-be-done

### Alex (primary · day-one buyer)

| Job | Emotional driver | UI must answer |
|-----|------------------|----------------|
| **Monitor** | “Is my team working?” | While You Slept feed · team status dots |
| **Trust** | “Is my alpha still local?” | Sovereignty strip · egress state |
| **Approve** | “Nothing leaves without me” | Attention queue · blast-radius preview |
| **Drill down** | “Fix/configure one desk” | One click to claw workspace |
| **Grow** | “Add a specialist later” | Forge · Settings freedom |

### Secondary personas (same shell · different defaults)

| Persona | Default mode | Primary surface |
|---------|--------------|---------------|
| **Alex** (solo operator) | Simple | Home feed + Tier A claws |
| **Power Alex** (month 2+) | Expert | Right rail · telemetry · mesh |
| **Household operator** | Simple | Kin universal · Vital previews |
| **Founder/demo** | Expert | Health drawer · pillar panel |

**Research rule:** One dashboard cannot serve executive, manager, and operator equally ([Eleken SaaS dashboard research](https://www.eleken.co/blog-posts/saas-dashboard-design)). CurXor picks **operator** for Act I. Do not optimize Home for investor KPIs.

---

## 3. Competitive & analog landscape

### Direct adjacency (learn · do not copy)

| Product | What they get right | CurXor differentiation |
|---------|---------------------|------------------------|
| **OpenClaw Control UI** | Modular panels · ⌘K · overview hub | CurXor is appliance + captive portal; novices, not gateway admins |
| **ChatGPT / Claude web** | Low friction chat | CurXor is *team + policy + egress*, not single thread |
| **LangSmith / Langfuse** | Traces · spans · evals | CurXor feed is *operator narrative*, not developer traces |
| **Home Assistant** | Task-driven dashboards · conditional sections · wall tablet UX | CurXor = *digital employees*, not entity cards |
| **Bloomberg Terminal** | Information density · always-on status | CurXor Simple mode is *not* Bloomberg — density is Expert opt-in |
| **Samsung AI Home / One UI appliances** | Familiar patterns · glanceable status · staged complexity | CurXor lacks phone ecosystem — shell must be self-explanatory |
| **Spatial agent canvases** (2026 agentic UI trend) | Multi-agent supervision · dependency graphs | Wrong default for Alex; right for Cafe / G3 film |

### Category whitespace (defensible)

1. **Physical egress as UI** — almost no AI product shows a hardware boundary in chrome  
2. **Honest preview tiering** — competitors oversell; CurXor wins trust by desaturating immature desks  
3. **While You Slept on local metal** — cloud agents cannot show “your box did this offline”  
4. **Approve-to-egress** — HITL tied to eno2 policy, not generic “Are you sure?”

---

## 4. Information architecture

### Object model (canonical · do not fragment)

Research on scaling SaaS nav ([Raze Growth](https://razegrowth.com/blog/saas-navigation-architecture-scaling-2), [Design Pixil](https://designpixil.com/blog/saas-navigation-design-patterns)) recommends a **stable object model** under role-based views. CurXor’s locked model:

```text
LAYER          OBJECTS                    PICKER?
─────────────  ─────────────────────────  ────────
Universal      Cafe · Signal · Kin · Ask   Always on
Operate        10 claws + forged           FRE / Settings
Platform       CCP · channels · inference  No nav (services)
Appliance      4 pillars · eno1/eno2      Health drawer
```

### Navigation pattern decision

| Option | Research verdict for CurXor |
|--------|----------------------------|
| **Top tabs only** (shipped today) | ❌ Fails at 10+ modules — known overflow problem |
| **Left sidebar full labels** | ⚠️ Too tall at 10 claws + forged |
| **Icon rail + expand** | ✅ Standard for 6+ modules · maximizes canvas width |
| **Top global + left module** | ✅ **Recommended hybrid** — global context vs work context |
| **Bottom nav** | ⚠️ Mobile/kiosk only · MS-S1 local display |

### IA rules (enforce in UX-3)

1. **Top level = context switch** (Home · universal · settings) — max 5–7 global items  
2. **Left rail = operate desks** — grouped Wealth · Work · Life · Create  
3. **Universal strip ≠ operate** — separate visual band (background, border, label)  
4. **Forged apps** nest under Forge group or “Your team” — never flatten into 15 flat icons  
5. **⌘K bypasses nav** — power users must jump without learning IA ([Linear pattern](https://github.com/szl-holdings/platform/blob/main/ops/product/operator-experience-upgrade.md))  
6. **Breadcrumbs** on forged `/my-claw/{slug}` routes — deep hierarchy aid  

### Mental model for Alex

Organize by **jobs**, not infrastructure:

| Alex thinks… | UI says… | Not… |
|--------------|----------|------|
| “My outreach emails” | Outreach Claw | `my-work` · ZMQ |
| “Did anything post?” | Creator · feed row | Engage Claw |
| “Is it still local?” | Sovereignty strip | Pillar 1 |
| “Unplug outbound” | Egress paused | eno2 down event |

---

## 5. Layout & visual architecture

### File 1 validation

Sidebar navigation for complex B2B tools with 6+ sections is **industry default** ([DeveloperUX 2026](https://developerux.com/2026/05/18/improving-multi-platform-navigation-internal-tools/), [Design Pixil](https://designpixil.com/blog/saas-navigation-design-patterns)). CurXor has 10 operate + 4 universal + forged — **horizontal nav was always a scaling dead end**.

### Hybrid shell (research-optimal)

```text
┌─ GLOBAL TOP ─────────────────────────────────────────────┐
│ Sovereignty strip (trust · always)                        │
│ Header: brand · ⌘K · Settings · Health · Forge            │
│ Expert: telemetry strip                                   │
├─ UNIVERSAL BAND (always · visually distinct) ────────────┤
├─ BODY ───────────────────────────────────────────────────┤
│ [Icon rail] │ [Center canvas]              │ [Right rail] │
│  operate    │  Home / claw workspace       │  Expert      │
├─────────────┴──────────────────────────────┴──────────────┤
│ Patron dock                                               │
└───────────────────────────────────────────────────────────┘
```

### Visual language (industrial tool · not Vision Pro)

| Element | Research-backed choice |
|---------|------------------------|
| **Background** | Deep void (`#050505`–`#0a0a0a`) — reduces glare on kiosk monitor |
| **Accent** | Single primary (CurXor purple) — status uses semantic green/amber/red only |
| **Type** | Sans: nav, labels, headings · Mono: timestamps, metrics, log lines |
| **Density** | Simple: 8px grid, generous padding · Expert: 4px grid, tighter cards |
| **Motion** | Functional only — pulse on awaiting approval; no decorative mesh |
| **Touch** | Min 44–48px targets for MS-S1 local display ([HA / mobile research](https://developerux.com/2026/05/18/improving-multi-platform-navigation-internal-tools/)) |

### F-pattern scanning ([Eleken](https://www.eleken.co/blog-posts/saas-dashboard-design))

| Zone | Content priority |
|------|------------------|
| **Top-left** | Sovereignty: local active |
| **Top row** | Attention queue / pending approvals |
| **Center** | While You Slept feed (Simple Home) |
| **Left rail** | Tier A claws (Production) |
| **Right** | Expert: live team status |

---

## 6. Multi-agent orchestration UI (2025–2026)

Agent orchestration research ([Lowcode.agency](https://www.lowcode.agency/blog/how-to-build-an-ai-agent-orchestration-dashboard-for-complex-workflows), [Zypsy Agent UI](https://llms.zypsy.com/agent-orchestration-ui-prompt-management), [Suhas Bhairav HITL](https://suhasbhairav.com/blog/designing-user-interfaces-that-make-multi-turn-background-agent-steps-transparent-and-engaging)) defines **five essential views**. Map to CurXor:

| Orchestration view | CurXor surface | Phase |
|--------------------|----------------|-------|
| **1. Fleet status** | Operate rail status dots | UX-2 |
| **2. Execution timeline** | Unified activity feed | UX-2 |
| **3. Error log** | Feed filter: errors · link to claw + Health | UX-2 |
| **4. Cost analytics** | Expert: tok/s · UMA · frontier spend (optional) | UX-2+ |
| **5. HITL inbox** | Attention queue + `OsApprovalStrip` | UX-2 (exists · elevate) |

### Agency Gate pattern ([Flint / OCAD 2026](https://openresearch.ocadu.ca/id/eprint/5126/1/Zhang_Kasper_2026_MDES_DIGF.pdf))

AI must not auto-cross egress. UI shows **proposal → review → approve**:

```text
Feed row:  CAPITAL · Paper trade proposed · TSLA ×10
           [View reasoning]  [Approve]  [Dismiss]
```

Expandable reasoning = “thought accordion” ([agentic UI research](https://interconnectd.com/forum/thread/113/the-agentic-ui-designing-frontends-for-multi-agent-systems-2026-technical-m/)) — **collapsed by default** for Alex, expanded in Expert.

### What NOT to import from agentic UI trend

| Trend | Why skip for Flight Command |
|-------|----------------------------|
| Full spatial canvas / dependency graph | Cognitive load · demo not daily driver |
| Per-agent resizable panels | 10 claws = window management hell |
| Developer trace IDs in main feed | Wrong persona |
| Real-time ping per tool call | Notification fatigue |

---

## 7. Appliance & hardware UX

### Lessons from connected appliances ([Samsung One UI appliances](https://news.samsung.com/global/samsung-expands-one-ui-to-home-appliances-bringing-unified-software-experience-across-devices), [Panasonic/Fresco](https://frescocooks.com/resources/case-studies-how-panasonic-brought-connected-cooking-to-market-with-fresco))

1. **Glanceable status** — washing-time-left pattern → “3 claws worked overnight”  
2. **Staged onboarding** — FRE is multi-step; don’t dump mission control on step 1  
3. **Post-setup evolution** — UI reveals depth as operator matures (experience level + Simple/Expert)  
4. **Wall display / kiosk** — large touch targets; patron dock reachable at bottom  
5. **Long software support narrative** — OTA visibility in Health (trust over time)

### Home Assistant parallels ([HA Dashboard chapters](https://www.home-assistant.io/blog/2024/03/04/dashboard-chapter-1/))

| HA pattern | CurXor adaptation |
|------------|-------------------|
| Organize by **tasks** not devices | Home sections: Overnight work · Needs you · Your team |
| **Conditional visibility** | Show security/egress banner only when relevant |
| **Multiple views** not infinite scroll | Home vs claw workspace vs Health drawer |
| **Sections grid** | Claw workspace cards in predictable grid (UX-4) |
| **Footer sticky action** | Patron dock |

---

## 8. Trust, sovereignty & local-first UI

Ink & Switch [local-first ideals](https://www.inkandswitch.com/essay/local-first/) + 2026 local-first UX ([Smashing Magazine](https://www.smashingmagazine.com/2026/05/architecture-local-first-web-development/)) map directly to CurXor’s product truth:

| Ideal | UI expression |
|-------|---------------|
| **No spinners for local work** | Instant feed append from local event log |
| **User owns data** | Export · workspace paths in Settings |
| **Network optional** | “Cognition active” when egress paused — explicit copy |
| **Privacy by default** | Frontier mode badge only when opt-in |
| **Honest state** | Never show “posted” until bridge receipt |

### Sovereignty strip spec (research-canonical)

| Signal | Simple copy | Expert addendum |
|--------|-------------|-----------------|
| Inference | “Thinking on this box” | `127.0.0.1:8000` · model name |
| Memory | “Memory: 48 GB in use” | UMA bar |
| Egress | “Outbound: On / Paused” | eno2 link · bridge count |
| Frontier | “Cloud: Off” or “Frontier: Connected” | provider name |

**Critical:** Egress paused must **not** read as error — cognition continues ([File 1 banner copy](c:\Users\ankur\Downloads\flight_command_os.tsx) was correct).

---

## 9. Adoption, stickiness & retention

### Hook model applied to CurXor ([Nir Eyal · habit research](https://medium.com/@marketingtd64/how-habit-forming-design-impacts-long-term-user-retention-1691cd7318f1))

| Phase | CurXor mechanism |
|-------|------------------|
| **Trigger** | Morning open → feed shows overnight work (internal trigger) |
| **Action** | Scan feed · tap approve · open claw |
| **Variable reward** | Different claw wins each day — outreach sequenced · capital signal · creator draft |
| **Investment** | Configure rules · mint claw · Kin profiles — increases switching cost healthily |

### Notification strategy ([Eleken notification UX 2026](https://www.eleken.co/blog-posts/notification-ux))

**Do not** push-notify every claw event. Research shows alert fatigue → disable all → product dies.

| Mode | Behavior |
|------|----------|
| **Calm** (Simple default) | In-app feed only · badge on attention queue |
| **Regular** | + Patron Link nudges for approvals only |
| **Power** (Expert) | + optional chime · Cafe handshake events |

**Rules:**
- Batch low-priority events into feed rows  
- Interrupt only for `approval_required` · `go_live.failed` · `eno2.down`  
- Suppress reminders if operator already active in app  
- Snooze / dismiss per claw  

### Daily ritual (stickiness without gamification theater)

1. **Morning:** Home opens to “Since you last visited” (not empty state)  
2. **Midday:** Exception queue if any  
3. **Evening:** Optional digest row in feed — “Today: 12 sequences · 2 drafts · 0 trades”  
4. **Cafe XP** — secondary retention layer; don’t put XP on Home for Alex  

### Activation metrics (measure redesign success)

| Metric | Target signal |
|--------|---------------|
| **D1 return to Home** | Alex finds feed valuable |
| **Time to first approval** | HITL path is obvious |
| **Simple → Expert conversion** | Voluntary depth, not forced |
| **Settings claw toggles** | Freedom without confusion |
| **Preview claw bounce rate** | Honesty grid working (low false expectations) |
| **Patron dock usage** | Conduct metaphor lands |

---

## 10. Progressive disclosure (depth without amputation)

[Cubed.cloud control-plane UX](https://cubed.cloud/from-camera-islands-to-control-planes-building-a-better-ux-f): *“Simplicity without depth feels like a toy.”*

| Layer | Content |
|-------|---------|
| **Default (Simple)** | Feed · approvals · Tier A · sovereignty one-liner |
| **One click (Expert)** | Right rail · telemetry · team dots |
| **Drawer (Health)** | Four pillars · mesh · logs |
| **Per-claw** | Full desk · chat · skills · reasoning accordion |
| **⌘K** | Jump anywhere — expert escape hatch |

**Anti-pattern:** Hiding Expert behind multiple settings screens. Toggle in header — one click.

---

## 11. Gap analysis — shipped vs research target

| Capability | Shipped today | Research target |
|------------|---------------|-----------------|
| Layout | Top header + horizontal `AppNav` | Hybrid + left rail (File 1) |
| Home | Claw grid hero | Feed-first (Simple) |
| Approvals | `OsApprovalStrip` on Home | Attention queue · top priority |
| Sovereignty | Expert telemetry strip · Settings | Always-on strip |
| Activity feed | Per-claw logs · inbox | Unified cross-claw feed |
| Honesty | `Soon` suffix · preview banners | Structural tier styling in nav |
| Patron | FAB + `/ask` | + bottom patron dock |
| Event bus | 4 kinds | Extend for feed narrative |
| Experience level | L1–L5 coach | Align Home density with level |

---

## 12. Research-backed requirements (add to build phases)

### UX-1 additions

- [ ] Icon rail 64px collapsed / 256px expanded  
- [ ] Universal band visually distinct from operate (bg `surface` vs `void`)  
- [ ] Touch targets ≥ 44px on rail items  
- [ ] Rename user-facing toggle: Simple / Expert (not “Telemetry”)  

### UX-2 additions

- [ ] Feed row schema: `time · claw · summary · tier · expandable evidence`  
- [ ] Attention queue sorts: approvals → errors → system → info  
- [ ] Calm / Regular / Power notification mode in Settings  
- [ ] “Since you last visit” feed filter on Home  
- [ ] Empty feed honest state: “Your team is ready — enable Outreach sequences to start”  

### UX-3 additions

- [ ] IA governance: new features must map to universal | operate | platform  
- [ ] Quarterly nav audit checklist in docs  

### UX-4 additions

- [ ] Claw workspace grid (HA sections pattern) — 2-col cards, predictable  
- [ ] Creator pipeline stepper (File 2 ingredient)  
- [ ] Capital reasoning accordion (collapsed default)  

### Cross-cutting

- [ ] Every autonomous feed row links to audit evidence (skill id · bridge receipt)  
- [ ] Demo/prod explicit in Expert Health (research: trust dashboards)  
- [ ] Reduce monospace in chrome — audit `font-mono` usage in shell only  

---

## 13. Anti-patterns (research + CurXor specific)

1. **Dashboard as junk drawer** — every metric on Home  
2. **Notification = engagement hack** — ping per claw event  
3. **Spatial mesh default** — Concept 1 in shell  
4. **Top nav feature creep** — current shipped trap  
5. **Amputate power tools** — hide Expert behind maze  
6. **Fake production signals** on Preview claws  
7. **Full mono Bloomberg cosplay** on Simple mode  
8. **Chat as only interface** — agents need desks + feed  
9. **Black-box AI** — no expandable reasoning on outbound actions  
10. **Spinner on local reads** — feed should render from local event log instantly  

---

## 14. Conclusion — does research change direction?

**No.** Research strengthens File 1:

- Left rail for 10+ modules ✅  
- Right status rail for Expert ✅  
- Bottom patron dock ✅  
- Sovereignty always visible ✅  

Research **refines**:

- Home center = feed (Alex homework) not claw grid  
- Agent orchestration = five views mapped to existing pieces  
- Stickiness = morning feed ritual, not push spam  
- Appliance = task sections, conditional UI, kiosk touch  
- Agentic spatial UI = Cafe, not Flight Command  

**Next step:** Execute [FLIGHT-COMMAND-UX-PLAN.md](./FLIGHT-COMMAND-UX-PLAN.md) UX-1 — §12 requirements merged into plan master checklist.

---

## References

| Source | Topic |
|--------|-------|
| [Ink & Switch — Local-first](https://www.inkandswitch.com/essay/local-first/) | Sovereignty ideals |
| [Smashing — Local-first architecture 2026](https://www.smashingmagazine.com/2026/05/architecture-local-first-web-development/) | Trust · on-device AI |
| [Design Pixil — SaaS navigation](https://designpixil.com/blog/saas-navigation-design-patterns) | Sidebar vs top |
| [DeveloperUX — Internal tools nav 2026](https://developerux.com/2026/05/18/improving-multi-platform-navigation-internal-tools/) | Hybrid · touch |
| [Eleken — SaaS dashboards](https://www.eleken.co/blog-posts/saas-dashboard-design) | Role-based · F-pattern |
| [Eleken — Notification UX 2026](https://www.eleken.co/blog-posts/notification-ux) | Calm modes · fatigue |
| [Cubed.cloud — Control plane UX](https://cubed.cloud/from-camera-islands-to-control-planes-building-a-better-ux-f) | Progressive disclosure |
| [Lowcode.agency — Agent orchestration dashboard](https://www.lowcode.agency/blog/how-to-build-an-ai-agent-orchestration-dashboard-for-complex-workflows) | Five views |
| [Home Assistant — Dashboard chapters](https://www.home-assistant.io/blog/2024/03/04/dashboard-chapter-1/) | Sections · task-driven |
| [13-universal-ui-design.md](../guides/13-universal-ui-design.md) | CurXor prior art |
| [FLIGHT-COMMAND-UX-PLAN.md](./FLIGHT-COMMAND-UX-PLAN.md) | Execution phases |
