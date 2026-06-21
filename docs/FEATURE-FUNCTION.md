# CurXor — Feature & Function Document

**Version:** 0.1.0 (stable) · **Date:** June 2026  
**Appliance:** `curxor-os` → `/opt/curxor/` on MINISFORUM MS-S1 MAX  
**GTM site:** `curxor storefront` → https://curxor.ai  
**Status:** Software scaffold complete · **hardware validation pending**

---

## 1. Where we are now

CurXor is a **two-repo product**:

| Repo | Role | Maturity |
|------|------|----------|
| **curxor-os** | Sovereign appliance stack (4 pillars, systemd, OTA) | Installable, CI-green, QA-smokeable |
| **curxor storefront** | Pre-order landing, email capture, Stripe CTA | Live GTM v1 |

**Product positioning:** Digital Wealth & Growth — mint **autonomous digital employees (Claws)** on bare metal. **$3,999 once**, **$0/mo API**. Alpha stays local; outbound trades and posts egress via **eno2 bridges only**.

**What works today (software):**

- Meta-installer, four-pillar systemd target, eno1/eno2 networking scripts
- Flight Command UI with **10 Claw workspaces** + The Forge
- **Claw Context Protocol (CCP)** — unified inter-Claw + hardware context mesh (`telemetry/claw_context`)
- **Vital Claw** — longevity desk (wearables, medical reports, health protocol)
- **Kin Claw (My Family)** — household profiles, devices, personalities via CCP
- Flight Command **Settings** (`/settings`) — Claws toggle, intelligence (local/frontier/auto), appearance (themes, light/dark)
- Agent consoles (chat, skills, activity), global + per-app FRE
- Capital Claw **live portfolio template** — Alpaca paper when `digital.env` configured, else FRE watchlist demo
- Mesh publish/subscribe (motor, vision, digital) with SSE dashboard widgets
- Local + optional frontier LLM routing (`inference-router.ts`, API key validation on connect, **OAuth PKCE** for OpenAI subscription sign-in)
- Frontier provider **OAuth PKCE** — OpenAI (ChatGPT/Codex flow), Google when env configured; guided link fallback for Cursor/Anthropic
- OTA updater with backup/rollback scaffold
- Storefront synced to Settings / user-freedom messaging
- CI `pillar-4-qa-smoke` job (22+ checks incl. CCP, Vital, Kin, settings, OAuth link-session)

**What is blocked or incomplete:**

- MS-S1 MAX on-device validation (ROCm gfx1151, UMA BIOS, mesh latency)
- Production OTA artifact URL and golden image freeze
- Live Alpaca/X credentials on customer appliances
- Many workspace UIs still use **demo data** except Capital portfolio (live when Alpaca configured)
- CI smoke runs on Linux CI; local Windows QA may need `--port` if 3080 is busy

**Last verified:** typecheck + build (P2, P4), `npm run qa:local` 18/18 (settings, OAuth link-session, capital status).

---

## 2. System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  eno1 (10.0.0.1) — Command Port                                 │
│  Operators · captive portal · Flight Command :3080              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  Pillar 4 — Flight Command Desktop (Next.js)                      │
│  FRE · 8 Claws · Forge · SSE telemetry · local LLM client         │
└───────┬───────────────────────────────┬─────────────────────────┘
        │ 127.0.0.1                       │ ZMQ via eno2
        ▼                                 ▼
┌───────────────┐              ┌──────────────────────────────────┐
│ Pillar 1      │              │ Pillar 3 — Telemetry Broker       │
│ Ollama / vLLM │              │ XSUB/XPUB :9100-9201 on 10.77.0.1 │
│ :11434 / :8000│              │ + digital bridges (Alpaca, X)     │
└───────┬───────┘              └──────────────┬───────────────────┘
        │                                     │
        │         ┌───────────────────────────┘
        │         │
        ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pillar 2 — OpenClaw Engine                                      │
│  Vision → local inference → motor_out / digital_out              │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  eno2 (10.77.0.1) — Egress + mesh                                │
│  Unplug = kill outbound agents                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Sovereign rule:** Local LLM binds to `127.0.0.1`. Cloud inference URLs are rejected. Trades and social posts never originate from the LLM — only from Python bridges after explicit skill → mesh intent.

---

