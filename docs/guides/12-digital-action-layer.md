# Digital Action Layer

Sovereign split: the **engine never calls the internet**. Digital intents flow through ZeroMQ; Python bridges perform HTTPS.

## Mesh topics (shared proxy ports)

| Direction | Topic | Publisher connects | Subscriber connects |
|-----------|-------|-------------------|-------------------|
| Intent (out) | `telemetry/digital_out` | XSUB **:9200** | XPUB **:9201** |
| Receipt (in) | `telemetry/digital_in` | XSUB **:9100** | XPUB **:9101** |

Same physical/motor and vision proxy pairs — isolated by topic prefix.

## Flow

```
Local LLM → Engine tool → JSON intent → digital_out (:9200)
                              ↓
                    digital_bridges.py (Alpaca / X)
                              ↓
                    JSON receipt → digital_in (:9101)
                              ↓
              Dashboard SSE /api/stream/digital
```

## Tools

| Tool | Bridge worker | Credentials |
|------|---------------|-------------|
| `capital.execute_trade` | AlpacaTradeWorker | `ALPACA_*` in `/etc/curxor/digital.env` |
| `content.publish_post` | XPublishWorker | `X_*` in `/etc/curxor/digital.env` |

## Setup

```bash
sudo cp /opt/curxor/config/digital/digital.env.example /etc/curxor/digital.env
sudo chmod 640 /etc/curxor/digital.env
sudo chown root:curxor /etc/curxor/digital.env
# Edit keys, then:
sudo systemctl restart curxor-telemetry-broker
```

Service runs `curxor-broker-stack` (broker + digital bridges).

## Intent JSON (engine → bridge)

```json
{
  "id": "uuid",
  "tool": "capital.execute_trade",
  "timestamp": "2026-06-19T12:00:00Z",
  "payload": { "ticker": "AAPL", "qty": 1, "action": "buy" }
}
```

## Receipt JSON (bridge → UI)

```json
{
  "id": "uuid",
  "tool": "capital.execute_trade",
  "ok": true,
  "timestamp": "2026-06-19T12:00:01Z",
  "receipt": { "order_id": "…", "filled_price": "150.25", "status": "accepted" }
}
```
