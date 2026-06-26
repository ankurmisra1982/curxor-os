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

## UMA tuning

The Ryzen AI Max+ 395 uses unified memory — GPU and CPU share the same physical RAM.

### Standard 64 GB

1. **BIOS** — set GPU UMA frame buffer to maximum (~48 GB) — [Hardware & BIOS guide](10-ms-s1-max-hardware-bios.md)
2. **Leave headroom** — ~12–16 GB for Ubuntu, broker, engine, dashboard
3. **Kernel** — `setup-rocm-host.sh` may apply `amdgpu.gttsize=49152`

```bash
CURXOR_TOTAL_RAM_GB=64
CURXOR_GPU_HEAP_GB=48
```

### Pro 128 GB

1. **BIOS** — UMA **Maximum** (~96 GB GPU heap typical)
2. **Leave headroom** — ~16–32 GB for OS + Pillars 2–4
3. **Kernel** — `configure-uma.sh --apply-grub` with `CURXOR_GPU_HEAP_GB=96` → `amdgpu.gttsize=98304`

```bash
CURXOR_TOTAL_RAM_GB=128
CURXOR_GPU_HEAP_GB=96
```

Full unbox steps: [MS-S1-128GB-UNBOX-CHEATSHEET.md](../curxor-os/MS-S1-128GB-UNBOX-CHEATSHEET.md)

Key env knobs in `compute.env` (both SKUs):

```bash
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
| Vision (light) | `moondream:1.8b` | Kiosks, fleet, capital — lowest UMA |
| Vision (spatial) | `qwen3-vl:8b` | Balanced/performance — agentic scenes, 256K context |
| Reasoning (default) | `qwen3:8b` | Agent backbone — tool-calling on gfx1151 |
| Reasoning (mid) | `qwen3:14b` | Content, capital, fleet planning |
| Reasoning (max 64 GB) | `qwen3:30b` or `batiai/qwen3.6-35b:q4` | MoE — qwen3.6 leads Strix Halo coding benchmarks ([pi-bench](https://pi-local-coding-bench.dev/)) |
| Reasoning (Pro 128 GB) | `batiai/qwen3.6-35b:q6` or `batiai/qwen3.6-27b:q4` | Dense or high-bit Qwen3.6 for Build Plane / heavy coding |
| VLA (optional) | `OpenVLA/openvla-7b` via vLLM | Manipulation workloads |

Qwen2.5 tags remain supported for legacy claw profiles. Frontier models (GLM 5.2, DeepSeek V4, etc.) are **not** local defaults — they exceed MS-S1 UMA; use optional BYOK if needed.

Configured in `compute.env` as `OLLAMA_VLA_MODEL`, `OLLAMA_REASONING_MODEL`, `OLLAMA_EXTRA_MODELS` (Pro 128). Template: `pillar-1-compute/config/compute.env.pro128.example`.

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
| `/etc/curxor/compute.env` | `CURXOR_INFERENCE_BACKEND`, model pull vars |
| `/etc/curxor/engine.env` | `CURXOR_INFERENCE_BACKEND`, `CURXOR_INFERENCE_MODEL` |
| `/etc/curxor/dashboard.env` | `CURXOR_INFERENCE_BACKEND`, `CURXOR_INFERENCE_MODEL`, `CURXOR_DASHBOARD_INFERENCE_ENABLED` |

Engine and dashboard default to Ollama at `127.0.0.1:11434`. Cloud inference URLs are **rejected** at runtime.

## Dashboard consumption (Pillar 4)

Flight Command uses the **same local stack** as the engine for chat — not bundled in the Next.js build.

| Consumer | When |
|----------|------|
| Pillar 2 engine | Every new vision frame (rate-limited) |
| The Forge (`/api/claw/assist`) | Operator chat + multimodal forge assist |
| Creator / Capital agents | Chat + Draft Post / Create Rule skills |
| Other app agents | Rule-based fallback; skills unchanged |

Requests are **serialized** in the dashboard to reduce UMA contention with the engine loop. Set `CURXOR_DASHBOARD_INFERENCE_ENABLED=0` to disable dashboard LLM calls while keeping the engine on inference.

Verify from the appliance:

```bash
curl -sf http://127.0.0.1:3080/api/metrics/compute | jq .backend
# "ollama" when tags endpoint reachable; "unknown" when compute down
```

See [Flight Command User Guide](07-flight-command-dashboard.md) for operator workflows.

## Related guides

- [Engine & Claws](05-engine-and-claws.md)
- [Architecture](02-architecture.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