## 3. Pillar feature catalog

### Pillar 1 — Compute (`pillar-1-compute/`)

| Function | Description |
|----------|-------------|
| ROCm host setup | Docker, GPU verify, optional GRUB UMA tuning |
| Ollama ROCm container | Default backend, `:11434`, model pull via `deploy.sh` |
| vLLM container | Experimental OpenAI-compatible API, `:8000/v1` |
| Model storage | `/var/lib/curxor/ollama`, `/var/lib/curxor/models` |
| Systemd | `curxor-compute.service` — compose up on boot |
| Recommended models | moondream (vision), qwen2.5 7B/14B/35B (reasoning), OpenVLA (VLA) |

### Pillar 2 — Engine (`pillar-2-engine/`)

| Function | Description |
|----------|-------------|
| Agent loop | 50 ms tick; reason on new vision frames; min 500 ms between LLM calls |
| Local inference | Ollama `/api/chat` or vLLM `/chat/completions` |
| Physical tools | `ingest_vision`, `publish_motor`, `move_claw` |
| Digital tools | `capital.execute_trade`, `content.publish_post` → mesh JSON |
| Active claw profile | `/etc/curxor/engine.env.d/active-claw.conf` from Forge |
| Backoff | Exponential to 30 s on inference errors |

### Pillar 3 — Telemetry (`pillar-3-telemetry/`)

| Function | Description |
|----------|-------------|
| Dual ZMQ proxy | Vision 9100/9101, motor 9200/9201 on mesh IP |
| Wire formats | 20B vision header + payload; 40B motor struct; JSON digital |
| Digital bridges | Alpaca paper trades, X publish; SUB/PUB on shared proxy |
| Verification | `verify-mesh.sh`, `bench-motor-latency.sh` |
| Systemd | `curxor-telemetry-broker.service` — broker + bridges |

### Pillar 4 — Dashboard (`pillar-4-dashboard/`)

| Function | Description |
|----------|-------------|
| Flight Command shell | Master Claw sidebar, app nav, telemetry strip, System Health |
| Global FRE | `/setup` — handshake, module pick, provision |
| Per-app FRE | 3-step wizard per Claw; `/api/app-fre/[appId]` |
| Agent console | Chat, skills, help, activity log per workspace |
| The Forge | Multimodal assist, wizard, claw profiles, fleet list |
| Mesh publish API | `/api/mesh/motor`, `/api/mesh/digital` from skill executors |
| SSE streams | Vision, motor, digital receipts, OTA log |
| Compute metrics | Poll Ollama/vLLM + `/proc/meminfo` |
| Local LLM client | Forge + Creator/Capital chat; serialized queue; fallback rules |
| Middleware | FRE gate, selectedApps enforcement, `/` redirect |
| QA | `npm run qa:smoke` — 14 API checks · `npm run qa:local` — one-command dev QA |

---

## 4. Claw applications (OOTB modules)

Canonical definitions: `pillar-4-dashboard/lib/ootb-apps.ts`  
Agent behavior: `pillar-4-dashboard/lib/app-agent-catalog.ts`

| Display name | Route | Appliance ID | Primary function |
|--------------|-------|--------------|------------------|
| **The Forge** | `/claw-forge` | `claw-forge` | Mint Claws — intent, photo, vision, model stack, provision |
| **Capital Claw** | `/my-capital` | `my-capital` | Rule engine, paper trades via Alpaca bridge |
| **Creator Claw** | `/my-content` | `my-content-creator` | Sovereign content ops — queue, calendar, 10-platform publish, Go Live, engage loop, analytics |
| **Outreach Claw** | `/my-work` | `my-work` | Outbound desk, sequences, task matrix (mock CRM) |
| **Arbitrage Claw** | `/my-shop` | `my-shop` | Margin / fulfillment desk (mock e-com) |
| **Signal Claw** | `/optimus` | `tesla-optimus-engine` | Feed triggers, alert thresholds (demo canvas) |
| **Swarm Claw** | `/robotaxi` | `robotaxi-fleet-manager` | Multi-Claw grid, dispatch policy (mock fleet) |
| **Engage Claw** | `/claw-cafe` | `claw-cafe` | DM/thread engagement demos, vision lanes |

**The Forge** is always enabled regardless of FRE module selection.

