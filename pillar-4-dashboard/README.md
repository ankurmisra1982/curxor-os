# CurXor OS — Pillar 4: UI / Dashboard (Flight Terminal)

Next.js captive portal for the **MINISFORUM MS-S1 MAX** appliance. Runs fully offline — fonts and styles bundled via npm (`@fontsource`), no CDN dependencies.

## Architecture

Browsers cannot speak ZeroMQ. The dashboard uses **server-side ZMQ XPUB subscribers** that fan out to the UI via **Server-Sent Events (SSE)**:

```
Mesh XPUB :9101/:9201 ──SUB──► Next.js Node (lib/zmq-bridge.ts)
                                    │
                    SSE /api/stream/vision  ──► TelemetryProvider (shared)
                    SSE /api/stream/motor   ──► LiveTelemetryStrip + apps
                    POST /api/mesh/motor       ──► ZMQ motor_out (:9200)
                    POST /api/mesh/digital     ──► ZMQ digital_out (:9200)
                    GET /api/metrics/compute ──► System Health (poll)
                    SSE /api/stream/digital   ──► Content / Capital receipts
```

| Widget | Source | Update |
|--------|--------|--------|
| **Vision IN** | `telemetry/vision_in` @ `:9101` | SSE via `TelemetryProvider` |
| **Motor OUT** | `telemetry/motor_out` @ `:9201` | SSE via `TelemetryProvider` |
| **Digital IN** | `telemetry/digital_in` @ `:9101` | SSE per-app receipts |
| **Compute** | Ollama/vLLM + `/proc/meminfo` | Poll in System Health |

## Design System

| Token | Value |
|-------|-------|
| Background | `#000000` → `#111111` |
| Text | `#ffffff` |
| Accent | `#bc13fe` (Cursor neon purple) |
| Telemetry font | JetBrains Mono + Fira Code (bundled) |

## Install

Requires Pillars 1 and 3 running.

```bash
sudo cp -r pillar-4-dashboard /opt/curxor/pillar-4-dashboard
cd /opt/curxor/pillar-4-dashboard
chmod +x scripts/*.sh
sudo ./scripts/install.sh

sudo cp .env.example /etc/curxor/dashboard.env
sudo systemctl enable --now curxor-dashboard
```

Open **http://\<appliance-ip\>:3080** on the local network.

On first boot, the **First Run Experience** wizard at `/setup` runs until `/etc/curxor/fre-state.json` has `"initialized": true`.

**Middleware** (`middleware.ts`) reads FRE state via `/api/setup/status` and redirects `/` → `/setup` when not initialized (and `/setup` → `/` when complete).

## First Run Experience (FRE)

| Route | Behavior |
|-------|----------|
| `/` | Master Claw dashboard — redirects to `/setup` if not initialized |
| `/setup` | 3-step wizard: Handshake → Modules → Provisioning |
| `POST /api/setup/provision` | 3s mock delay, sets `initialized: true`, returns `{ ok: true }` |

Reset FRE:

```bash
sudo bash -c 'echo "{\"initialized\":false,\"selectedApps\":[],\"provisionedAt\":null}" > /etc/curxor/fre-state.json'
sudo chown curxor:curxor /etc/curxor/fre-state.json
```

## Captive Portal (optional)

Point DNS hijack or `dnsmasq` on Port 1/2 to redirect unauthenticated clients to `:3080` for appliance onboarding. Example:

```bash
# /etc/dnsmasq.d/curxor-portal.conf (eno1 captive LAN — not robotics mesh)
address=/#/10.0.0.1
```

## Configuration (`/etc/curxor/dashboard.env`)

```bash
CURXOR_MESH_BROKER_IP=10.77.0.1
CURXOR_VISION_XPUB_PORT=9101
CURXOR_MOTOR_XPUB_PORT=9201
CURXOR_INFERENCE_BASE_URL=http://127.0.0.1:8000/v1
CURXOR_INFERENCE_METRICS_URL=http://127.0.0.1:8000/metrics
CURXOR_TOTAL_RAM_GB=64
CURXOR_GPU_HEAP_GB=48
```

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
# http://127.0.0.1:3080
```

## Project Layout

```
pillar-4-dashboard/
├── app/
│   ├── page.tsx                    # Flight Terminal
│   └── api/
│       ├── stream/vision/route.ts  # SSE vision feed
│       ├── stream/motor/route.ts   # SSE motor matrix
│       └── metrics/compute/route.ts
├── components/
│   ├── telemetry/                  # Vision + Motor widgets
│   ├── compute/                    # Tokens/s + UMA RAM
│   └── shell/                      # Panel, Header
├── lib/
│   ├── zmq-bridge.ts               # Server-side XPUB subscribers
│   ├── wire-protocol.ts            # 40B motor / vision unpack
│   └── metrics.ts                  # vLLM + /proc/meminfo
└── systemd/curxor-dashboard.service
```

## Full Stack

| Pillar | Role |
|--------|------|
| **1** | vLLM tokens/sec via `/metrics` |
| **2** | Publishes motor / consumes vision on mesh |
| **3** | XPUB fan-out @ `eno2` |
| **4** | This dashboard |

CurXor OS software stack is complete.

## Flight Command Desktop

After FRE, the appliance opens the **Flight Command Desktop** — a split view:

| Region | Width | Role |
|--------|-------|------|
| **Master Claw** (left) | 30% | Terminal-style AI PoC chat |
| **App canvas** (right) | 70% | OOTB module routes + live telemetry strip |

**Routes:** `/my-work` · `/my-shop` · `/optimus` · `/robotaxi` · `/claw-cafe` · `/my-content` · `/my-capital` · `/claw-forge`

All canvas pages bind to `/api/stream/vision` and `/api/stream/motor` SSE feeds.

## Start New Claw Wizard

Click **✚ New Claw** in the desktop header to launch a FRE-style wizard:

1. **State Intent** — describe the claw’s job (kiosk, fleet, manipulation, etc.)
2. **Choose LLMs** — manual local model pick or **auto-choose** by UMA budget tier (Economy / Balanced / Performance)
3. **Provision Claw** — simulated deploy matrix + `POST /api/claw/create` (3s mock delay)

Profiles persist to `/etc/curxor/claw-profiles.json`. **The Forge** OOTB app: `/claw-forge` (header **+ Forge** shortcut).
