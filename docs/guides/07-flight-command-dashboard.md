# Flight Command User Guide

Pillar 4 is the **Flight Command Desktop** — Next.js captive portal and operator UI (matte black, neon purple `#bc13fe`). This guide covers daily use: Claw agents, local LLM chat, skills, telemetry, and The Forge.

**Quick start:** [00-quick-start.md](00-quick-start.md) · **Print card:** [Operator Quick Reference](../quick-reference/operator-card.md)

## Access

| Mode | URL |
|------|-----|
| Direct | `http://<appliance-ip>:3080` |
| Captive portal (eno1) | Any URL → `http://10.0.0.1` |

Port **3080** (`curxor-dashboard.service`). Inference API stays on `127.0.0.1` only.

## Layout

```
┌─────────────────────┬──────────────────────────────────────┐
│ Master Claw (30%)   │ Flight Command Desktop (70%)         │
│ Command terminal    │ Header · App nav · Telemetry strip   │
│ Active claw badge   │ Workspace (left) · Agent console (right) │
└─────────────────────┴──────────────────────────────────────┘
```

Header: **System Health** (OTA + compute metrics) · **+ Forge** (The Forge wizard)

## Eight Claws + The Forge

Each module is a **domain Claw agent**: workspace + always-on agent panel (chat, skills, activity log). Names match the GTM storefront (Digital Wealth paradigm).

| Route | Display name | Agent | Domain |
|-------|--------------|-------|--------|
| `/claw-forge` | **The Forge** | Forge Master | Mint new Claws — NL, photo, live vision |
| `/my-capital` | **Capital Claw** | Capital Claw | Rules + paper trades (Alpaca bridge) |
| `/my-content` | **Creator Claw** | Creator Claw | Content queue + X publish bridge |
| `/my-work` | **Outreach Claw** | Outreach Claw | Outbound / sequences / CRM-style desk |
| `/my-shop` | **Arbitrage Claw** | Arbitrage Claw | Margin watch / fulfillment desk |
| `/optimus` | **Signal Claw** | Signal Claw | Feeds, alerts, trigger thresholds |
| `/robotaxi` | **Swarm Claw** | Swarm Claw | Multi-Claw workload grid |
| `/claw-cafe` | **Engage Claw** | Engage Claw | DM / thread engagement demos |

Canonical source: `pillar-4-dashboard/lib/ootb-apps.ts` (appliance IDs unchanged for FRE/middleware).

**The Forge** (`claw-forge`) is always reachable — not gated by FRE module selection.

## First Run Experience (FRE)

### Global setup (`/setup`)

Middleware redirects until `/etc/curxor/fre-state.json` has `"initialized": true`:

1. **System Handshake** — appliance identity
2. **Module Selection** — toggle OOTB modules (defaults: Capital, Creator, Outreach)
3. **Provisioning** — writes FRE state + seeds per-app FRE configs

Deselected modules: hidden from nav; direct URLs redirect to first selected app (middleware + client guard).

### Per-app FRE

Each Claw workspace runs its own 3-step wizard on first open. State: `/etc/curxor/app-fre/{appId}.json` · API `GET/POST /api/app-fre/[appId]`.

## Agent console

Every app (except layout-only routes):

| Panel | Purpose |
|-------|---------|
| **Chat** | Natural language — routes to skills or local LLM |
| **Skills** | Explicit actions (motor, digital, or local plan) |
| **Activity** | Timestamped log incl. `motor_out seq N`, `digital_out` ids |
| **Help** | Agent purpose and how-to copy from catalog |

**Safety model:** Chat **plans and explains**. Trades and posts require tapping **Execute Trade** or **Publish** — intent goes to `telemetry/digital_out`; Python bridges on eno2 perform HTTPS. The LLM never calls the internet.

## Local LLM in the dashboard

The Next.js **build does not include model weights**. Pillar 1 must deploy Ollama/vLLM first ([Inference guide](04-inference-compute.md)).

When inference is up (`curl http://127.0.0.1:11434/api/tags`):

| Feature | API | Behavior |
|---------|-----|----------|
| **The Forge** | `POST /api/claw/assist` | JSON assist: intent, budget tier, stack rationale, `readyToForge`; multimodal (photo / live vision) |
| **Creator Claw chat** | `POST /api/app-agent/assist` | Local LLM + skill suggestions |
| **Capital Claw chat** | same | Local LLM + skill suggestions |
| **Draft Post skill** | same + `skillId: draft_post` | Generates draft text on-box |
| **Create Rule skill** | same + `skillId: create_rule` | Generates WHEN/THEN rule text |
| **Other apps** | same | Rule-based chat; skills publish to mesh |

