# CurXor OS Documentation



Guides for deploying, operating, and extending the CurXor OS sovereign edge appliance on the **MINISFORUM MS-S1 MAX** (AMD Ryzen AI Max+ 395, **64 GB or 128 GB** UMA).



## Quick links

| Guide | What you'll learn |
|-------|-------------------|
| **[Dream state overview](curxor-os/DREAM-STATE-OVERVIEW.md)** | **End-state vision — hardware · sovereign OS · locked hero · three acts** |
| **[Feature & Function](FEATURE-FUNCTION.md)** | **Full product scope, maturity matrix, API catalog, Claws** |
| **[Current roadmap](curxor-os/CURRENT-ROADMAP.md)** | **Scoped G1–G3 sprints · build-chat handoffs · Program HS / FC / BP5 / …** |
| **[Future roadmap](curxor-os/FUTURE-ROADMAP.md)** | **Ideas capture · G4+ programs · parking lot · promote to CURRENT when scoped** |
| **[Compute ladder](curxor-os/COMPUTE-LADDER.md)** | **Standard · Pro 128 · Studio — open-weight tiers · press copy (→ storefront)** |
| **[Claw Commons vision](curxor-os/CLAW-COMMONS-VISION.md)** | **Operator Forum + Clawverse — persona capsules, portal UX, moderation** |
| **[Universal OS layer](curxor-os/UNIVERSAL-OS-LAYER.md)** | **Cafe · Signal · Kin · shell · platform · infra — not operate Claws** |
| **[Founder profile](founder/profile.md)** | Origin story, quote, mission — [JSON](founder/profile.json) for storefront |
| **[Pitch deck (storefront)](../../curxor%20storefront/docs/PITCH-DECK.md)** | Investor narrative · `.pptx` with speaker notes |
| **[Loop positioning (storefront)](../../curxor%20storefront/docs/LOOP-POSITIONING.md)** | **Work · memory · trust loops** — GTM narrative vs chat SaaS |
| **[Quick Start](guides/00-quick-start.md)** | **First boot, 8 Claws, local LLM, Forge, dev QA** |
| [Installation](guides/01-installation.md) | Meta-installer, cloud-init, post-install checklist |
| [Architecture](guides/02-architecture.md) | Four pillars, data flows, systemd target, directory layout |
| [Networking](guides/03-networking.md) | eno1 captive portal vs eno2 robotics mesh |
| [Inference & Compute](guides/04-inference-compute.md) | ROCm, Ollama/vLLM, UMA tuning, model deploy |
| [Engine & Claws](guides/05-engine-and-claws.md) | OpenClaw agent loop, claw wizard, active profiles |
| [Telemetry Mesh](guides/06-telemetry-mesh.md) | ZeroMQ broker, wire formats, ports, verification |
| [Flight Command Dashboard](guides/07-flight-command-dashboard.md) | **User guide** — UI, FRE, local LLM chat, Forge, skills, SSE |
| [OTA Updates](guides/08-ota-updates.md) | Secure updater, cron, rollback, release manifests |
| [Operations & Troubleshooting](guides/09-operations-troubleshooting.md) | Day-2 ops, logs, health checks, common failures |
| [MS-S1 MAX Hardware & BIOS](guides/10-ms-s1-max-hardware-bios.md) | UMA carve-out, NIC roles, BIOS checklist, validation |
| **[Pro 128 unbox cheat sheet](curxor-os/MS-S1-128GB-UNBOX-CHEATSHEET.md)** | **128 GB SKU · BIOS/env · $4,999 storefront copy** |
| [Kiosk Mode](guides/19-kiosk-mode.md) | Optional monitor-first boot → Flight Command fullscreen (internal) |
| [PDF Export](guides/11-pdf-export.md) | Generate printable PDFs from all guides |
| [Claw Context Protocol](guides/15-claw-context-protocol.md) | CCP mesh |
| [Agent runtime](guides/18-agent-runtime.md) | Workspace memory, channels, heartbeat |



## Quick reference & PDFs



| Resource | Path |

|----------|------|

| **Operator card** (print at rack) | [quick-reference/operator-card.md](quick-reference/operator-card.md) |

| **Export all PDFs** | `./docs/scripts/export-guides-pdf.sh` → `docs/pdf/` |

| PDF export guide | [guides/11-pdf-export.md](guides/11-pdf-export.md) |



```bash

sudo apt install pandoc texlive-xetex   # one-time

chmod +x docs/scripts/export-guides-pdf.sh

./docs/scripts/export-guides-pdf.sh

./docs/scripts/export-guides-pdf.sh --release   # versioned tar.gz bundle

```



## Audience



- **Field engineers** — install and verify appliances on Ubuntu 24.04

- **Robotics integrators** — mesh telemetry, motor wire format, engine behavior

- **Operators** — dashboard, OTA, captive portal, claw provisioning



## Conventions



- Install root: `/opt/curxor/`

- Config drop-ins: `/etc/curxor/*.env`

- State files: `/etc/curxor/fre-state.json`, `/etc/curxor/claw-profiles.json`

- Logs: `/var/log/curxor/`

- Backups: `/var/backups/curxor/`



All guides assume a **sovereign, offline-first** deployment: inference and control plane bind to `127.0.0.1`; only OTA manifest/artifact URLs use outbound HTTPS when enabled.


