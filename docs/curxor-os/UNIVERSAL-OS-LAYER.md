# CurXor OS — Universal layer map

> **Room:** Vision & Strategy · product architecture  
> **Status:** Founder map (Jun 2026) · complements [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) (roster)  
> **Rule:** Universal = **always part of the OS** or **cross-cutting platform** — not one of the ten **operate Claws** (vertical desks).

---

## Stack at a glance

```text
┌─────────────────────────────────────────────────────────────────┐
│  HORIZON — Master AI patron (G5+ · not day-one GTM)              │
├─────────────────────────────────────────────────────────────────┤
│  OPTIONAL OVERLAY — Build Plane / Cursor Bridge (power users)    │
├─────────────────────────────────────────────────────────────────┤
│  UNIVERSAL APPS — Cafe · Signal · Kin · Patron Link              │
├─────────────────────────────────────────────────────────────────┤
│  FLIGHT COMMAND SHELL — Home · FRE · Settings · nav · coach    │
├─────────────────────────────────────────────────────────────────┤
│  PLATFORM — CCP · channels · inference · growth · agent runtime  │
├─────────────────────────────────────────────────────────────────┤
│  APPLIANCE RUNTIME — 4 pillars · eno1/eno2 · OTA · systemd     │
└─────────────────────────────────────────────────────────────────┘
         ▲ operate Claws (ten desks) plug into platform + shell ▲
```

---

## 1. Universal apps (always on · not in FRE “pick employees”)

Surfaces with their own routes; **not** vertical jobs like Capital or Work.

| Surface | Route | Job | Status | Spec |
|---------|-------|-----|--------|------|
| **Claw Cafe** | `/claw-cafe` | Patron Hall — pixel room, ascension, handshakes, XP mirror | **Shipped** (C4–C10) · nav still says “Engage” until OL1 | [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md) |
| **Signal — The Neural Link** | `/optimus` | Device/interface orchestration — robots, VR, smart home, voice | Preview / Tier C · universal in vision | [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md) |
| **Kin** (mapper) | `/my-family` | Household identity — profiles, scopes, devices → CCP | Preview today · **OL-Kin** → universal | [17-kin-claw-family.md](../guides/17-kin-claw-family.md) · IDEA-G08 |
| **Patron Link** | `/m` (vision) | Mobile pull/push companion — confirm, brief, nudge | Scoped · not shipped | [MOBILE-PATRON-LINK.md](./MOBILE-PATRON-LINK.md) |

**Not universal apps:** Engage (fiction) → **Creator** inbox tab; Master AI → horizon patron, not nav claw.

---

## 2. Flight Command shell (OS chrome)

The **operator environment** every Claw shares. Not a “Claw”; the desktop around the desks.

| Feature | Route / entry | Purpose | Status |
|---------|---------------|---------|--------|
| **Home hub** | `/home` | Claw cards, plain-language entry, quick actions | Shipped |
| **FRE / setup** | `/setup` | First-run provisioning, module pick, appearance | Shipped |
| **Settings** | `/settings` | Claw toggles, intelligence (local/frontier/auto), appearance, gamification, Build Plane demo | Shipped |
| **Navigation** | Sidebar / groups | Wealth · Work · Create · Physical · universal strip | Shipped · OL1 reorg pending |
| **Command palette** | `Ctrl+K` | Power-user jump | Shipped |
| **Simple / Expert** | Settings toggle | Hide mesh telemetry, category noise | Shipped |
| **Context hints** | Per-route coach | Dismissible first-task tips | Shipped |
| **Experience coach** | `experience-coach-catalog` | Level-aware nudges across apps | Shipped |
| **Channels inbox** | `/api/channels/inbox` | Unified external sessions (Telegram, Slack, …) | Shipped · routes to Claw desks |
| **Kiosk mode** | tty1 Chromium → `:3080` | Monitor-first boot (optional install) | Scaffold · [KIOSK-MODE-BUILD-PLAN.md](./KIOSK-MODE-BUILD-PLAN.md) |

**Docs:** [07-flight-command-dashboard.md](../guides/07-flight-command-dashboard.md) · [13-universal-ui-design.md](../guides/13-universal-ui-design.md)

