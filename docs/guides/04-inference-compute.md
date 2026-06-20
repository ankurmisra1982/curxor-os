# Inference & Compute Guide

Pillar 1 delivers local ROCm inference via Docker Compose on the MS-S1 MAX unified memory architecture.

## Backends

| Backend | Docker profile | API | Default |
|---------|---------------|-----|---------|
| **Ollama** | `ollama` | `http://127.0.0.1:11434` | Yes — most stable on gfx1151 |
| **vLLM** | `vllm` | `http://127.0.0.1:8000/v1` | Experimental OpenVLA serving |

Set in `/etc/curxor/compute.env`:

```bash
CURXOR_INFERENCE_BACKEND=ollama   # or vllm
```

## UMA tuning (64 GB)

The Ryzen AI Max+ 395 uses unified memory — GPU and CPU share the same physical RAM.

1. **BIOS** — set GPU UMA frame buffer to maximum (~48 GB) — [Hardware & BIOS guide](10-ms-s1-max-hardware-bios.md)
2. **Leave headroom** — ~12–16 GB for Ubuntu, broker, engine, dashboard
3. **Kernel** — `setup-rocm-host.sh` may apply `amdgpu.gttsize=49152`

Key env knobs in `compute.env`:

```bash
CURXOR_TOTAL_RAM_GB=64
CURXOR_GPU_HEAP_GB=48
CURXOR_MODELS_DIR=/var/lib/curxor/models
```

## Install and deploy

```bash
# Installed by meta-installer; re-run if needed:
sudo /opt/curxor/pillar-1-compute/scripts/install.sh

# Deploy containers + pull models
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models

# Switch backend
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --backend vllm --pull-models
```

Verify GPU:

```bash
/opt/curxor/pillar-1-compute/scripts/verify-gpu.sh
docker ps
curl -s http://127.0.0.1:11434/api/tags   # Ollama
curl -s http://127.0.0.1:8000/v1/models    # vLLM
```

## Recommended models (Ollama default stack)

| Role | Model | Notes |
|------|-------|-------|
| Vision | `moondream:1.8b` | Lightweight spatial vision |
| Reasoning | `qwen2.5:7b-instruct-q4_K_M` | Agent backbone |
| VLA (optional) | `OpenVLA/openvla-7b` via vLLM | Manipulation workloads |

Configured in `compute.env` as `OLLAMA_VLA_MODEL`, `OLLAMA_REASONING_MODEL`, etc.

## Systemd integration

`curxor-compute.service`:

- Reads `/etc/curxor/compute.env`
- Runs `docker compose --profile ${CURXOR_INFERENCE_BACKEND} up -d`
- Type `oneshot` with `RemainAfterExit=yes`

```bash
sudo systemctl restart curxor-compute
```

## Alignment with other pillars

Ensure matching backend across env files:

| File | Key |
|------|-----|
| `/etc/curxor/compute.env` | `CURXOR_INFERENCE_BACKEND` |
| `/etc/curxor/engine.env` | `CURXOR_INFERENCE_BACKEND`, `CURXOR_INFERENCE_MODEL` |
| `/etc/curxor/dashboard.env` | `CURXOR_INFERENCE_BACKEND` |

Engine defaults to Ollama at `127.0.0.1:11434`. Cloud inference URLs are **rejected** at engine startup.

## Related guides

- [Engine & Claws](05-engine-and-claws.md)
- [Architecture](02-architecture.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
