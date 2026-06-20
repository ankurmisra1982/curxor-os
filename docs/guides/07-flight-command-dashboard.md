# Flight Command Dashboard Guide

Pillar 4 is the **Flight Command Desktop** — a Next.js captive portal and operator UI with a SpaceX-inspired industrial aesthetic (matte black, stark white, neon purple `#bc13fe`).

## Access

| Mode | URL |
|------|-----|
| Direct | `http://<appliance-ip>:3080` |
| Captive portal (eno1) | Any URL → `http://10.0.0.1` |

Port: **3080** (`curxor-dashboard.service`)

## Layout

```
┌─────────────────────┬──────────────────────────────────────┐
│ Master Claw (30%)   │ Flight Command Desktop (70%)         │
│ Command terminal    │ Header · App nav · Telemetry strip   │
│ Active claw badge   │ Main app canvas (OOTB routes)        │
└─────────────────────┴──────────────────────────────────────┘
```

**System Health** (header button) opens a slide-out panel with live OTA log terminal.

## Out-of-the-box apps

| Route | Purpose |
|-------|---------|
| `/my-work` | Default workspace (post-FRE landing) |
| `/my-shop` | Retail / shop module |
| `/optimus` | Humanoid / manipulation |
| `/robotaxi` | Fleet dispatch |
| `/claw-cafe` | Kiosk / guest demo |
| `/my-content` | Social & headless channel studio |
| `/my-capital` | Rule-based investing (stocks & crypto) |
| `/claw-forge` | Multimodal NL studio — forge new claw bots continuously |

## First Run Experience (FRE)

Middleware redirects unprovisioned appliances to `/setup`:

1. **System Handshake** — appliance identity check
2. **Module Selection** — choose OOTB apps
3. **Provisioning** — 3 s mock delay, sets `initialized: true`

State file: `/etc/curxor/fre-state.json`

## Live telemetry (SSE)

Browsers cannot use ZeroMQ. Server-side bridge → SSE:

| Widget | SSE route | Source |
|--------|-----------|--------|
| Vision feed | `/api/stream/vision` | Mesh XPUB `:9101` |
| Motor matrix | `/api/stream/motor` | Mesh XPUB `:9201` (conflated) |
| Compute metrics | `/api/metrics/compute` | Poll (Ollama/vLLM + `/proc/meminfo`) |
| OTA terminal | `/api/stream/ota-logs` | `/var/log/curxor/ota-update.log` |

## Claw Forge (OOTB app)

**Claw Forge** (`/claw-forge`) is the eighth OOTB module for continuous claw bot creation:

- Multimodal chat — natural language, photo upload, live vision frame from mesh
- Local assist API — `/api/claw/assist` (no cloud; rule-based until hardware LLM hookup)
- **+ Forge Claw** — launches embedded provisioning wizard pre-filled from chat
- Fleet registry — lists profiles from `/etc/curxor/claw-profiles.json`

Header **+ Forge** shortcut and legacy `/new-claw` redirect to `/claw-forge?new=1`.

APIs: `/api/claw/recommend`, `/api/claw/create`, `/api/claw/profiles`

Active profile applied to engine via `/etc/curxor/engine.env.d/active-claw.conf`

## System Health / OTA terminal

`OtaTerminalWidget` streams OTA daemon output:

- Monospace terminal styling, auto-scroll
- LIVE indicator when SSE connected
- Fallback message if log file not yet created

Open via **System Health** in the Flight Command header (Escape to close).

## Configuration

`/etc/curxor/dashboard.env`:

```bash
CURXOR_MESH_BROKER_IP=10.77.0.1
CURXOR_INFERENCE_BACKEND=ollama
CURXOR_OLLAMA_URL=http://127.0.0.1:11434
CURXOR_FRE_STATE_PATH=/etc/curxor/fre-state.json
CURXOR_OTA_LOG=/var/log/curxor/ota-update.log
PORT=3080
HOSTNAME=0.0.0.0
```

## Install and rebuild

```bash
sudo /opt/curxor/pillar-4-dashboard/scripts/install.sh
sudo systemctl restart curxor-dashboard
```

After code changes:

```bash
cd /opt/curxor/pillar-4-dashboard && pnpm build
sudo systemctl restart curxor-dashboard
```

## Design system

| Token | Value |
|-------|-------|
| Background | `#000000` / `#0a0a0a` |
| Text | `#ffffff` |
| Accent | `#bc13fe` |
| Fonts | JetBrains Mono, Fira Code (bundled via `@fontsource`) |

No CDN dependencies — fully offline capable.

## Related guides

- [Installation](01-installation.md)
- [OTA Updates](08-ota-updates.md)
- [Engine & Claws](05-engine-and-claws.md)