---

## 3. Platform services (cross-cutting · no single “app” UI)

Shared machinery operate Claws and universal apps **consume**.

### 3a. Context & identity

| Service | Storage / API | Purpose | Status |
|---------|---------------|---------|--------|
| **Claw Context Protocol (CCP)** | `claw-context.json` · `telemetry/claw_context` | Inter-Claw + hardware context mesh | Shipped |
| **CCP consent** | `ccp-consent.json` · `/api/mesh/consent` | Scope allowlist per publisher/subscriber | Shipped |
| **Kin profiles** | `family-profiles.json` | Who the box knows (→ universal mapper) | Shipped |
| **Global agent memory** | `agent-workspace/_global/` USER.md, MEMORY.md | Operator profile across sessions | Shipped |

**Doc:** [15-claw-context-protocol.md](../guides/15-claw-context-protocol.md)

### 3b. Intelligence & egress policy

| Service | Purpose | Status |
|---------|---------|--------|
| **Inference router** | Local Ollama/vLLM vs frontier BYOK/OAuth | Shipped |
| **Provider link / OAuth** | OpenAI, Google, guided fallbacks | Shipped |
| **Network path tags** | `operate` \| `build` \| `egress` on outbound fetch | Shipped (Build Plane) |
| **eno2 health** | Mesh/egress pause · `eno2.down` events | Shipped (appliance) |

**Doc:** [04-inference-compute.md](../guides/04-inference-compute.md) · [14-frontier-oauth.md](../guides/14-frontier-oauth.md)

### 3c. Agent runtime (OpenClaw-inspired)

| Service | Purpose | Status |
|---------|---------|--------|
| **Per-Claw workspace** | SOUL · TOOLS · HEARTBEAT · skills | Shipped |
| **Scheduler** | `scheduler/jobs.json` · heartbeat runner | Shipped |
| **Channels gateway** | Telegram · Slack · WhatsApp · iMessage · webchat | Shipped |
| **Digital bridges** | eno2 workers (Alpaca, X, commerce, …) | Per-Claw · partial live |

**Doc:** [18-agent-runtime.md](../guides/18-agent-runtime.md) · [12-digital-action-layer.md](../guides/12-digital-action-layer.md)

### 3d. Growth & events

| Service | Purpose | Status |
|---------|---------|--------|
| **Growth level framework** | L1–L5 personas per operate Claw | Shipped |
| **OS growth / ascension** | Cafe G1–G6 titles · cross-app XP | Shipped (Cafe) |
| **OS event bus** | `forge.claw_minted`, `go_live.failed`, `eno2.down`, … | Shipped (BP2) |
| **Inter-Claw handshakes** | Discover + Leverage paths | Scoped · [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md) |
| **Claw Cafe event ingest** | Real app events → pixel room | Shipped |

**Doc:** [GROWTH-LEVEL-FRAMEWORK.md](./GROWTH-LEVEL-FRAMEWORK.md)

### 3e. Forged / extension

| Service | Purpose | Status |
|---------|---------|--------|
| **Forge mint** | `claw-profiles.json` · `forged-apps.json` | Shipped |
| **Dynamic desks** | `/my-claw/[slug]` | Shipped |
| **Forge fusion** | Two parents → specialist child | Scoped · FF program |

---

## 4. Appliance runtime (infrastructure · not Flight Command UI)

Bare-metal services that make “sovereign appliance” true. Operators rarely “open” these; admins and CTO session do.

| Component | Path / unit | Purpose | Status |
|-----------|-------------|---------|--------|
| **Pillar 1 — Compute** | `curxor-compute` · `:11434` | Local LLM (Ollama/vLLM / ROCm) | Shipped |
| **Pillar 2 — Engine** | `curxor-engine` | Physical agent loop (vision → motor) | Shipped |
| **Pillar 3 — Telemetry** | `curxor-telemetry-broker` | ZMQ mesh + digital bridge workers | Shipped |
| **Pillar 4 — Dashboard** | `curxor-dashboard` · `:3080` | Flight Command host | Shipped |
| **Master target** | `curxor-os.target` | systemd group | Shipped |
| **eno1 Command Port** | `10.0.0.1` | Operators · captive portal | Shipped |
| **eno2 Egress + mesh** | `10.77.0.1` | Bridges · robotics · kill-switch story | Shipped |
| **OTA** | `ota-updater.sh` · cron | Update · rollback | Scaffold |
| **Meta-installer** | `install-all.sh` | First deploy | Shipped |
| **Seed / data dir** | `/etc/curxor/` | Operator persistence | Shipped |

