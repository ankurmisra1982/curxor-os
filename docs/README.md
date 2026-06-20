# CurXor OS Documentation



Guides for deploying, operating, and extending the CurXor OS sovereign edge appliance on the **MINISFORUM MS-S1 MAX** (AMD Ryzen AI Max+ 395, 64 GB UMA).



## Quick links



| Guide | What you'll learn |

|-------|-------------------|

| [Installation](guides/01-installation.md) | First boot, meta-installer, cloud-init, post-install checklist |

| [Architecture](guides/02-architecture.md) | Four pillars, data flows, systemd target, directory layout |

| [Networking](guides/03-networking.md) | eno1 captive portal vs eno2 robotics mesh |

| [Inference & Compute](guides/04-inference-compute.md) | ROCm, Ollama/vLLM, UMA tuning, model deploy |

| [Engine & Claws](guides/05-engine-and-claws.md) | OpenClaw agent loop, claw wizard, active profiles |

| [Telemetry Mesh](guides/06-telemetry-mesh.md) | ZeroMQ broker, wire formats, ports, verification |

| [Flight Command Dashboard](guides/07-flight-command-dashboard.md) | UI, FRE, SSE telemetry, System Health OTA terminal |

| [OTA Updates](guides/08-ota-updates.md) | Secure updater, cron, rollback, release manifests |

| [Operations & Troubleshooting](guides/09-operations-troubleshooting.md) | Day-2 ops, logs, health checks, common failures |

| [MS-S1 MAX Hardware & BIOS](guides/10-ms-s1-max-hardware-bios.md) | UMA carve-out, NIC roles, BIOS checklist, validation |

| [PDF Export](guides/11-pdf-export.md) | Generate printable PDFs from all guides |
| [Digital Action Layer](guides/12-digital-action-layer.md) | Alpaca/X bridges, mesh JSON intents, SSE receipts |



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


