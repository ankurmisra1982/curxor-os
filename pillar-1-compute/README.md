# CurXor OS — Pillar 1: Base OS & Compute

Local ROCm inference on **MINISFORUM MS-S1 MAX** (Ryzen AI Max+ 395, 64 GB UMA).

## Quick Start (on Ubuntu 24.04 appliance)

```bash
# 1. Copy this directory to the appliance (or clone curxor-os repo)
sudo cp -r pillar-1-compute /opt/curxor/pillar-1-compute
cd /opt/curxor/pillar-1-compute

# 2. One-time host setup (ROCm, Docker, UMA tuning)
sudo ./scripts/setup-rocm-host.sh

# 3. Configure BIOS GPU heap → maximum (~48 GB on 64 GB SKU), then reboot
sudo ./scripts/configure-uma.sh --apply-grub   # optional kernel GTT
sudo reboot

# 4. Verify GPU passthrough
./scripts/verify-gpu.sh

# 5. Deploy inference (Ollama recommended for gfx1151)
cp .env.example .env
./scripts/deploy.sh --pull-models
```

## Backends

| Backend | Profile | API | Best for |
|---------|---------|-----|----------|
| **Ollama** (default) | `ollama` | `:11434` | Stable VLA/vision on gfx1151 UMA |
| **vLLM** | `vllm` | `:8000/v1` | OpenAI-compatible VLA serving (OpenVLA) |

```bash
# Ollama (recommended)
./scripts/deploy.sh --backend ollama --pull-models

# vLLM (experimental on Strix Halo — requires amdsmi in container)
./scripts/deploy.sh --backend vllm --pull-models
```

## UMA Tuning (64 GB)

On unified memory, **BIOS GPU heap allocation** is the primary lever:

1. Enter MINISFORUM BIOS → set **UMA Frame Buffer / GPU Memory** to **maximum** (~48 GB).
2. Leave ~16 GB for Ubuntu, Telemetry Broker (Pillar 3), and Engine (Pillar 2).
3. Kernel supplement: `amdgpu.gttsize=49152` (applied by `setup-rocm-host.sh`).

Key `.env` knobs:

```bash
CURXOR_GPU_HEAP_GB=48
OLLAMA_MAX_LOADED_MODELS=1      # single hot VLA model
VLLM_GPU_MEMORY_UTILIZATION=0.88
```

## Systemd (boot persistence)

```bash
sudo cp systemd/curxor-compute.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now curxor-compute
```

## Phase 1 VLA Models

| Model | Stack | Role |
|-------|-------|------|
| `moondream:1.8b` | Ollama | Lightweight vision-language for clawbot cameras |
| `qwen3-vl:8b` | Ollama | Spatial vision + 256K context for complex scenes |
| `qwen3:8b` | Ollama | Default reasoning / planning backbone |
| `qwen3:14b` | Ollama | Mid-size reasoning for multi-step claws |
| `qwen3:30b` | Ollama | MoE general agent backbone on 64 GB UMA |
| `batiai/qwen3.6-35b:q4` | Ollama | Strix Halo coding MoE (pi-bench leader) |
| `qwen3:32b` | Ollama | Dense flagship for Pro 128 GB stacks |
| `OpenVLA/openvla-7b` | vLLM | Robotics VLA (action head for manipulation) |

Legacy Qwen2.5 tags remain in the Forge catalog for existing claw profiles.

Change models in `.env` — no cloud APIs required after initial weight pull.

## Pillar 1 → Pillar 2/3 Integration

- **Engine (Pillar 2)**: Point OpenClaw at `http://127.0.0.1:11434` (Ollama) or `http://127.0.0.1:8000/v1` (vLLM).
- **Dashboard (Pillar 4)**: Scrape `ollama ps` / vLLM `/metrics` for token throughput widgets.
- **Telemetry (Pillar 3)**: Bind inference to `127.0.0.1` only; robotics mesh stays on NIC port 2.

## Files

```
pillar-1-compute/
├── docker-compose.yml      # Ollama + vLLM profiles
├── .env.example              # UMA + model configuration
├── config/vllm/entrypoint.sh
├── scripts/
│   ├── setup-rocm-host.sh    # ROCm + Docker host prep
│   ├── configure-uma.sh      # BIOS/GTT validation
│   ├── verify-gpu.sh         # Pre-flight checks
│   ├── deploy.sh             # Main deploy orchestrator
│   └── pull-vla-models.sh    # Offline weight staging
└── systemd/curxor-compute.service
```