### Skills by mesh kind

| Kind | Behavior | Apps (examples) |
|------|----------|-----------------|
| **plan** | Local only — UI state, LLM draft, no mesh | Summarize Day, Draft Post, Create Rule, Forge Claw |
| **physical** | Publishes `telemetry/motor_out` | Sort Tray, Assign Route, Drop Claw |
| **digital** | Publishes `telemetry/digital_out` → bridge | Execute Trade, Publish Post |

### Local LLM in dashboard (by app)

| App | Chat | Skill LLM |
|-----|------|-----------|
| The Forge | Yes (`/api/claw/assist`) | N/A (wizard is UI) |
| Creator Claw | Yes | Draft Post, schedule, fan-out, engage reply |
| Capital Claw | Yes | Create Rule |
| Outreach Claw | Yes | Summarize Day |
| Arbitrage Claw | Yes | Ingest Order (margin brief) |
| Other 4 | Rule-based fallback | No |

When Ollama/vLLM is down, all chat falls back to heuristics — UI remains usable.

---

## 5. API surface (Pillar 4)

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/api/setup/status` | Global FRE state |
| POST | `/api/setup/provision` | Complete global FRE (3 s mock delay) |
| GET/POST | `/api/app-fre/[appId]` | Per-app FRE read/write |
| POST | `/api/app-agent/assist` | App chat + skill execution + mesh |
| POST | `/api/claw/assist` | Forge multimodal assist |
| POST | `/api/claw/recommend` | Model stack by intent + budget tier |
| POST | `/api/claw/create` | Save claw profile + apply to engine |
| GET | `/api/claw/profiles` | List provisioned claws |
| POST | `/api/mesh/motor` | Direct motor publish (QA/admin) |
| POST | `/api/mesh/digital` | Direct digital intent publish |
| GET | `/api/stream/vision` | SSE vision frames |
| GET | `/api/stream/motor` | SSE motor commands |
| GET | `/api/stream/digital` | SSE digital receipts |
| GET | `/api/stream/ota-logs` | SSE OTA log tail |
| GET | `/api/metrics/compute` | Inference + UMA metrics |

---

## 6. Storefront features (`curxor storefront`)

| Function | Status | Notes |
|----------|--------|-------|
| Landing page `/` | Live | Hero, compute, Create-to-Earn, specs, 8 Claws |
| 3D hardware scene | Live | R3F procedural Nexus mesh |
| Stripe pre-order | Live | External Payment Link ($3,999) |
| Email capture | Live | `POST /api/subscribe` → Resend |
| OG image | Live | `/opengraph-image` |
| Appliance sync | Live | `npm run sync:appliance` → `appliance-sync.ts` |
| Analytics | Live | Vercel Analytics + Speed Insights |
| Architecture page | Planned | GTM checklist |
| FAQ / privacy / pricing | Planned | GTM checklist |

Marketing copy: `src/lib/config.ts` · Positioning: `docs/PRODUCT-POSITIONING.md`

---

## 7. Infrastructure & operations

| Function | Implementation |
|----------|----------------|
| Meta-install | `scripts/install-all.sh` |
| Captive portal | `setup-captive-portal.sh` — eno1 DNS + iptables → :3080 |
| Mesh network | `setup-mesh-network.sh` — eno2 `10.77.0.1/24` |
| OTA | `ota-updater.sh` — backup, SHA256, extract, rollback |
| OTA cron | `install-ota-cron.sh` — 03:00 daily |
| Claw apply | `apply-active-claw.sh` — engine env + restart |
| CI | `.github/workflows/build.yml` — P2 + P4 typecheck/build |
| PDF docs | `docs/scripts/export-guides-pdf.sh` |

### Port map

| Service | Port | Bind |
|---------|------|------|
| Flight Command | 3080 | 0.0.0.0 |
| Ollama | 11434 | 127.0.0.1 |
| vLLM | 8000 | 127.0.0.1 |
| Vision XSUB/XPUB | 9100 / 9101 | eno2 |
| Motor + digital XSUB/XPUB | 9200 / 9201 | eno2 |

### State files

| Path | Contents |
|------|----------|
| `/etc/curxor/fre-state.json` | Global FRE |
| `/etc/curxor/app-fre/{appId}.json` | Per-app FRE config |
| `/etc/curxor/claw-profiles.json` | Forged Claws |
| `/etc/curxor/engine.env.d/active-claw.conf` | Active engine profile |
| `/etc/curxor/digital.env` | Alpaca + X API keys |
| `/var/log/curxor/ota-update.log` | OTA log |

---

## 8. Maturity matrix

| Capability | Code | Validated on hardware | Customer-ready |
|------------|------|----------------------|----------------|
| Install / systemd | ✅ | ❌ | ⚠️ After first boot proof |
| Ollama deploy | ✅ | ❌ | ⚠️ After gfx1151 proof |
| Engine loop | ✅ | ❌ | ⚠️ |
| Mesh broker | ✅ | ❌ | ⚠️ |
| Digital bridges | ✅ | ❌ | ⚠️ Needs credentials |
| Dashboard UI | ✅ | ⚠️ Dev QA | ⚠️ Mock data in workspaces |
| Dashboard LLM chat | ✅ | ❌ | ⚠️ Needs Ollama on box |
| FRE / Forge | ✅ | ⚠️ Dev | ✅ UX complete |
| OTA | ✅ | ❌ | ⚠️ Mock manifest |
| Storefront GTM | ✅ | N/A | ✅ Pre-order live |
| Golden image | ❌ | ❌ | ❌ Blocked on MS-S1 MAX |

---

## 9. Environment variables (cross-pillar)

| Variable | Pillars | Purpose |
|----------|---------|---------|
| `CURXOR_INFERENCE_BACKEND` | 1, 2, 4 | `ollama` or `vllm` |
| `CURXOR_INFERENCE_MODEL` | 2, 4 | Default chat/reasoning model |
| `CURXOR_OLLAMA_URL` | 2, 4 | Must be localhost |
| `CURXOR_DASHBOARD_INFERENCE_ENABLED` | 4 | `0` = rule-only chat |
| `CURXOR_MESH_BROKER_IP` | 2, 3, 4 | Default `10.77.0.1` |
| `CURXOR_FRE_STATE_PATH` | 4 | Global FRE JSON |
| `CURXOR_GPU_HEAP_GB` | 1, 4 metrics | UMA budget display |

Full lists: each pillar's `.env.example` → `/etc/curxor/*.env`

---

## 10. User-facing documentation map

| Audience | Document |
|----------|----------|
| Quick start | [guides/00-quick-start.md](guides/00-quick-start.md) |
| User guide (dashboard) | [guides/07-flight-command-dashboard.md](guides/07-flight-command-dashboard.md) |
| Operator card (print) | [quick-reference/operator-card.md](quick-reference/operator-card.md) |
| Install | [guides/01-installation.md](guides/01-installation.md) |
| Inference | [guides/04-inference-compute.md](guides/04-inference-compute.md) |
| Digital bridges | [guides/12-digital-action-layer.md](guides/12-digital-action-layer.md) |
| Audit history | [AUDIT-REPORT.md](AUDIT-REPORT.md) |
| Storefront positioning | `../curxor storefront/docs/PRODUCT-POSITIONING.md` |
| Storefront sync | `../curxor storefront/docs/SYNC.md` |

---

## 11. Known gaps & roadmap

| Priority | Item |
|----------|------|
| P0 | First boot on MS-S1 MAX — ROCm, UMA BIOS, mesh E2E |
| P0 | Golden image freeze + factory USB |
| P1 | CI job: production build + `qa:smoke` | ✅ Added in `.github/workflows/build.yml` |
| P1 | Production OTA manifest + signed artifacts |
| P2 | LAN auth on mutating API routes | ✅ Optional `CURXOR_LAN_AUTH_TOKEN` |
| P2 | Storefront architecture / FAQ / pricing pages |
| P3 | Wire workspace selection into skill mesh payloads | ✅ Capital, Shop, Work |
| P3 | Extend local LLM chat to Outreach / Arbitrage apps | ✅ Done |

---

## 12. Version & sync

```json
// curxor-os/version.json
{ "version": "0.1.0", "channel": "stable" }
```

Storefront badges and `appliance-sync.ts` track this version. Bump → `npm run sync:appliance` in storefront repo.

---

*CurXor OS · Flight Command · Pillars 1–4 · Offline First · Digital Employees on Bare Metal*
