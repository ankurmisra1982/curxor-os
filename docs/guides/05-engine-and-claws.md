# Engine & Claws Guide

Pillar 2 is the **OpenClaw physical agent** — a Node.js loop that reads vision from the mesh, reasons via local inference, and publishes motor commands.

## Agent loop

```
Vision SUB (:9101) → summarize frame → local inference → physical tool call → Motor PUB (:9200)
```

Key behaviors:

- Inference runs only on **new vision frames** (not every 50 ms tick)
- Minimum interval between reasoning calls (`CURXOR_MIN_REASON_INTERVAL_MS`, default 500 ms)
- Exponential backoff on inference errors (up to 30 s)

## Physical actions only

Digital integrations (email, web scrape, cloud APIs) are purged. Available tools:

| Tool | Description |
|------|-------------|
| `physical.ingest_vision` | Latest mesh frame metadata |
| `physical.publish_motor` | Raw 40-byte motor struct |
| `physical.move_claw` | High-level coordinate move |

## Configuration

`/etc/curxor/engine.env`:

```bash
CURXOR_INFERENCE_BACKEND=ollama
CURXOR_INFERENCE_MODEL=qwen2.5:7b-instruct-q4_K_M
CURXOR_MESH_BROKER_IP=10.77.0.1
CURXOR_VISION_XPUB_PORT=9101
CURXOR_MOTOR_XSUB_PORT=9200
CURXOR_CLAW_ID=1
CURXOR_MIN_REASON_INTERVAL_MS=500
```

Active claw override (written by dashboard wizard):

```
/etc/curxor/engine.env.d/active-claw.conf
```

Loaded by `curxor-engine.service` after `engine.env`.

## Claw wizard (Pillar 4)

Flight Command **Start New Claw** flow:

1. Operator describes intent (e.g. "Outbound sequence for SaaS leads")
2. Wizard recommends vision / reasoning / VLA models by budget tier
3. `POST /api/claw/create` saves profile to `/etc/curxor/claw-profiles.json`
4. Writes `active-claw.conf` and restarts engine via `apply-active-claw.sh`

Profile fields:

```json
{
  "id": "claw-…",
  "name": "Optimus Alpha",
  "intent": "…",
  "budgetTier": "balanced",
  "models": {
    "vision": "moondream:1.8b",
    "reasoning": "qwen2.5:7b-instruct-q4_K_M",
    "vla": null
  }
}
```

Backend selection logic:

- If `vla` model set → `CURXOR_INFERENCE_BACKEND=vllm`, model = VLA id
- Otherwise → Ollama with reasoning model

## Logs and debugging

```bash
journalctl -u curxor-engine -f
systemctl status curxor-engine

# Python mesh smoke test
/opt/curxor/pillar-2-engine/scripts/python-mesh-smoke.py
```

## Development (off-appliance)

```bash
cd pillar-2-engine
pnpm install && cp .env.example .env
pnpm build && pnpm dev
```

## Related guides

- [Telemetry Mesh](06-telemetry-mesh.md)
- [Inference & Compute](04-inference-compute.md)
- [Flight Command Dashboard](07-flight-command-dashboard.md)