**Docs:** [02-architecture.md](../guides/02-architecture.md) · [03-networking.md](../guides/03-networking.md) · [08-ota-updates.md](../guides/08-ota-updates.md)

---

## 5. Optional overlay (not default OS GTM)

| Overlay | Purpose | GTM? | Status |
|---------|---------|------|--------|
| **Build Plane / Cursor Bridge** | Builder egress, delegation queue, MCP inbound | **No** — power users | BP0–BP4 shipped UI · runtime BP5+ gated |

**Doc:** [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md)

---

## 6. Horizon (north star · not universal “app” today)

| Capability | Relationship to universal layer |
|------------|-------------------------------|
| **Master AI** | Patron that **consumes** Cafe ledger + CCP + years of Claw use — emerges G5+, not a twelfth nav icon at launch |
| **Chief of Staff (horizontal)** | Generic ops inside Master AI + OpenClaw runtime — cross-claw triage, not operate claw · [IDEA-C07](./FUTURE-ROADMAP.md#idea-c07-chief-of-staff--master-ai-horizontal-generic-ops) |
| **VR Cafe** | Second renderer for same `cafe-state` · [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md) |
| **Claw Commons / Clawverse** | Optional federated social + storefront forum · portal from Cafe · [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) |
| **Display / glance overlays** | Signal conducts · [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md) |

---

## Universal vs operate Claw (decision tree)

```text
Does it have a vertical job-to-be-done (trade, outbound, publish, tutor, …)?
  YES → Operate Claw (or Forged specialist)
  NO  → Is it always-on for every operator?
          YES → Universal app OR shell feature
          NO  → Platform service OR pillar infra OR optional overlay
```

**Examples:**

| Thing | Classification |
|-------|----------------|
| Capital desk | Operate Claw |
| Learn tutor desk | Operate Claw (#6) |
| Estate (Legal · Property · Tax) | Operate Claw (#10 · one desk) |
| Cafe ascension room | Universal app |
| Kin household profiles | Universal mapper (OL-Kin) |
| Settings appearance | Shell |
| CCP | Platform |
| Ollama on :11434 | Appliance runtime |
| Cursor Bridge | Optional overlay |

---

## Maturity summary

| Layer | Shipped on dev | Blocked on |
|-------|----------------|------------|
| Shell + platform | Mostly yes | — |
| Universal apps | Cafe yes · Signal/Kin preview | OL1 nav truth |
| Appliance runtime | Yes in repo | MS-S1 golden path (G1) |
| Patron Link | No | G3 |
| Claw Commons | No | G3 forum · G5 federation |
| Master AI | Ledger only | G5+ product |

---

## Roadmap cross-links

| Program | Touches universal layer |
|---------|------------------------|
| **OL / OL-Kin** | Cafe · Signal · Kin nav + FRE |
| **MO** | Patron Link |
| **CL** | Claw Commons · Operator Forum · Cafe portal · [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) |
| **HS** | Handshakes · Cafe ceremonies |
| **MA-COS** | Chief of Staff · Master AI horizontal |
| **VT-IN** | Vital insurance / Medicare extension |
| **SIG / AD** | Signal · display surfaces |
| **BP5–BP7** | Build Plane runtime · delegation board · build spaces |
| **MA-COS** | Chief of Staff · patron ops board (operate Kanban) |

Full idea index: [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)

---

## References

- Roster (ten operate): [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) — **Learn #6 · Estate #10 · Kin universal**
- Feature catalog: [FEATURE-FUNCTION.md](../FEATURE-FUNCTION.md)
- Product scope matrix: [FEATURE-FUNCTION.md](../FEATURE-FUNCTION.md) §1–2
