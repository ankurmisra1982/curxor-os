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
| `capital.execute_trade` | AlpacaTradeWorker | **Capital Claw** · `ALPACA_*` in `/etc/curxor/digital.env` |
| `content.publish_post` | XPublishWorker | **X** · `X_*` in `digital.env` |
| `content.publish_threads` | MetaPublishWorker | **Threads** · `META_ACCESS_TOKEN` + `META_THREADS_USER_ID` |
| `content.publish_facebook` | MetaPublishWorker | **Facebook Page** · `META_ACCESS_TOKEN` + `META_PAGE_ID` |
| `content.publish_instagram` | MetaPublishWorker | **Instagram** · `META_*` + `image_url` in payload |
| `content.publish_tiktok` | TikTokPublishWorker | **TikTok** · `TIKTOK_ACCESS_TOKEN` + `video_url` or `video_path` |
| `content.publish_youtube` | YouTubePublishWorker | **YouTube** · `YOUTUBE_*` OAuth refresh + `video_url` or `video_path` |
| `content.publish_linkedin` | LinkedInPublishWorker | **LinkedIn** · `LINKEDIN_ACCESS_TOKEN` + optional `LINKEDIN_AUTHOR_URN` |
| `content.publish_bluesky` | BlueskyPublishWorker | **Bluesky** · `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` |
| `content.publish_reddit` | RedditPublishWorker | **Reddit** · OAuth refresh + `REDDIT_DEFAULT_SUBREDDIT` |
| `content.publish_pinterest` | PinterestPublishWorker | **Pinterest** · OAuth refresh + `image_url` + `PINTEREST_DEFAULT_BOARD_ID` |
| `content.publish_snapchat` | SnapchatPublishWorker | **Snapchat** · OAuth refresh + `video_path`/`video_url` + `SNAP_PUBLIC_PROFILE_ID` |
| `channel.discord.send` | DiscordSendWorker | **Discord** · `DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_ID` |

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

## Related guides

- [Quick Start](00-quick-start.md)
- [Flight Command User Guide](07-flight-command-dashboard.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
