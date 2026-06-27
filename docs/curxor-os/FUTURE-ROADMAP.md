# CurXor OS — Future Roadmap (ideas capture)

> **Room:** Vision & Strategy — structure ideas here; **no build** in this chat  
> **Build freeze:** Until on-device golden path passes · see [PRE-UNBOX-48H.md](./PRE-UNBOX-48H.md)  
> **Shipped / active sequencing:** [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md)  
> **Owner:** Ankur (what matters) · CTO agent (structure + gates)  
> **Last updated:** June 2026

---

## How to use this doc

1. **Capture** — drop ideas under the right lane; one idea = one block.
2. **Gate** — every idea needs a **trigger** (when we're allowed to build it).
3. **Hand off** — when unblocked, copy the block into an Agent build chat; mark **handed-off** here.
4. **Don't duplicate shipped work** — check DAY-ONE-BUILD-PLAN first (BP0–BP4, Cafe C4–C13, Tier C sweep are done on dev).

### Idea block template

```markdown
### [IDEA-XXX] Short title
- **Lane:** (see lanes below)
- **Priority:** P0 · P1 · P2 · P3
- **Trigger gate:** G0–G4 (see gates)
- **Outcome:** One sentence — done when…
- **Notes:** Optional — dependencies, honest GTM, out of scope
- **Status:** captured | scoped | handed-off | shipped | dropped
```

---

## Build gates (when ideas become build chats)

| Gate | Meaning | Unlocks |
|------|---------|---------|
| **G0** | Dev `pre-unbox:gate` green | Bug fixes only · no new features |
| **G1** | On-device `qa-smoke` pass | Appliance-specific fixes · golden-path docs |
| **G2** | **v1.0.0** tagged after G1 | OTA · factory USB · runtime BP5 |
| **G3** | Appliance demo captures | Storefront · investor assets |
| **G4** | Operator UAT smile on hardware | Tier C depth · rebrand · fundraise narrative |

**Current state:** G0 target · **G1 blocked** until MS-S1 MAX session.

---

## Roadmap programs (multi-lane · post-hardware)

Ordered initiatives after golden path. Each has a **spec doc** + **phased waves** for build chats.

| Program | ID | Priority | Start gate | Spec | Waves |
|---------|-----|----------|------------|------|-------|
| **Inter-Claw Handshakes** | HS | **P1** | G2 | [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md) | H1–H6 below |
| **Signal AI Device Hub** | SIG | **P2** | G4 | [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md) | SIG1–SIG6 · AD nested |
| **Firecrawl Web Context** | FC | **P1** | G2 | [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md) | FC1–FC6 |
| **Grok ecosystem** | GK | **P2** | G2 | [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md) | GK1–GK6 |
| Build Plane runtime | BP5 | P1 | G2 | [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md) | B01–B05 |
| **Build Plane delegation board** | BP6 | **P2** | G2 | [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md) · § [IDEA-B06](#idea-b06-delegation-board-ui-kanban) | BP6 |
| **Build Plane Spaces** | BP7 | **P2** | G2 | [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md) · [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) · § [IDEA-B07](#idea-b07-build-spaces-repo--shared-context) | BP7 |
| **Gamer Claw** | GM | **P2** | G2→G4 | [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md) | GM0–GM8 |
| **OS layers + Forge Fusion** | OL / FF | **P1** | G2 | [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) | OL1–OL4 · FF0–FF5 |
| **Kin → mapper (universal)** | OL-Kin | **P1** | G2 | [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) · § Roster below | OL-Kin1–OL-Kin2 |
| **Estate Claw** (Legal · Property · Tax) | ES | **P2** | G4 | § [IDEA-ES0](#idea-es0-estate-claw--legal--property--tax) | ES0–ES2 |
| **Learn Claw** (tutor desk) | LR | **P2** | G4 | § [IDEA-LR0](#idea-lr0-learn-claw--tutor-desk) | LR0–LR1 |
| **Patron Link (mobile)** | MO | **P2** | G3 | [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md) | MO0–MO6 |
| **Patron Ask (chat UI)** | CH | **P2** | G3 | [PATRON-CHAT-UI.md](./PATRON-CHAT-UI.md) | CH0–CH5 · MA-COS |
| **Loop GTM narrative** | GTM-LOOP | **P0** | G3 | `../curxor storefront/docs/LOOP-POSITIONING.md` | G11–G12 |
| **Master AI horizontal (Chief of Staff)** | MA-COS | **P2** | G4 | § [IDEA-C07](#idea-c07-chief-of-staff--master-ai-horizontal-generic-ops) | COS0–COS2 |
| **Vital — Insurance / Medicare** | VT-IN | **P2** | G4 | § [IDEA-E09](#idea-e09-vital--insurance--medicare-extension) | VT-IN0–VT-IN2 |
| **Claw Commons (forums + Clawverse)** | CL | **P3** | G4→G5 | [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) · [IDEA-G14](#idea-g14-operator-forum-storefront) · [IDEA-H04](#idea-h04-claw-commons--clawverse-federated-social) | CL0–CL5 |
| **Open-Weight Compute Ladder** | HW | **P1** (narrative) · **P2** (Pro) · **P3** (Studio) | G1→G3→G4 | [COMPUTE-LADDER.md](./COMPUTE-LADDER.md) · IDEA-H05 | HW0–HW3 |
| Golden release | GR | P0 | G1→G2 | IDEA-A01–A02 · [UPDATE-DELIVERY](./UPDATE-DELIVERY-ROADMAP.md) | UP0–UP2 · Tag · USB |
| Tier C unlock | TC | P2 | G4 | IDEA-E01–E04 | Per-claw go-live |

### Program UP — Update & patch delivery (nested GR)

**Vision:** Safe OTA + USB recovery for paying operators — backup · verify · rollback · Settings UI · CI-signed releases.  
**Foundation:** `ota-updater.sh` **already shipped** — see [08-ota-updates.md](../guides/08-ota-updates.md).  
**Status:** UP0 at G1 · UP1–UP2 at G2 (ship with v1.0.0).

| Wave | Scope | Gate |
|------|-------|------|
| **UP0** | MS-S1 OTA smoke + rollback test | G1 |
| **UP1** | CI release · signed manifest · `releases.curxor.ai` | G2 |
| **UP2** | Settings **Updates** — Check / Install / log | G2 |
| **UP3** | stable/beta channel · defer | G2+ |
| **UP4** | `ota.available` → Patron Link + Cafe | G3 |
| **UP5** | One-click rollback UI | G3+ |
| **UP6** | Migration scripts in post-update | G3 |
| **UP7** | Manifest ed25519 verify | G3+ |
| **UP8** | Factory USB = latest stable (IDEA-A03) | G2 |

**Spec:** [UPDATE-DELIVERY-ROADMAP.md](./UPDATE-DELIVERY-ROADMAP.md)

### Program HS — Inter-Claw Handshakes (slotted)

**Vision:** Leverage (real handoffs) + Discover (suggest try another Claw) · Cafe bro-hug · brightness · affinity XP · optional chime.  
**Full matrix:** 9×9 directed paths · persona journeys · growth-level gating · ascension tie-in (G2–G6).  
**Status:** **scoped** — ready for build chat after G2; H5/H6 after G4/G5.

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **H1** | Path registry + 5 ● paths: Cap→Cre (fintwit), Cre→Work, Work→Cre, Vital→Kin, Forge→parent | G2 | `handshake-paths.ts` + triggers fire on dev QA |
| **H2** | Discover UI — coach bubble + agent assist + dismiss/snooze | G2 | User sees Capital→Creator nudge; no auto-nav |
| **H3** | Cafe ceremony — meet zone, bro-hug sprites, brightness pulse, affinity XP, optional chime | G2 | `claw.handshake` event animates two Claws in pixel room |
| **H4** | Leverage payloads — top 10 paths (CCP publish + handoff fns) | G3 | Creator draft pre-fill from Capital intel, etc. |
| **H5** | Full 9×9 matrix + Tier C honest Discover copy | G4 | All ● and ○ paths in registry |
| **H6** | Master AI multi-claw weekly bundles (G5+) | G5 | Patron brief suggests 2-claw plan with confirm · extends **MA-COS** COS2 |

**H1 launch paths (●):**

| Path ID | From → To | Mode |
|---------|-----------|------|
| `fintwit_influencer` | Capital → Creator | Discover + Leverage |
| `inbound_to_pipeline` | Creator → Work | Leverage |
| `brand_from_outbound` | Work → Creator | Discover |
| `household_health` | Vital → Kin | Discover |
| `mint_handshake` | Forge → parent claw | Leverage |

**Parking lot (HS delight — post H3):** handshake streak badge · Capital×Arbitrage arm-wrestle easter egg · couples Kin path · teen Creator guardrails.

**Build chat handoff template:**

```
Sprint: HS-H1 Inter-Claw path registry
Goal: Five ● handshake paths fire Discover/Leverage + emit claw.handshake
Done when: qa:local + manual Capital→Creator nudge + Cafe celebrate hook
@ docs/curxor-os/INTER-CLAW-HANDSHAKES.md
@ pillar-4-dashboard/lib/claw-mesh-protocol.ts
@ pillar-4-dashboard/lib/work-handoff.ts
Out of scope: H3 animation polish, Tier C live bridges, full matrix
```

### Program FC — Firecrawl Web Context Bridge (slotted)

**Vision:** eno2-gated web search/scrape/interact for Operate Claws · BYOK · feeds CCP + Program HS.  
**First use case:** **FC-UC-01** Work Clay-style enrichment (`enrich_lead` + site scrape) — not Arbitrage-only.  
**Status:** **scoped** — FC1–FC3 at G2; FC4–FC6 at G3–G4.

| Wave | Scope | Gate |
|------|-------|------|
| **FC1** | `digital.env` key · `FirecrawlScrapeWorker` · receipt SSE | G2 |
| **FC2** | Engine tools + **FC-UC-01** wired to `work-lead-enrichment.ts` | G2 |
| **FC3** | Outbound MCP · **FC-UC-03** Creator URL seed | G2 |
| **FC4** | **FC-UC-02** Capital intel + **FC-UC-04** Arbitrage AB6 | G3 |
| **FC5** | Self-hosted OSS guide · `FIRECRAWL_BASE_URL` | G4 |
| **FC6** | **FC-UC-04** `/interact` with confirm gate | G4 |

**Use case catalog:** [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md) § FC-UC-01–06.

### Program GK — Grok Ecosystem (slotted)

**Vision:** Grok **frontier inference BYOK** + **marketplace SHA-pin pattern** for Forge Skill Packs — **not** Grok Build as Build Plane.  
**Status:** **scoped** — GK1–GK2 at G2; GK3+ at G3–G4.

| Wave | Scope | Gate |
|------|-------|------|
| **GK1** | `xai` in `frontier-providers.ts` | G2 |
| **GK2** | Grok vs Cursor vs Build Plane docs | G2 |
| **GK3** | Forge Skill Pack catalog spec (SHA-pinned) | G3 |
| **GK4** | Chrome DevTools MCP parity note → BP5 | G3 |
| **GK5** | Optional curxor maintainer pack to xAI/Claude catalogs | G4 |
| **GK6** | Grok inference in Capital social-alpha (BYOK) | G4 |

### Program BP — Build Plane runtime + orchestration UX

**Vision:** Optional **Cursor Bridge** on sovereign metal — not GTM, not an IDE. BP0–BP4 **shipped** (Settings, inbound MCP, OS events, worker wizard, delegation list). BP5+ = live runtime on hardware; **BP6–BP7** = orchestration UX patterns validated by category (e.g. Devin Desktop Agent Command Center, Jun 2026) — **steal the board/spaces metaphor, not the editor**.  
**Status:** BP5 scoped · BP6–BP7 scoped · G2+.

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **B01** | Real Cursor OAuth · `buildPlane.linkStatus` live | G2 | Settings link replaces stub |
| **B02** | Live remote worker (SSH probe, not demo) | G2 | Worker online on MS-S1 |
| **B03** | Delegation execution loop (approve → agent run → audit) | G2 | Queue item completes with log |
| **B04** | Inbound MCP write tools + confirm | G2 | Policy-gated writes |
| **B05** | Cursor Automations webhook → OS event bus | G2 | Signed ingress → Cafe ledger |
| **BP6** | **Delegation board UI** — Kanban over `build-delegation-queue.json` | G2 | Columns: Queued · Running · Waiting review · Done |
| **BP7** | **Build Spaces** — repo worktree + shared build context on box | G2 | Founder deploy loop: laptop Cursor + box worker share branch context |

**BP6 detail:** Extend queue statuses beyond `pending | approved | rejected | completed` → add `running`, `waiting_review` (optional `review` sub-step before `completed`). Settings or `/api/build/delegation` board view · Patron Link push hook (MO1). **Not** Flight Command default nav — Build Plane overlay only.

**BP7 detail:** One **Space** per git repo on appliance (e.g. `curxor-os` worktree under `/var/lib/curxor/build-spaces/`). Space bundles: branch, last delegation ids, inbound MCP session hint. Pairs [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) rsync/scp deploy loop. Operate-plane “spaces” (CCP domain bundles) → **MA-COS** COS0 board, not BP7.

**Out of scope:** Full IDE · ACP host in Flight Command · subscription agent layer · storefront “command center” GTM.

**Build chat handoff (BP6):**

```
Sprint: BP6 Delegation board UI
Goal: Kanban view over build-delegation-queue + running/waiting_review statuses
Done when: qa:local + manual drag/resolve + MO approval preview stub
@ pillar-4-dashboard/lib/build-delegation-queue.ts
@ pillar-4-dashboard/components/settings/BuildPlanePanel.tsx
Out of scope: Live Cursor agent execution (B03), operate-plane patron board (COS0)
```

**Parking lot (BP — post BP7):** ACP adapter for third-party agents as Build workers (watch protocol adoption) · Quick Review subagent before `completed` · local+cloud handoff copy in founder cockpit doc.

### Program GM — Gamer Claw (slotted)

**Vision:** **Play · Stream · Make** — Steam, Xbox, PlayStation, mobile, Twitch on one desk; **AI game studio** ships micro-games to eno1 `/play/{id}` and Cafe arcade.  
**Prerequisite:** Founder **Engage → Creator merge** if Gamer becomes OOTB operate claw (preserve ten-desk GTM).  
**Status:** **scoped** — GM0 at G2 decision · GM1–GM4 at G4+.

| Wave | Scope | Gate |
|------|-------|------|
| **GM0** | Claw slot decision · `/my-game` stub · Tier C honest card | G2 |
| **GM1** | Session journal · manual library | G4 |
| **GM2** | **Steam** bridge — library + playtime | G4+ |
| **GM3** | **Twitch** — OAuth · go live · EventSub | G4+ |
| **GM4** | **Studio M1** — AI Phaser micro-game → LAN deploy | G4+ |
| **GM5** | **Xbox** library + presence | G5 |
| **GM6** | Cafe arcade station · leaderboards | G5 |
| **GM7** | Godot jam via Build Plane | G5 |
| **GM8** | PlayStation trophy link (honest tier) | G5+ |

**Spec:** [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md)

### Program FF — Forge Fusion (nested HS + Forge)

**Vision:** Two operate claws + sustained handshake → **Forged specialist** (the “baby”) · **Forge delivers** · **Cafe celebrates birth**.  
**Status:** scoped · FF0 with OL1 at G2.

| Wave | Scope | Gate |
|------|-------|------|
| **FF0** | OS layer fix · Cafe ≠ claw nav | G2 |
| **FF1** | `parentLineage` on forged-apps | G3 |
| **FF2** | **v1 fusion** — Cap×Cre · Work×Cre · Vital×Kin | G4 |
| **FF3** | Cafe birth ceremony | G4 |
| **FF4** | Auto-draft recipes (14-day pattern) | G5 |

**Spec:** [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md)

### Program SIG — Signal Claw · The Neural Link (locked)

**Vision:** **Orchestration engine** for every AI interface — robots, glasses, VR, smart home, voice, vehicles. **Universal app** · not in the ten.  
**GTM:** *What is the next interface? Wrong question.* · *Interfaces drift. Your desk conducts.*  
**Status:** scoped · G4+.

| Wave | Scope | Gate |
|------|-------|------|
| **SIG0** | Humanoid preview (five tabs) | Shipped Tier C |
| **SIG1** | `deviceClass` registry · Fleet filters | G4 |
| **SIG2** | Overlays · glance + VR + ambient ([AD](./DISPLAY-OVERLAY-ROADMAP.md)) | G4+ |
| **SIG3** | Unified Push skills · CCP `hardware.*` | G4 |
| **SIG4** | Smart home hubs ([HOME-AUTOMATION](./HOME-AUTOMATION-BRIDGES.md)) | G4+ |
| **SIG5** | Vehicle class · Swarm bridge | G5 |
| **SIG6** | Forge custom device → Fleet | G5 |

**Spec:** [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md) · layers [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) · mobile [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md)

### Program MO — Patron Link (mobile)

**Vision:** Limited **pull** (brief, health, approvals preview) + **push** (confirm queue, nudges) · PWA `/m` · Signal `patron_mobile` · LAN pair · no CurXor cloud.  
**Status:** scoped · MO0–MO1 at G3.

| Wave | Scope | Gate |
|------|-------|------|
| **MO0** | `/m` shell · QR pair · read-only summary | G3 |
| **MO1** | `/api/os/approvals` + confirm POST | G3+ |
| **MO2** | Push — ntfy on eno1 or FCM BYOK | G4 |
| **MO3** | Kin scoped devices | G4+ |
| **MO4** | Channels quick reply | G4+ |
| **MO5** | Tailscale away-from-home guide | G4+ |
| **MO6** | Optional native shell | G5 |

**Spec:** [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md)

### Program MA-COS — Chief of Staff (Master AI horizontal)

**Vision:** Generic ops — cross-claw triage, priorities, follow-ups, unified inbox — surfaced through **Master AI patron**, not a FRE-selectable operate claw. Rides **OpenClaw-class** agent runtime (channels, heartbeat, workspace memory) + CCP + approval queue. Sovereign answer to horizontal “do everything” assistants: patron **orchestrates** vertical desks with confirm gates.  
**Status:** scoped · G4+ · redirected from REJ-02. **COS0** includes **Patron ops board** (operate-plane Kanban — distinct from Build Plane BP6).

| Wave | Scope | Gate |
|------|-------|------|
| **COS0** | Patron brief **ops layer** + **Patron ops board** — columns: Needs you · In progress (Claw) · Waiting confirm · Closed; top 3 actions, snooze | G4 |
| **COS1** | Channels + `/api/os/approvals` triage in patron flyout; tie to HS Discover | G4+ |
| **COS2** | Delegation suggest → operate handoffs + optional Build Plane queue (confirm) | G5 |

**COS0 board feeds from:** OS approvals · channel inbox · Claw queue summaries (CCP scopes) · HS Discover snoozes. **Not** coding-agent sessions — that is **BP6**.

**Pairs:** IDEA-C02 (patron chamber) · HS H6 (multi-claw weekly bundles) · MO approvals pull · IDEA-C07 · **CH** [PATRON-CHAT-UI.md](./PATRON-CHAT-UI.md).

### Program CH — Patron Ask (universal chat UI)

**Vision:** Messenger **FAB → sheet → expanded → fullscreen** · one patron thread · routes to Claws · MA-COS backend. Replaces orphaned `MasterClawSidebar` PoC.  
**Status:** **CH0–CH5 shipped** (Jun 2026) · horizon: streaming · expanded dock panel.

| Wave | Scope | Gate | Status |
|------|-------|------|--------|
| **CH0** | FAB + sheet · local LLM | G3 | **Shipped** |
| **CH1** | Route `appId` context | G3+ | **Shipped** |
| **CH2** | Fullscreen `/ask` + ops board stub | G4 | **Shipped** |
| **CH3** | Inline approval cards | G4+ | **Shipped** |
| **CH4** | Patron Link Ask tab (`/m/ask`) | G4+ | **Shipped** |
| **CH5** | Multi-claw weekly UI | G5 | **Shipped** |

**Spec:** [PATRON-CHAT-UI.md](./PATRON-CHAT-UI.md)

### Program VT-IN — Vital Insurance / Medicare extension

**Vision:** Coverage, Medicare context, and benefits awareness **inside Vital** — extends longevity protocol hub; not a separate operate claw. Upload EOB / plan PDFs; honest tier (summarize + checklist, not billing agent).  
**Status:** scoped · G4+ · redirected from REJ-03.

| Wave | Scope | Gate |
|------|-------|------|
| **VT-IN0** | Plan vault tab — policy / EOB upload, coverage-gap summary | G4 |
| **VT-IN1** | Medicare Parts A/B/D checklist + open-enrollment reminders | G4+ |
| **VT-IN2** | Wearables + coverage correlation (CGM, RPM, supplemental) | G5 |

**Pairs:** IDEA-E04 (Vital production) · handshake Vital→Kin (household dependents).

### Program GTM-FILM — "Next Interface" narrative (storefront · scoped)

**Vision:** Category film reframing the interface gold rush — devices drift without purpose; CurXor on the desk orchestrates through eno1/eno2 and Signal Claw (The Neural Link). Not a dunk on competitors; archetypes only.  
**Interim (shipped):** `/signal` on curxor.ai — `SignalHorizonVisual` concept illustration + preview honesty.  
**Status:** scoped · tied to Program SIG reveal at G4.

| Wave | Scope | Gate |
|------|-------|------|
| **FILM0** | Static horizon visual + `/signal` landing copy | Shipped Jun 2026 |
| **FILM1** | 15–20s desk loop (eno1/eno2 pulses, real Flight Command capture) | G2 |
| **FILM2** | Drift montage stills or short clip (pin · VR · robot · pod archetypes) | G3 |
| **FILM3** | Full 45–60s narrative + 6s/15s social cuts · homepage embed | G4 (product reveal) |

**Payoff line (locked):** *The next interface isn't a device. It's the orchestrator on your desk.*

**Out of scope until G4:** Named products, pairing claims, Vision Pro/Quest WebXR demos in GTM.

### Program AD — Display surfaces (nested under SIG2)

**Vision:** Glance + **VR** inside **Signal Claw** — Meta/Snap glasses · **Apple Vision Pro** · **Meta Quest** · ambient web · Kin-aware.  
**Flagship VR:** **Meet your Claws in VR** — `/display/cafe` portal · handshake ceremonies · patron avatar. [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)  
**Status:** **scoped** — AD7–AD10 · G4+.

| Wave | Scope | Gate |
|------|-------|------|
| **AD1** | Overlays tab · compositor (glance + **VR layout modes**) | G4 |
| **AD2** | Meta Ray-Ban Web App glance URL | G4 |
| **AD3** | Push Glance · CCP · Kin policy | G4 |
| **AD4** | Schedules + morning brief | G4+ |
| **AD5** | Snap SPECS Lens scaffold | G4+ |
| **AD6** | Live Claw triggers with confirm | G5 |
| **AD7** | **VR portal** — Cafe room loads in headset | G4+ |
| **AD8** | **Meet Claws** — proximity inspect · patron menu | G4+ |
| **AD9** | **VR ceremonies** — handshake bro-hug · OS brief room | G5 |
| **AD10** | **Shared Cafe** — household multi-patron (stretch) | G5+ |

**Spec:** [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) · [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md) · [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)

### Program CL — Claw Commons (forums + Clawverse)

**Vision:** Two related surfaces, **storefront-first** for discovery, **appliance-optional** for depth:

| Surface | Who posts | Primary host | Job |
|---------|-----------|--------------|-----|
| **Operator Forum** | Humans (owners, builders, prospects) | `curxor storefront` | Trust, support, show-and-tell, pre-purchase questions |
| **Claw Commons** | Opt-in **persona claws** only | Storefront observe + federated relay | Moltbook-class *agent social* — but bounded, sovereign, CurXor-flavored |

**Claw Commons arc:** Personal **Claw Cafe** gains a **portal door** (pixel room or VR) → operator sends selected Claws to the **Clawverse** → they meet **Universal Claws** (CurXor OOTB archetypes) + **federated claws** from other boxes (persona capsules, not full SOUL/TOOLS dumps). Autonomous claw-to-claw chat is **opt-in**, **ascension-gated**, and **never** executes trades/posts without operator confirm.

**Inspiration:** [Moltbook](https://moltbook.forum/) (OpenClaw agent social · humans observe). **CurXor delta:** personal Cafe stays offline-first; Commons is explicit egress; no “agent internet” bundled in $3,999.

**Status:** **captured** — CL0 copy at G3 · federation CL3+ at G5 · not GTM until traction + moderation story.

| Wave | Scope | Gate |
|------|-------|------|
| **CL0** | Storefront **Operator Forum** — categories, human posts, mod queue, link from footer not hero | G3 |
| **CL1** | **Persona capsule** schema — public claw card (name, title, tone, ascension tier, allowed topics); no secrets | G4 |
| **CL2** | Cafe **portal door** UI — “Venture out” from pixel room; preview Universal Claws locally | G4+ |
| **CL3** | **Claw Commons relay** — opt-in publish/subscribe; eno2-classified egress; revoke anytime | G5 |
| **CL4** | Bounded **autonomous claw social** — local LLM on relay or scheduled sync; rate limits + moderation | G5+ |
| **CL5** | **VR Clawverse** — same commons in `/display/cafe` · pairs AD7–AD9 | G5+ |

**Sovereignty rules (non-negotiable):**

1. Appliance works **fully offline** — Commons never required.
2. Default Cafe bubbles = **real activity summaries**, not hallucinated banter (extends CLAW-CAFE-PRD).
3. Federated publish = **operator toggle** + tier gate (Consciousness+ suggested).
4. **Universal Claws** are CurXor-curated reference personas — not user PII.
5. Storefront **observe mode** for humans (like Moltbook) + Operator Forum for human participation.

**Pairs:** AD10 Shared Cafe (household LAN) · HS handshakes · MA-COS patron brief · MO Patron Link (approve venture-out) · IDEA-G11 loop narrative · [IDEA-G14](#idea-g14-operator-forum-storefront) · [IDEA-H04](#idea-h04-claw-commons--clawverse-federated-agent-social).

**Out of scope until G5+:** Token/karma economies · uncensored agent manifestos · full SOUL replication · Commons as default OpenClaw onboarding path.

---

## Lanes

| Lane | What belongs here |
|------|-------------------|
| **A — Hardware & golden path** | Install, ROCm, mesh, OTA, factory image |
| **B — Build Plane** | Cursor Bridge runtime (post-BP4 UI) |
| **C — Claw Cafe & Master AI** | Spatial, ascension, patron, device orchestration arc |
| **D — Flagship claws** | Work · Creator · Capital · Forge depth |
| **E — Tier C** | Arbitrage · Signal · Swarm · Vital (preview → live) · Estate · Learn (post-G4) |
| **F — OS shell & infra** | FRE · Settings · CCP · security · CI |
| **G — GTM & storefront** | Copy · captures · pricing · founder page (cross-repo) |
| **H — Strategic** | Custom hardware · partners · multi-year north star |
| **U — Universal OS** | Cafe · Signal · Kin · shell · CCP · platform map — [UNIVERSAL-OS-LAYER.md](./UNIVERSAL-OS-LAYER.md) |

---

## A — Hardware & golden path

### [IDEA-A01] Golden path addendum from unbox session
- **Lane:** A
- **Priority:** P0
- **Trigger gate:** G1
- **Outcome:** `01-installation.md` addendum has real NIC names, ROCm notes, and GOLDEN PATH NOTES from `verify-unbox-day.sh`.
- **Notes:** Paste script output; do not guess before session.
- **Status:** captured

### [IDEA-A02] v1.0.0 + OTA manifest
- **Lane:** A · F
- **Priority:** P0
- **Trigger gate:** G2
- **Outcome:** Signed OTA artifacts; `ota-updater.sh` smoke on appliance; `version.json` → 1.0.0 stable.
- **Notes:** Program **UP1** · [UPDATE-DELIVERY-ROADMAP.md](./UPDATE-DELIVERY-ROADMAP.md). Closes FEATURE-FUNCTION P1 gap.
- **Status:** captured

### [IDEA-A03] Factory USB golden image
- **Lane:** A
- **Priority:** P1
- **Trigger gate:** G2
- **Outcome:** Reproducible USB image from proven clean-install path — not vendor mystery ISO.
- **Status:** captured

### [IDEA-A04] Appliance exit-demo re-capture
- **Lane:** A · G
- **Priority:** P1
- **Trigger gate:** G1 (min) · G3 (polish)
- **Outcome:** Screenshot/video pack from box IP for demo-pack + storefront.
- **Status:** captured

### [IDEA-A05] On-box local display operator path
- **Lane:** A · F
- **Priority:** P3
- **Trigger gate:** G1 (document) · G4 (polish if operators adopt)
- **Outcome:** Operator can run Flight Command from Firefox/Chromium on the MS-S1 (`http://127.0.0.1:3080`) — FRE + Claws without a laptop; `curl …/api/setup/status` as on-box health check.
- **Notes:** **Optional path only** — not prioritized vs laptop-on-eno1 golden path. **Not storefront/GTM** until explicitly promoted at G3+. Manual browser: [07-flight-command-dashboard.md](../guides/07-flight-command-dashboard.md). **Kiosk v1** (tty1 autologin + Chromium fullscreen): [19-kiosk-mode.md](../guides/19-kiosk-mode.md) · `install-kiosk-mode.sh`.
- **Status:** captured (docs + kiosk v1 scripts)

---

## B — Build Plane (post-BP4 runtime)

> BP0–BP4 **shipped** (v0.9.1): Settings, inbound MCP read, OS events, worker wizard, delegation UI.  
> BP5+ is **runtime** — connect for real on proven hardware.

### [IDEA-B01] Real Cursor OAuth
- **Lane:** B
- **Priority:** P1
- **Trigger gate:** G2
- **Outcome:** Settings link flow replaces stub; `buildPlane.linkStatus` reflects real Cursor session.
- **Notes:** Not GTM; power-user overlay only.
- **Status:** captured

### [IDEA-B02] Live remote worker (not demo mark-online)
- **Lane:** B
- **Priority:** P1
- **Trigger gate:** G2
- **Outcome:** SSH probe → worker online on MS-S1; wizard steps persist on appliance.
- **Status:** captured

### [IDEA-B03] Delegation execution loop
- **Lane:** B · C
- **Priority:** P1
- **Trigger gate:** G2
- **Outcome:** Queue item approved → Cursor agent runs task → audit log written to `/etc/curxor`.
- **Notes:** Requires B01 + ascension G5+ gates already in policy.
- **Status:** captured

### [IDEA-B04] Inbound MCP write tools
- **Lane:** B
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** `allowWriteTools` + confirm UI; scoped writes per `build-plane-bridge-policy.ts`.
- **Notes:** Explicitly out of default path; sovereignty rule #5.
- **Status:** captured

### [IDEA-B05] Cursor Automations webhook ingress
- **Lane:** B
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** Signed inbound webhooks from user's Cursor account → OS event bus → Cafe ledger.
- **Status:** captured

### [IDEA-B06] Delegation board UI (Kanban) · Program **BP6**
- **Lane:** B · F
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** Kanban over `build-delegation-queue.json` — Queued · Running · Waiting review · Done — in Build Plane overlay (Settings or dedicated panel).
- **Notes:** Queue schema today: `pending | approved | rejected | completed`. Extend with `running`, `waiting_review`. Pattern inspiration: Devin Desktop Agent Command Center (Jun 2026) — **orchestration UX only**. Pairs B03 execution loop · MO1 approval push. **Not GTM** · not default Flight Command nav.
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **BP6** | Board UI + extended statuses + resolve transitions | G2 |

### [IDEA-B07] Build Spaces (repo + shared context) · Program **BP7**
- **Lane:** B · F
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** Per-repo **Space** on appliance — git worktree, branch pin, delegation history — so laptop Cursor + box worker share one build context.
- **Notes:** Devin “Spaces” pattern adapted for sovereign box. Default space: `curxor-os` for founder deploy loop · [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md). Storage under `/var/lib/curxor/build-spaces/` (TBD). Operate CCP “domain bundles” stay in **MA-COS** COS0, not BP7.
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **BP7** | Space registry + one worktree + delegation ↔ space link | G2 |

### [IDEA-B08] Delegation verify sub-loop (maker-checker on Build tasks) · Program **BP6+**
- **Lane:** B
- **Priority:** P2
- **Trigger gate:** G2 (after BP5 worker execution)
- **Outcome:** Optional **verify step** before delegation `completed` — lint/typecheck/smoke sub-agent or script on the changed paths; failures → `waiting_review` not silent complete.
- **Notes:** Trust-loop pattern for Build Plane; operator still approves. Pairs IDEA-B06 Kanban · parking-lot “Quick Review”. **Not** autonomous eno2 verifier for Operate claws (sovereignty: Go Live + approval strip stay human-gated).
- **Status:** captured

---

## C — Claw Cafe & Master AI

> C4–C13 **shipped** on dev. Lane C = polish + north-star arc — not net-new shell.

### [IDEA-C05] Inter-Claw Handshakes (Leverage + Discover) · Program **HS**
- **Lane:** C · D · F · E (H5 Tier C paths)
- **Priority:** P1
- **Trigger gate:** G2 (H1–H3) · G3 (H4) · G4 (H5) · G5 (H6)
- **Outcome:** Claws suggest adjacent claws, pass real handoffs, celebrate in Cafe (bro-hug, brightness, affinity XP, optional chime).
- **Notes:** **Scoped** — see **Program HS** above. Spec: [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md). All paths slotted including parking-lot delight (streak badge, arm-wrestle easter egg, couples/teen paths).
- **Status:** scoped

### [IDEA-C06] VR Cafe — Meet Your Claws (Program AD7–AD10)
- **Lane:** C · E
- **Priority:** P2
- **Trigger gate:** G4+ (AD7–8) · G5 (AD9–10)
- **Outcome:** Step through portal into `/display/cafe` · walk to Claws · handshake ceremonies in VR · optional shared household session.
- **Notes:** [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md). Same `cafe-state` ledger as 2D — not a separate metaverse. BYO Vision Pro / Quest.
- **Status:** scoped

### [IDEA-C01] Pixel sprite art pass
- **Lane:** C
- **Priority:** P2
- **Trigger gate:** G3
- **Outcome:** Replace placeholder rectangles with cohesive pixel art; vision fidelity 3.5 → 4+.
- **Status:** captured

### [IDEA-C08] Patron Ask — universal chat UI (Program CH)
- **Lane:** C · F
- **Priority:** P2
- **Trigger gate:** G3 (CH0–CH1) · G4+ (CH2–CH4)
- **Outcome:** Messenger-style **Ask** FAB on all routes · expand to fullscreen · Master AI patron thread · routes to claw agents.
- **Notes:** [PATRON-CHAT-UI.md](./PATRON-CHAT-UI.md). Replaces unused `MasterClawSidebar`. Not a claw · not Signal. Pairs MA-COS.
- **Status:** **shipped** (CH0–CH5 · Jun 2026)

### [IDEA-C02] Master AI patron brief chamber (G4+ depth)
- **Lane:** C
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** Patron flyout uses real CCP + event ledger for cross-Claw briefings — not static copy.
- **Notes:** C12 shipped shell; this is content + inference depth.
- **Status:** captured

### [IDEA-C03] Physical Claw dock zone (vision mesh)
- **Lane:** C · E
- **Priority:** P2
- **Trigger gate:** G1 + cameras on eno2
- **Outcome:** Yard dock animates when vision frames arrive; honest idle when AWAITING FRAME.
- **Status:** captured

### [IDEA-C04] Infinity → device orchestration arc (multi-year)
- **Lane:** C · H
- **Priority:** P3
- **Trigger gate:** G4
- **Outcome:** Documented phase path: Cafe ascension → Master AI trust → Kin/Vital/Signal device graph.
- **Notes:** North star in [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md); no ship date.
- **Status:** captured

### [IDEA-C07] Chief of Staff — Master AI horizontal (generic ops)
- **Lane:** C · F · H
- **Priority:** P2
- **Trigger gate:** G4 (COS0–COS1) · G5 (COS2)
- **Outcome:** Cross-claw triage, priorities, and follow-ups through **Master AI patron** + OpenClaw agent runtime — not a vertical operate claw.
- **Notes:** **Redirected from REJ-02.** Horizontal ops (inbox unify, “what needs you”, delegation suggest) consumes CCP, channels, approvals, HS handshakes. CurXor ≠ generic chatbot — patron **conducts** Capital/Work/Creator/etc. with confirm. Program **MA-COS**. **COS0 Patron ops board** = operate Kanban (Needs you · In progress · Waiting confirm · Closed) — mirrors category command-center UX without becoming a coding IDE. Build-agent Kanban = **BP6**. Pairs IDEA-C02, HS H6, MO approvals.
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **COS0** | Patron brief ops layer + **Patron ops board** + top 3 actions + snooze | G4 |
| **COS1** | Channels + approval triage in patron flyout | G4+ |
| **COS2** | Delegation suggest → handoffs / Build Plane (confirm) | G5 |

---

## D — Flagship claws

### [IDEA-D01] Work deliverability red-item sweep
- **Lane:** D
- **Priority:** P1
- **Trigger gate:** G1
- **Outcome:** `work-checklist.mjs` clean on appliance; demo path honest without SMTP keys.
- **Status:** captured

### [IDEA-D02] Capital paper trading on appliance
- **Lane:** D
- **Priority:** P1
- **Trigger gate:** G1
- **Outcome:** Paper Alpaca smoke with keys in `digital.env`; demo mode labeled when empty.
- **Status:** captured

### [IDEA-D03] Creator publish loop with real keys
- **Lane:** D
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** One social bridge live on appliance; schedule + publish auditable.
- **Status:** captured

### [IDEA-D04] Forge fleet → Cafe sync completeness audit
- **Lane:** D · C
- **Priority:** P2
- **Trigger gate:** G1
- **Outcome:** Every forged desk event type appears in Cafe ingest + approval bubbles.
- **Status:** captured

### [IDEA-D05] Capital social alpha (fomo.family parity)
- **Lane:** D
- **Priority:** P3
- **Trigger gate:** G4
- **Outcome:** Scoped wave from [SOCIAL-ALPHA-BUILD-PLAN.md](../capital-claw/SOCIAL-ALPHA-BUILD-PLAN.md).
- **Status:** captured

---

## E — Tier C (preview → live)

> **Frozen until G4.** Honest Coming Soon is GTM-correct at $3,999.

### [IDEA-E05] Signal AI Device Hub (Program SIG)
- **Lane:** E · C · F
- **Priority:** P2
- **Trigger gate:** G4 (SIG1–SIG4) · G5 (SIG5–SIG6)
- **Outcome:** Signal = hub for all AI devices — humanoid wave 1; glance/VR/ambient (AD); **home automation hubs** (SIG4); voice/vehicle/Forge later.
- **Notes:** **Locked.** [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md). Home: [HOME-AUTOMATION-BRIDGES.md](./HOME-AUTOMATION-BRIDGES.md). Not Claw #11 per ecosystem.
- **Status:** scoped

### [IDEA-E06] Smart home hub bridges (SIG4)
- **Lane:** E · F
- **Priority:** P2
- **Trigger gate:** G4+ (SIG4a–f)
- **Outcome:** Alexa · Google Home · Apple Home/Matter · Samsung SmartThings linked in Signal Fleet; scenes from Routines with Kin policy + confirm on security devices.
- **Notes:** [HOME-AUTOMATION-BRIDGES.md](./HOME-AUTOMATION-BRIDGES.md). eno2 for cloud hubs · eno1 Matter stretch. BYOK — no bundled subscriptions.
- **Status:** scoped

### [IDEA-E07] Gamer Claw (Program GM)
- **Lane:** E · F · C
- **Priority:** P2
- **Trigger gate:** G2 (GM0 slot decision) · G4+ (GM1–GM4)
- **Outcome:** Unified play desk — Steam/Xbox/Twitch bridges · session journal · AI micro-game studio on LAN · Cafe arcade.
- **Notes:** [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md). **Not a gaming PC.** Engage merge prerequisite for OOTB slot. PSN honest defer.
- **Status:** scoped

### [IDEA-E08] Patron Link mobile companion (Program MO)
- **Lane:** E · F
- **Priority:** P2
- **Trigger gate:** G3 (MO0–MO1) · G4 (MO2–MO5)
- **Outcome:** PWA `/m` · pull brief + approvals · push confirm · LAN pair · optional Tailscale away-from-home.
- **Notes:** [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md). Under Signal · not operate claw. Reuses `/api/os/approvals`.
- **Status:** scoped

### [IDEA-E01] Tier C unlock sequencing
- **Lane:** E
- **Priority:** P2
- **Trigger gate:** G4
- **Outcome:** Ordered go-live per claw — suggest: Vital → Kin → Signal → Swarm → Arbitrage (TBD).
- **Notes:** Each claw needs own LEVELING-BUILD-PLAN + bridge readiness on eno2.
- **Status:** captured

### [IDEA-E02] Arbitrage commerce bridge (eno2)
- **Lane:** E
- **Priority:** P2
- **Trigger gate:** G4
- **Outcome:** First real channel sync per [COMMERCE-BRIDGE-ROADMAP.md](../arbitrage-claw/COMMERCE-BRIDGE-ROADMAP.md).
- **Status:** captured

### [IDEA-E03] Swarm robotaxi horizon → live pairing
- **Lane:** E
- **Priority:** P3
- **Trigger gate:** G4 + partner/API reality
- **Outcome:** VIN registry + geo-fence scaffold; no fake live fleet.
- **Status:** captured

### [IDEA-E04] Vital / Kin production orchestration
- **Lane:** E
- **Priority:** P2
- **Trigger gate:** G4
- **Outcome:** Lab + household flows beyond demo fixture; CCP publish to Master AI.
- **Notes:** Insurance / Medicare → [IDEA-E09](#idea-e09-vital--insurance--medicare-extension) (Program VT-IN), not a separate claw.
- **Status:** captured

### [IDEA-E09] Vital — Insurance & Medicare extension
- **Lane:** E
- **Priority:** P2
- **Trigger gate:** G4 (VT-IN0–IN1) · G5 (VT-IN2)
- **Outcome:** Coverage summaries, Medicare Parts A/B/D context, and benefits checklists inside Vital — extends longevity desk; no separate operate claw.
- **Notes:** **Redirected from REJ-03.** Plan vault (EOB / policy PDF upload), open-enrollment reminders, wearables correlation — honest tier (organize + summarize, not billing or claims agent). CCP `health.*` · handshake Vital→Kin for dependents. Program **VT-IN**.
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **VT-IN0** | Plan vault tab — upload policy/EOB, coverage-gap summary | G4 |
| **VT-IN1** | Medicare checklist + open-enrollment calendar nudges | G4+ |
| **VT-IN2** | Wearables + coverage correlation (CGM, RPM, supplemental) | G5 |

---

## F — OS shell & infra

### [IDEA-F04] Firecrawl digital bridge (Program FC)
- **Lane:** F · D · E
- **Priority:** P1
- **Trigger gate:** G2 (FC1–FC3) · G3–G4 (FC4–FC6)
- **Outcome:** eno2-gated search/scrape/interact via Firecrawl BYOK; **first ship FC-UC-01** Work Clay-style `enrich_lead` (site scrape waterfall after Hunter/Apollo).
- **Notes:** Spec [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md) § use case catalog. Arbitrage AB6 = FC-UC-04 (P2). Synergy HS `fintwit_influencer`.
- **Status:** scoped

### [IDEA-F05] Grok frontier + Skill Pack patterns (Program GK)
- **Lane:** F · B · D
- **Priority:** P2
- **Trigger gate:** G2 (GK1–GK2) · G3–G4 (GK3–GK6)
- **Outcome:** Optional xAI/Grok BYOK inference; SHA-pinned Forge Skill Pack catalog inspired by Grok marketplace — **not** Grok Build as Build Plane.
- **Notes:** [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md). Chrome DevTools plugin → BP5 inspiration.
- **Status:** scoped

### [IDEA-F01] Settings gamification label rename
- **Lane:** F
- **Priority:** P3
- **Trigger gate:** G1
- **Outcome:** “Work gamification” → OS-wide label (controls all XP).
- **Notes:** Marked optional in overnight audit; low risk.
- **Status:** captured

### [IDEA-F02] Production OTA CI job
- **Lane:** F
- **Priority:** P1
- **Trigger gate:** G2
- **Outcome:** CI builds signed manifest + tarball; publishes to release mirror; matches UP1.
- **Notes:** [UPDATE-DELIVERY-ROADMAP.md](./UPDATE-DELIVERY-ROADMAP.md) · pairs IDEA-A02.
- **Status:** captured

### [IDEA-F03] LAN auth coverage audit
- **Lane:** F
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** All mutating routes behind optional `CURXOR_LAN_AUTH_TOKEN` — gap scan.
- **Status:** captured

### [IDEA-F12] Operator activity timeline (Work loop visibility)
- **Lane:** F · D
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** Unified **recent activity** feed on Home or `/home` — last N Claw actions (sent email, trade approved, post queued, Forge mint, channel reply) sourced from os-event log + desk receipts; no dev “run log” jargon.
- **Notes:** Closes gap vs transparency UX (pairs IDEA-G10 live status). Cafe already mirrors visually — this is the **operator-readable** spine. Not a public vanity dashboard.
- **Status:** scoped

### [IDEA-F13] Frontier spend observability (Settings)
- **Lane:** F
- **Priority:** P2
- **Trigger gate:** G2
- **Outcome:** Optional **daily/session token caps** and spend summary when frontier BYOK is enabled — honest “you chose to spend” meter; local inference unaffected.
- **Notes:** Trust-loop complement; no bundled API rent. Pairs inference router metrics.
- **Status:** captured

---

## G — GTM & storefront

### [IDEA-G01] Appliance screenshot on storefront
- **Lane:** G
- **Priority:** P1
- **Trigger gate:** G3
- **Outcome:** One real hardware hero image; no mock UI in $3,999 claims.
- **Status:** captured

### [IDEA-G02] “Ten Claws” honest copy audit
- **Lane:** G
- **Priority:** **P1**
- **Trigger gate:** G2 (with OL1)
- **Outcome:** Storefront + nav: **Ten operate claws** · **Claw Cafe** (universal) · **Signal** · **Kin** (mapper) — see IDEA-G07 when OL ships.
- **Notes:** [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) locked roster.
- **Status:** scoped

### [IDEA-G03] Founder page build-out
- **Lane:** G
- **Priority:** P2
- **Trigger gate:** G3
- **Outcome:** Headshot, press, background per [founder/README.md](../founder/README.md) TBD rows.
- **Status:** captured

### [IDEA-G05] Engage → Creator merge + Cafe layer fix (Program OL)
- **Lane:** G · C
- **Priority:** **P1**
- **Trigger gate:** G2 (OL1 copy) · G4 (OL4 Gamer slot)
- **Outcome:** Cafe = Patron Hall (not operate claw); Engage inbox → Creator; nav/FRE honest; frees roster for Gamer.
- **Notes:** [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md). Pairs IDEA-G02.
- **Status:** scoped

### [IDEA-G06] Forge Fusion — two claws, one specialist (Program FF)
- **Lane:** C · Forge
- **Priority:** P2
- **Trigger gate:** G4 (FF2–FF3)
- **Outcome:** Confirm-gated fusion · **v1: Cap×Cre, Work×Cre, Vital×Kin only** · Cafe birth ceremony.
- **Notes:** [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) § Forge Fusion. Not auto-spawn every hug.
- **Status:** scoped

### [IDEA-G07] Operate claw roster — Estate + Learn (founder locked)
- **Lane:** G · E
- **Priority:** P2
- **Trigger gate:** G4 UAT (build ES/LR after flagship smile)
- **Outcome:** Ten operate claws locked: **Estate** fills #10; **Learn** replaces Kin operate slot; **Kin** → universal mapper (not an employee).
- **Notes:** Rejected alternates → [Dropped / rejected](#dropped--rejected-keep-honest) (REJ-02/03 redirected to MA-COS · VT-IN). Full spec in IDEA-ES0 · IDEA-LR0 · OL-Kin · IDEA-C07 · IDEA-E09.
- **Status:** **scoped**

### [IDEA-ES0] Estate Claw — Legal · Property · Tax
- **Lane:** E · D
- **Priority:** P2
- **Trigger gate:** G4
- **Outcome:** One operate desk `/my-estate` with three lanes (Legal · Property · Tax) — shared vault, one SOUL, lane epithets at L3+; v1 = organize + summarize + draft (no filing, no live MLS).
- **Notes:** Completes wealth stack beside Capital; not three separate claws until G5+ (see REJ-05). Handshakes: Capital→Estate (K-1), Work→Estate (MSA).
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **ES0** | Route, FRE, 3 tabs, demo vault, agent shell | G4 |
| **ES1** | Legal lane — upload, summarize, checklist | G4+ |
| **ES2** | Property + Tax organizers, demo ingest | G5 |

### [IDEA-LR0] Learn Claw — tutor desk
- **Lane:** E · D
- **Priority:** P2
- **Trigger gate:** G4 (after OL-Kin1)
- **Outcome:** Operate desk `/my-learn` — curricula, sessions, progress on metal; learner picker from **Kin mapper**; child guardrails from Kin scopes.
- **Notes:** Replaces Kin in operate ten; Kin is not an employee. Not Khan-at-scale — sovereign tutor v1. Cafe XP from sessions.
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **LR0** | Shell + Kin learner picker + session store | G4 |
| **LR1** | Curriculum + Cafe XP + guardrails | G5 |

### [IDEA-G08] Kin → universal mapper (Program OL-Kin)
- **Lane:** G · F
- **Priority:** P1
- **Trigger gate:** G2+
- **Outcome:** `my-family` = **Kin** household mapper (always on) — not FRE-selectable operate claw; `/my-family` route unchanged; `family-profiles.json` + CCP unchanged.
- **Notes:** Pairs IDEA-G07. Forge fusion Vital×Kin unchanged (mapper + Vital). Cafe: household hearth optional — not Kin-as-employee sprite.
- **Status:** scoped

| Wave | Scope | Gate |
|------|-------|------|
| **OL-Kin1** | `ootb-apps` layer universal · FRE decouple · nav “Household” · copy Kin Claw → Kin | G2+ |
| **OL-Kin2** | Learn Claw reads profiles; QA CCP + Signal guest policy | G4 |

### [IDEA-G04] Claw Cafe rebrand decision
- **Lane:** G · H
- **Priority:** P3
- **Trigger gate:** G4
- **Outcome:** Go/no-go on public “Claw Cafe” naming vs Engage Claw nav label.
- **Notes:** Deferred in CLAW-CAFE-PRD until G4+ GTM test.
- **Status:** captured

### [IDEA-G09] GTM-ECON-02 — API rent → OSS on metal (narrative ammo)
- **Lane:** G · H
- **Priority:** P2
- **Trigger gate:** G3 (investor deck · founder content) · G4 (storefront only if hardware-proven)
- **Outcome:** One honest economics slide + optional founder post: frontier API bills at agent scale → OSS on owned/rented compute → CurXor = **buy GPU once, $0/mo operate inference**.
- **Notes:** Category moment (Jun 2026): Ben Cera / Polsia public pivot after $1M+/mo API · **not** Polsia partnership or co-brand. Different layer: Polsia = cloud autopilot factory · CurXor = sovereign desk. No “100x” claims without MS-S1 token/$ data from G1. Pairs [COMPUTE-LADDER.md](./COMPUTE-LADDER.md) · IDEA-H05.
- **Status:** captured

### [IDEA-G10] GTM-LIVE-01 — Honest appliance live status
- **Lane:** G · F
- **Priority:** P2
- **Trigger gate:** G3 (minimal) · G4 (polish)
- **Outcome:** Public or unlisted **live status** page — Claw heartbeats, local inference %, eno2 health, recent OS events, delegation queue depth — inspired by [polsia.com/live](https://polsia.com/live) **transparency UX**, not spawn-count theater.
- **Notes:** Feeds from `os-event-log.json` · Cafe ingest · `/api/build/status` · scheduler. **No** fake ARR / company counts. Optional founder-only before public. Pairs BP6 board metaphor · IDEA-F12 activity timeline.
- **Status:** captured

### [IDEA-G11] Loop positioning — storefront hero + three-loop section
- **Lane:** G
- **Priority:** **P0** (narrative) · **P1** (ship UI)
- **Trigger gate:** G3 (homepage) · copy usable in deck now
- **Outcome:** Main landing leads with **work · memory · trust loops** — not chat/inference; hero A/B + “How CurXor works” section per `../curxor storefront/docs/LOOP-POSITIONING.md`.
- **Notes:** Doc **shipped** Jun 2026. Pairs IDEA-G01 Cafe capture · IDEA-G02 honest claw audit. **No** dev-tooling vocabulary on hero.
- **Status:** **scoped** (doc shipped · UI pending G3)

### [IDEA-G12] Trust loop graphic — Go Live + approval
- **Lane:** G
- **Priority:** P2
- **Trigger gate:** G3
- **Outcome:** One landing or `/architecture` visual — Go Live checklist → approval strip → eno2 egress; supports $3,999 trust story without naming internals.
- **Notes:** [LOOP-POSITIONING.md](../../curxor%20storefront/docs/LOOP-POSITIONING.md) § Trust loop.
- **Status:** scoped

### [IDEA-G13] `/for-builders` power-user page
- **Lane:** G · B
- **Priority:** P2
- **Trigger gate:** G3+ (copy) · G2+ (honest BP5 features listed)
- **Outcome:** Separate route for **Build Plane** overlay — extend the OS with your dev subscription; **not** linked from main hero pre-G4.
- **Notes:** Pairs BP5–BP7. Avoids confusing $3,999 buyer with IDE/orchestration pitch.
- **Status:** scoped

### [IDEA-G14] Operator Forum (storefront)
- **Lane:** G
- **Priority:** P2
- **Trigger gate:** G3 (MVP) · G4 (mod + integrations)
- **Outcome:** Human community on **curxor storefront** — show-and-tell, support, roadmap; **not** agent-autonomous posting.
- **Notes:** Program **CL** · [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) · pairs [IDEA-H04](#idea-h04-claw-commons--clawverse-federated-agent-social). Footer `/community` — not hero pre-G4.
- **Status:** captured

---

## H — Strategic (multi-year)

### [IDEA-H01] Custom branded hardware fundraise
- **Lane:** H
- **Priority:** P3
- **Trigger gate:** G4 + traction
- **Outcome:** Raise for CurXor-branded box post MS-S1 MAX validation — **Studio tier** on the [Compute Ladder](./COMPUTE-LADDER.md).
- **Notes:** Nested under [IDEA-H05](#idea-h05-open-weight-compute-ladder-hardware--os). Not before G1 golden path.
- **Status:** captured

### [IDEA-H05] Open-Weight Compute Ladder (hardware + OS)
- **Lane:** H · F · A (Pillar 1 inference)
- **Priority:** P1 (narrative G3) · P2 (Pro SKU G4) · P3 (Studio / IDEA-H01)
- **Trigger gate:** G1 (64 GB validated) → G3 (storefront ladder copy) → G4 (Pro 128 SKU live) → G4+ traction (CurXor Studio fundraise)
- **Outcome:** Documented, shippable **compute ladder** — each tier maps to honest open-model class + CurXor OS profile; OS catalog updates without breaking sovereign story.
- **Spec:** [COMPUTE-LADDER.md](./COMPUTE-LADDER.md)
- **Tiers:**
  | Tier | Hardware | Open-model class (local) | CurXor OS |
  |------|----------|---------------------------|-----------|
  | **Standard** | MS-S1 Max 64 GB | Qwen3 8B backbone · Moondream · optional Qwen3.6 MoE | `.env.example` |
  | **Pro** | MS-S1 Max 128 GB | + Qwen3-VL · Qwen3 14B · Qwen3.6 coding MoE · dual hot-load | `compute.env.pro128.example` |
  | **Studio** | CurXor-branded · 256 GB+ UMA | Frontier OSS quants (GLM / DeepSeek-class MoE at usable quant) | Factory profile (TBD) |
- **Waves:**
  | Wave | Scope | Gate |
  |------|-------|------|
  | **HW0** | `COMPUTE-LADDER.md` + FUTURE-ROADMAP · storefront handoff | G0 |
  | **HW1** | `/press` + pricing compare · pi-bench cite · honest footnotes | G3 |
  | **HW2** | Pro 128 live SKU · storefront selector · on-box validation notes | G4 |
  | **HW3** | CurXor Studio spec · fundraise deck · custom box (→ IDEA-H01) | G4+ traction |
- **OS obligations (ongoing):** `LOCAL_LLM_CATALOG` · env templates · `deploy.sh` pull sets · Forge recommend · unbox docs · tier validation on target silicon.
- **Out of scope:** Claiming 64 GB runs 744B models · bundling cloud API · “runs everything” marketing.
- **Status:** **scoped** (Jun 2026 — post Qwen3 stack + pi-bench alignment · doc shipped HW0)

### [IDEA-H02] Cursor / builder strategic optionality
- **Lane:** H · B
- **Priority:** P3
- **Trigger gate:** G4 + legal/pricing clarity
- **Outcome:** Partnership exploration — no GTM claim until terms exist.
- **Status:** captured

### [IDEA-H03] Master AI on personal server (device graph)
- **Lane:** H · C
- **Priority:** P3
- **Trigger gate:** G4+
- **Outcome:** Humanoids · robotaxi · home devices orchestrated from same sovereign metal.
- **Notes:** Vision locked in CLAW-CAFE-PRD; implementation years out. Generic ops / Chief of Staff → [IDEA-C07](#idea-c07-chief-of-staff--master-ai-horizontal-generic-ops) (horizontal layer on patron, not claw #11).
- **Status:** captured

### [IDEA-H04] Claw Commons / Clawverse (federated agent social)
- **Lane:** H · C · G
- **Priority:** P3
- **Trigger gate:** G4 (spec + Cafe portal) · G5 (federation)
- **Outcome:** Opt-in Clawverse — user Claws meet Universal + federated claws; bounded autonomous social; storefront observe + Cafe portal door.
- **Notes:** Moltbook-inspired · Program **CL** · [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) · extends deferred autonomous social in CLAW-CAFE-PRD. Pairs [IDEA-G14](#idea-g14-operator-forum-storefront).
- **Status:** captured

---

## Parking lot (unscoped — add gate when ready)

_Use for raw ideas before lane assignment._

| Date | Idea | Notes |
|------|------|-------|
| Jun 2026 | HS: handshake streak badge | 4 weeks ≥1 handshake · Program HS delight |
| Jun 2026 | HS: Capital×Arbitrage arm-wrestle | Cafe easter egg only |
| Jun 2026 | HS: couples path | Kin → joint Capital+Creator family brand |
| Jun 2026 | HS: teen path | Kin teen → Creator guardrails; no finance Discover until 18+ |
| Jun 2026 | FC: Firecrawl Agent autonomous gather | High credit burn · G4+ |
| Jun 2026 | GK: Forge Skill Pack marketplace UI | After GK3 schema |
| Jun 2026 | FC+GK: unified Web Context Settings panel | Firecrawl + frontier providers |
| Jun 2026 | AD: Quest Horizon native app | Partner horizon · post AD7 web |
| Jun 2026 | AD: VR Cafe Architect secret room | G6 easter egg · AI Agent Cafe pattern |
| Jun 2026 | SIG: Matter controller on eno1 | Sovereign local path · SIG4d stretch |
| Jun 2026 | SIG: Home Assistant bridge | Power-user · eno1 peer |
| Jun 2026 | OL: operate claw slot #10 | **→ IDEA-G07:** Estate #10 · Learn replaces Kin |
| Jun 2026 | GM: Epic Games Store bridge | GM6+ |
| Jun 2026 | GM: Discord Rich Presence | eno2 optional |
| Jun 2026 | GTM-FILM: Next Interface full director's cut | G4 · after SIG1 desk truth + Flight Command capture refresh |
| Jun 2026 | GTM-FILM0: `/signal` horizon visual | Shipped storefront · [curxor.ai/signal](https://curxor.ai/signal) |
| Jun 2026 | BP: ACP adapter for Build workers | Watch Agent Client Protocol adoption · post BP7 · not before G2 |
| Jun 2026 | BP: Quick Review before delegation `completed` | **→ IDEA-B08** · pairs BP6 |
| Jun 2026 | **GTM-LOOP** Loop positioning doc | Shipped `curxor storefront/docs/LOOP-POSITIONING.md` · UI IDEA-G11 at G3 |
| Jun 2026 | **IDEA-F12** Operator activity timeline | Home feed · pairs G10 live status |
| Jun 2026 | **IDEA-F13** Frontier spend caps | Settings · trust loop |
| Jun 2026 | **IDEA-G13** `/for-builders` | Build Plane page · not main hero |
| Jun 2026 | **GTM-ECON-02** API→OSS narrative ammo | Ben Cera $1M/mo → rented GPU pivot · category tailwind · post-G3 investor/deck only |
| Jun 2026 | **GTM-LIVE-01** Honest appliance live status | `/status` or public feed from os-event-log · Polsia `/live` pattern · no vanity ARR · G3+ · pairs IDEA-F12 |
| Jun 2026 | **Program CL** Claw Commons | [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) · Operator Forum (G14) + Clawverse (H04) · Moltbook-inspired · G4–G5 |

---

## Changelog (roadmap doc)

| Date | Change |
|------|--------|
| Jun 2026 | **CLAW-COMMONS-VISION.md** — persona capsule schema, portal UX, moderation policy · Program CL |
| Jun 2026 | **Program CL** — Operator Forum (IDEA-G14) + Claw Commons / Clawverse (IDEA-H04); Moltbook-inspired federated agent social |
| Jun 2026 | **GTM-LOOP** — `LOOP-POSITIONING.md` in storefront; IDEA-G11–G13 · F12–F13 · B08 added from loop gap analysis |

## Dropped / rejected (keep honest)

Operate-claw candidates evaluated Jun 2026 — **not** tenth-desk slots. Some concepts are **redirected** to horizontal or extension programs below.

| ID | Candidate | Disposition |
|----|-----------|-------------|
| **REJ-01** | **Outreach split from Work** | Rejected — Work is flagship outbound desk; Engage merges into Creator, not a new claw. |
| **REJ-02** | **Chief of Staff / generic ops** | **Redirected** → [IDEA-C07](#idea-c07-chief-of-staff--master-ai-horizontal-generic-ops) · Program **MA-COS** (Master AI + OpenClaw horizontal). Not a vertical Claw at $3,999. |
| **REJ-03** | **Insurance / Medicare claw** | **Redirected** → [IDEA-E09](#idea-e09-vital--insurance--medicare-extension) · Program **VT-IN** (Vital extension). Not a tenth operate slot. |
| **REJ-04** | **Fundraise / IR claw** | Rejected — too narrow unless CurXor pivots to founder-only GTM. |
| **REJ-05** | **Real estate + Tax + Legal as three claws** | Rejected as three slots — **one Estate Claw** (three lanes) is enough until G5 → [IDEA-ES0](#idea-es0-estate-claw--legal--property--tax). |

### Target operate ten (when OL-Kin + ES/LR ship)

| # | Claw | Role |
|---|------|------|
| 1 | Capital | Wealth · markets |
| 2 | Work | Outbound · pipeline |
| 3 | Creator | Publish · Engage inbox |
| 4 | Arbitrage | Commerce · margin |
| 5 | Vital | Longevity · **+ Insurance/Medicare ext** (VT-IN, G4+) |
| 6 | **Learn** | Tutor · curricula (uses Kin mapper) |
| 7 | Gamer | Play · stream · make |
| 8 | Swarm | Fleet orchestration |
| 9 | Forge | Mint · fusion |
| 10 | **Estate** | Legal · Property · Tax (one desk) |

**Universal (not in ten):** Claw Cafe · Signal · **Kin** (mapper) · Patron Link (horizon).

---

## References

- OTA & patch delivery: [UPDATE-DELIVERY-ROADMAP.md](./UPDATE-DELIVERY-ROADMAP.md) · operator [08-ota-updates.md](../guides/08-ota-updates.md)
- Active sequencing: [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md)
- Build freeze: [PRE-UNBOX-48H.md](./PRE-UNBOX-48H.md)
- Hardware session: [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md)
- Build Plane vision: [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md) · **BP6 board · BP7 Spaces**
- Founder deploy loop: [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md)
- Cafe north star: [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
- Claw Commons / Clawverse: [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md)
- Inter-Claw handshakes: [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md)
- External bridges (Firecrawl · Grok): [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md)
- Signal AI Device Hub: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
- Home automation bridges: [HOME-AUTOMATION-BRIDGES.md](./HOME-AUTOMATION-BRIDGES.md)
- Patron Ask (chat UI): [PATRON-CHAT-UI.md](./PATRON-CHAT-UI.md)
- Mobile Patron Link: [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md)
- OS layers · Cafe · Forge Fusion: [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md)
- **Universal OS map:** [UNIVERSAL-OS-LAYER.md](./UNIVERSAL-OS-LAYER.md)
- Gamer Claw: [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md)
- VR Cafe meetings: [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)
- Display surfaces (glance/VR): [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md)
- Known gaps index: [FEATURE-FUNCTION.md](../FEATURE-FUNCTION.md) §11
- Loop GTM narrative: [LOOP-POSITIONING.md](../../curxor%20storefront/docs/LOOP-POSITIONING.md) · roadmap IDEA-G11–G13
