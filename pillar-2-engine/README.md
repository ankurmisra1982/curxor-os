# CurXor OS — Pillar 2: The Engine (OpenClaw Pivot)

Node.js/pnpm agent framework refactored for **physical I/O only**. Digital tool integrations (email, web scraping, social media) are purged. The core reasoning loop calls **local inference only** — Ollama (default) or vLLM on localhost (Pillar 1).

## Architecture

```
telemetry/vision_in (9101) ──SUB──► Agent Loop ──► Ollama :11434 / vLLM :8000/v1
                                        │
                                        └──PUB──► telemetry/motor_out (9200)
```

| Layer | Module | Role |
|-------|--------|------|
| Mesh | `src/telemetry/mesh-client.ts` | ZMQ SUB vision / PUB motor (matches `curxor_broker.client`) |
| Wire | `src/telemetry/motor-protocol.ts` | 40-byte struct compatible with Pillar 3 |
| Inference | `src/inference/local-inference.ts` | Ollama `/api/chat` or vLLM `/chat/completions` |
| Actions | `actions/physical/` | Physical tool definitions only |
| Loop | `src/agent/loop.ts` | Vision → reason → motor publish |

## Purged Digital Tools

The following OpenClaw digital integrations are **removed** (see `src/tools/registry.ts`):

- `email.send`, `web.scrape`, `browser.navigate`
- `social.post`, `cloud.storage`, `calendar.read`
- `http.fetch_external`

## Physical Actions

| Action | Description |
|--------|-------------|
| `physical.ingest_vision` | Return latest camera frame metadata from mesh |
| `physical.publish_motor` | Publish 40-byte motor struct to `telemetry/motor_out` |
| `physical.move_claw` | High-level coordinate move (wraps motor publish) |

## Install (Ubuntu 24.04)

Requires Pillars 1 and 3 running.

```bash
sudo cp -r pillar-2-engine /opt/curxor/pillar-2-engine
cd /opt/curxor/pillar-2-engine
chmod +x scripts/*.sh
sudo ./scripts/install.sh

sudo cp .env.example /etc/curxor/engine.env
# Set CURXOR_MESH_BROKER_IP to eno2 mesh address (e.g. 10.77.0.1)

sudo systemctl enable --now curxor-engine
journalctl -u curxor-engine -f
```

## Development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Configuration (`/etc/curxor/engine.env`)

```bash
CURXOR_INFERENCE_BACKEND=ollama
CURXOR_INFERENCE_BASE_URL=http://127.0.0.1:11434
CURXOR_OLLAMA_URL=http://127.0.0.1:11434
CURXOR_INFERENCE_MODEL=qwen3:8b
CURXOR_MESH_BROKER_IP=10.77.0.1
CURXOR_VISION_XPUB_PORT=9101
CURXOR_MOTOR_XSUB_PORT=9200
CURXOR_TOPIC_VISION=telemetry/vision_in
CURXOR_TOPIC_MOTOR=telemetry/motor_out
```

Cloud inference URLs are **rejected at startup** if not localhost.

## Python Broker Compatibility

The Node mesh client mirrors `curxor_broker.client` wire format. Verify with:

```bash
/opt/curxor/pillar-3-telemetry/.venv/bin/python /opt/curxor/pillar-2-engine/scripts/python-mesh-smoke.py
```

## Project Layout

```
pillar-2-engine/
├── actions/physical/          # Physical tool definitions (NEW)
│   ├── ingest-vision.ts
│   ├── publish-motor.ts
│   └── move-claw.ts
├── src/
│   ├── agent/loop.ts          # Core reasoning loop
│   ├── inference/local-inference.ts
│   ├── telemetry/             # ZMQ + wire protocols
│   └── tools/registry.ts      # Physical-only registry
├── systemd/curxor-engine.service
└── scripts/install.sh
```

## Integration

| Pillar | Interface |
|--------|-----------|
| **Pillar 1** | `POST http://127.0.0.1:8000/v1/chat/completions` |
| **Pillar 3** | SUB `:9101` vision, PUB `:9200` motor |
| **Pillar 4** | Dashboard reads same mesh topics (future) |
