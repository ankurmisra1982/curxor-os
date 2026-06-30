# CurXor OS — Quick Start

Operator and bench quick start for the **MINISFORUM MS-S1 MAX** appliance. Full detail: [Flight Command User Guide](07-flight-command-dashboard.md) · [Installation](01-installation.md)

## What you get

CurXor OS is a **sovereign edge appliance**: local LLM inference (Pillar 1), agent engine (Pillar 2), ZeroMQ telemetry mesh (Pillar 3), and **Flight Command Desktop** (Pillar 4). Digital employees (**Claws**) run 24/7 on bare metal — outbound trades and posts egress via **eno2 bridges only**; the LLM never talks to the internet.

The **npm/Next.js build** ships UI and API routes. **Model weights are not bundled** — deploy inference separately after install (see below).

---

## First boot (5 steps)

1. **BIOS** — GPU UMA frame buffer **MAX** (~48 GB on 64 GB SKU). See [Hardware & BIOS](10-ms-s1-max-hardware-bios.md).
2. **Install stack** — `sudo /opt/curxor/scripts/install-all.sh`
3. **Deploy local LLM** — `sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models` (30–90 min first time; Pro 128 pulls Qwen3 + Qwen3.6 extras — see [128GB cheat sheet](../curxor-os/MS-S1-128GB-UNBOX-CHEATSHEET.md))
4. **Verify inference** — `curl -sf http://127.0.0.1:11434/api/tags`
5. **Open dashboard** — `http://10.0.0.1:3080/home` (COMMAND cable) → FRE at `/setup` on first boot

**Laptop (Wi-Fi + COMMAND cable):** keep both connected. One-time Windows setup: `powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1` (Administrator). Laptop IP `10.0.0.2/24`, no gateway on COMMAND adapter. See [Networking](03-networking.md#dual-homed-laptop-wi-fi--command-cable-simultaneously).

Optional: captive portal (`setup-captive-portal.sh`), OTA cron (`install-ota-cron.sh`).

---

## Network (do not swap)

| NIC | IP | Role |
|-----|-----|------|
| **Command Port** (`enp98s0` on MS-S1) | `10.0.0.1` | Operators, captive portal, Flight Command |
| **Egress Port** (`enp97s0` on MS-S1) | `10.77.0.1` | Agent mesh + digital bridges (Alpaca, X) |

Unplug **Egress** to kill all outbound agent traffic. Inference stays on `127.0.0.1`.

---

## Ten Claws + The Forge

Canonical names (storefront and dashboard aligned):

| Route | Display name | Role |
|-------|--------------|------|
| `/claw-forge` | **The Forge** | Mint new Claws — intent, photo, live vision |
| `/my-capital` | **Capital Claw** | Rules + paper trades (Alpaca bridge) |
| `/my-content` | **Creator Claw** | Draft/schedule/publish (X bridge) |
| `/my-work` | **Outreach Claw** | Outbound / CRM-style workflows |
| `/my-shop` | **Arbitrage Claw** | Margin / fulfillment desk |
| `/optimus` | **Signal Claw** | The Neural Link — humanoid preview · AI device hub horizon |
| `/robotaxi` | **Swarm Claw** | Multi-Claw orchestration grid |
| `/claw-cafe` | **Engage Claw** | Community / DM engagement demos |

Appliance IDs in `/etc/curxor/fre-state.json` use stable keys (`my-capital`, `claw-forge`, …). **The Forge** is always enabled even if deselected in FRE.

Global FRE defaults pre-select **Capital Claw**, **Creator Claw**, and **Outreach Claw**.

---

## Local LLM — who uses it

| Consumer | Uses Ollama/vLLM? | Notes |
|----------|-------------------|--------|
| **Pillar 1** (`curxor-compute`) | **Deploy here** | Docker Ollama ROCm or vLLM on `:11434` / `:8000` |
| **Pillar 2 engine** | **Yes** | Vision loop → `/api/chat` or `/chat/completions` |
| **Forge assist** | **Yes** (when up) | `/api/claw/assist` — intent, stack, multimodal |
| **Creator / Capital chat** | **Yes** (when up) | `/api/app-agent/assist` — planning + drafts |
| **Other app agents** | Fallback rules | Skills still publish to mesh when tapped |
| **Execute Trade / Publish** | **No direct LLM** | Operator taps skill → mesh → Python bridge |

If Ollama is down, dashboard chat **falls back to rule-based replies** — UI stays usable.

Align env across pillars:

```bash
# /etc/curxor/compute.env + engine.env + dashboard.env
CURXOR_INFERENCE_BACKEND=ollama
CURXOR_INFERENCE_MODEL=qwen3:8b
CURXOR_OLLAMA_URL=http://127.0.0.1:11434
CURXOR_DASHBOARD_INFERENCE_ENABLED=1   # set 0 to disable dashboard LLM calls
```

See [Inference & Compute](04-inference-compute.md).

---

## Operator workflow

### The Forge

1. Open **The Forge** (`/claw-forge`) or header **+ Forge**
2. Describe the Claw (or attach photo / live vision from mesh)
3. Chat uses **local inference** when available; tap **+ Forge Claw** to provision
4. Profile saved to `/etc/curxor/claw-profiles.json`; engine picks up via `apply-active-claw.sh`

### App agents (any Claw workspace)

- **Left:** workspace canvas · **Right:** agent console (chat, skills, activity)
- Chat **suggests** actions; **skills execute** (motor_out, digital_out, or local plan)
- **Capital Claw:** chat drafts rules; **Execute Trade** publishes to Alpaca bridge
- **Creator Claw:** chat drafts posts; **Publish** sends intent to X bridge

### Live telemetry

SSE widgets: vision, motor, digital receipts. **System Health** → compute metrics + OTA log.

---

## Health check (one line)

```bash
systemctl status curxor-os.target && \
curl -sf http://127.0.0.1:11434/api/tags >/dev/null && \
curl -sf http://127.0.0.1:3080/api/setup/status
```

---

## Dev / QA (engineers)

From `pillar-4-dashboard/` on a dev machine:

```bash
export CURXOR_FRE_STATE_PATH=$PWD/scripts/dev-qa/fre-state.json
export CURXOR_CLAW_PROFILES_PATH=$PWD/scripts/dev-qa/claw-profiles.json
export CURXOR_APP_FRE_DIR=$PWD/scripts/dev-qa/app-fre
export CURXOR_MESH_BROKER_IP=127.0.0.1
npm run dev          # :3080
npm run qa:smoke     # 14 API checks (server must already be running)
```

**One command** (start · smoke · stop):

```bash
npm run qa:local
npm run qa:local -- --rebuild    # clean .next + build first
npm run qa:local -- --port 3081  # if :3080 is stuck
```

If you see `Cannot find module './chunks/vendor-chunks/next.js'`, run `npm run qa:local -- --rebuild`.

---

## Print reference

Rack card: [Operator Quick Reference](../quick-reference/operator-card.md) · PDF: `./docs/scripts/export-guides-pdf.sh`

## Next reads

- [Flight Command User Guide](07-flight-command-dashboard.md)
- [Digital Action Layer](12-digital-action-layer.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