When inference is **down**, Forge and all agents **fall back to rule-based replies** — no hard failure.

Implementation: `lib/local-inference.ts` (localhost-only, serialized queue to reduce UMA contention with the engine).

### Dashboard inference env

`/etc/curxor/dashboard.env` (see `pillar-4-dashboard/.env.example`):

```bash
CURXOR_MESH_BROKER_IP=10.77.0.1
CURXOR_INFERENCE_BACKEND=ollama
CURXOR_INFERENCE_MODEL=qwen2.5:7b-instruct-q4_K_M
CURXOR_INFERENCE_TIMEOUT_MS=30000
CURXOR_OLLAMA_URL=http://127.0.0.1:11434
CURXOR_DASHBOARD_INFERENCE_ENABLED=1   # 0 = force rule-based chat only
CURXOR_FRE_STATE_PATH=/etc/curxor/fre-state.json
CURXOR_OTA_LOG=/var/log/curxor/ota-update.log
PORT=3080
HOSTNAME=0.0.0.0
```

Keep `CURXOR_INFERENCE_MODEL` aligned with `/etc/curxor/engine.env`.

## The Forge (detailed)

Route: `/claw-forge` · Header **+ Forge** · Legacy `/new-claw` → `/claw-forge?new=1`

1. **Chat** — describe niche, constraints, budget (economy / balanced / performance)
2. **Multimodal** — upload photo or **Attach Vision** from live mesh SSE
3. **Assist** — local LLM recommends stack from `local-llm-catalog.ts`; heuristic fallback if offline
4. **+ Forge Claw** — wizard pre-filled from chat; `POST /api/claw/create` → `claw-profiles.json`
5. **List Fleet** skill — refreshes provisioned profiles

APIs: `/api/claw/assist`, `/api/claw/recommend`, `/api/claw/create`, `/api/claw/profiles`

Active profile → `/etc/curxor/engine.env.d/active-claw.conf` via `apply-active-claw.sh`

## Skills and mesh publish

Skill taps call `POST /api/app-agent/assist` with `skillId`. Executors publish when applicable:

| Kind | Example skills | Mesh |
|------|----------------|------|
| **physical** | Sort Tray, Assign Route, Drop Claw | `telemetry/motor_out` via `:9200` |
| **digital** | Execute Trade, Publish Post | `telemetry/digital_out` → bridges |
| **plan** | Summarize Day, Draft Post (LLM), Attach Vision | Local only |

Dashboard PUB connects to same XSUB as Pillar 2 engine.

## Live telemetry (SSE)

| Widget | Route | Source |
|--------|-------|--------|
| Vision | `/api/stream/vision` | Mesh XPUB `:9101` |
| Motor | `/api/stream/motor` | Mesh XPUB `:9201` (conflated) |
| Digital receipts | `/api/stream/digital` | `digital_in` on `:9101` |
| Compute metrics | `/api/metrics/compute` | Ollama/vLLM + `/proc/meminfo` |
| OTA log | `/api/stream/ota-logs` | `/var/log/curxor/ota-update.log` |

Single shared `TelemetryProvider` — one SSE connection per stream (digital receipts deduped by `id`).

## System Health drawer

Header **System Health**: OTA terminal (SSE) + **Compute metrics** (tokens/s when vLLM metrics available, UMA %, loaded model).

## Development and QA

```bash
cd pillar-4-dashboard
export CURXOR_FRE_STATE_PATH=$PWD/scripts/dev-qa/fre-state.json
export CURXOR_CLAW_PROFILES_PATH=$PWD/scripts/dev-qa/claw-profiles.json
export CURXOR_MESH_BROKER_IP=127.0.0.1
npm ci && npm run typecheck && npm run build
npm run dev                    # http://127.0.0.1:3080
npm run qa:smoke               # 14 API checks (all 8 app agents)
```

If port 3080 is in use, run on 3081 and `node scripts/qa-smoke.mjs http://127.0.0.1:3081`.

## Install and rebuild (appliance)

```bash
sudo /opt/curxor/pillar-4-dashboard/scripts/install.sh
cd /opt/curxor/pillar-4-dashboard && npm ci && npm run build
sudo systemctl restart curxor-dashboard
```

## Design system

| Token | Value |
|-------|-------|
| Background | `#000000` / `#0a0a0a` |
| Accent | `#bc13fe` |
| Fonts | JetBrains Mono, Fira Code (bundled — offline) |

## Related guides

- [Quick Start](00-quick-start.md)
- [Inference & Compute](04-inference-compute.md)
- [Digital Action Layer](12-digital-action-layer.md)
- [Engine & Claws](05-engine-and-claws.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
