# Patron Ask — Universal chat UI (vision capture)

> **Room:** Vision & Strategy · capture only · **no build** until gated  
> **Parent:** **Master AI patron** · Program **MA-COS** [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Related:** [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md) · [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) · [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)  
> **Status:** CH0–CH5 shipped · **Last updated:** June 2026

---

## One-line vision

**Patron Ask** is CurXor’s always-available **chat surface** — a messenger-style bubble you can pop open anywhere, expand to a large panel, or go full screen. One sovereign conversation with your **appliance AI (patron)** that knows CCP, routes to the right Claw, and never pretends to be a cloud chatbot.

**Nav label:** **Ask** (chat icon) — not “Signal” (messenger collision) · not another operate claw.

---

## What exists today (honest)

| Piece | Status | Gap |
|-------|--------|-----|
| **Patron Ask (CH0–CH5)** | **Shipped** — FAB + sheet · `/ask` fullscreen · `/m/ask` mobile · approval cards · weekly bundle | Streaming SSE · expanded docked panel (between sheet/fullscreen) |
| `PatronAskProvider` + APIs | **Shipped** — `/api/patron/chat`, `history`, `context`, `approvals`, `ops-board`, `weekly-bundle` | MA-COS full orchestration · delegation suggest |
| `MasterClawSidebar.tsx` | **Removed** — superseded by Patron Ask | — |
| `ClawAgentConsole` | **Per-claw** chat inside each app | Complement only — not replaced |
| Session `webchat:patron:main` | **Shipped** — channel store persistence | Multi-thread by topic (horizon) |
| Patron Link `/m` | **MO0 shell shipped** — Home · Ask · Act · More | QR pair · Web Push (MO2+) · Kin child scope (MO3) |

**Verdict:** Universal messenger UX **shipped** (CH0–CH5). Horizon: streaming, MO push, deeper MA-COS handoffs.

---

## OS layer placement

Patron Ask is **universal chrome** — like command palette + health drawer, not FRE-selectable:

```text
Flight Command (any route)
    └── Patron Ask FAB (always visible)
            ├── Sheet (messenger popup)
            ├── Expanded panel
            └── Full screen (/ask optional route)
                    └── Master AI patron (MA-COS backend)
                            ├── CCP read (scoped)
                            ├── Route → Claw agent (Work, Capital, …)
                            ├── Approvals suggest (confirm gate)
                            └── Channels inbox rollup (COS1)
```

Not counted in **ten operate claws**. Not **Signal** (devices). The patron **talks**; Signal **conducts** interfaces.

---

## UI states (locked)

| State | UX | Analogy |
|-------|-----|---------|
| **0 — Minimized** | Floating **Ask** button · bottom-right · unread dot | Messenger / Intercom FAB |
| **1 — Sheet** | ~380×520px popup above FAB · drag corner resize (optional) | iMessage mini window |
| **2 — Expanded** | ~480px docked right **or** 50% center sheet · app canvas shrinks | Slack sidebar |
| **3 — Full screen** | `/ask` or overlay · ops board + thread · patron menu | ChatGPT full page |

**Persistence:** State saved in `user-settings` (`patronAskUi: minimized | sheet | expanded | fullscreen`).

**Keyboard:** `⌘/Ctrl + K` stays command palette · **`⌘/Ctrl + J`** → toggle Ask (proposed).

---

## Conversation model

### One thread vs many

| Mode | v1 | Horizon |
|------|-----|---------|
| **Default** | Single **patron thread** (`patron:main`) | Multi-thread by topic |
| **Claw context** | Auto-tag current route `appId` | `@Capital` explicit mention |
| **Handoff** | Patron says “Opening Work…” → deep link | Inline Claw sub-thread |

Session id aligns with channels: `webchat:patron:main` → existing `channels/sessions.json`.

### What patron can do (MA-COS tiers)

| Tier | Gate | Capabilities |
|------|------|--------------|
| **Ask-L0** | G3 | Local LLM chat · CCP summary read · FAQ |
| **Ask-L1** | G4 | Route intent to claw `assistAppAgent` · approval **preview** |
| **Ask-L2** | G4+ | Ops board in fullscreen · inbox triage · HS Discover snooze |
| **Ask-L3** | G5 | Multi-claw weekly plan · Build Plane delegate suggest (confirm) |

**Sovereignty:** Mutating actions always **confirm** — patron proposes, operator approves (ties to `/api/os/approvals`).

---

## API sketch (build chat)

| Route | Purpose |
|-------|---------|
| `POST /api/patron/chat` | Send message · stream SSE reply |
| `GET /api/patron/chat/history` | Thread history |
| `GET /api/patron/context` | Current route · CCP slice · pending approvals count |
| Reuse `POST /api/channels/webchat` | Optional alias — same session store |

Implementation reuses:

- `lib/app-agent-assist.ts` — per-claw routing
- `lib/channels/` — session persistence
- `agent-workspace/_global/USER.md` + `MEMORY.md` — patron memory
- Frontier BYOK when local model insufficient (confirm + receipt)

---

## Visual design

| Token | Use |
|-------|-----|
| Accent `#bc13fe` | Patron message border · FAB ring |
| Mono font | System / tool receipts |
| Avatar | **Patron** — not a Claw sprite (distinct from Cafe characters) |
| Claw replies | Small badge: `WORK` · `CAP` when routed |

**Tone:** Chief of Staff — concise, sovereign, not sycophantic. Mythic optional in Cafe; Ask stays **professional**.

---

## Mobile (Patron Link)

| Desktop | Mobile |
|---------|--------|
| FAB + sheet | **Ask tab** primary (or floating over tabs) |
| Full screen ops board | Simplified **Act + Ask** split |

MO4 quick reply merges into same patron thread when possible.

---

## Relationship to Cafe

| Cafe | Patron Ask |
|------|------------|
| Spatial · XP · ceremonies | Text · triage · commands |
| “Who you’re becoming” | “What needs you now” |
| Pixel room | Messenger thread |

Handshake / ascension → **push toast on FAB** (“Level up — view in Cafe”).

Infinity arc: years of Cafe + Ask thread → trusted G5 delegation.

---

## CH waves (Patron Ask UI — nested MA-COS)

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **CH0** | FAB + sheet shell · wire to local LLM · retire `MasterClawSidebar` PoC | G3 | Ask opens on any route |
| **CH1** | Route context `appId` · expand to right panel | G3+ | “Summarize my Work queue” works |
| **CH2** | Full screen `/ask` · history persist | G4 | COS0 ops board stub in fullscreen |
| **CH3** | Approval preview cards inline · confirm CTA | G4+ | COS1 |
| **CH4** | Mobile Patron Link Ask tab | G4+ | MO parity |
| **CH5** | Multi-claw weekly bundle UI | G5 | COS2 · HS H6 |

Program **CH** pairs **MA-COS** — not separate product.

---

## GTM honesty

| Say | Don't say |
|-----|-----------|
| “**Ask** — your patron on the appliance” | “ChatGPT in the box” (overpromise day one) |
| “Messenger-style · expand when you need depth” | “Replaces every Claw desk” |
| “Local first · BYOK frontier optional” | “Always smartest cloud model included” |

---

## Non-goals

- Autonomous patron acting without confirm (v1)
- Replacing `ClawAgentConsole` inside desks — **complement**, not duplicate
- Public internet chat widget on storefront
- Claw-to-Claw social sim (AgentOffice)

---

## References

- Agent runtime: [18-agent-runtime.md](../guides/18-agent-runtime.md)
- MA-COS: [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) § Program MA-COS
- Mobile: [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md)
- Cafe → Master AI: [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
