# Agent Runtime — OpenClaw-style capabilities on CurXor

June 2026 · Sovereign appliance layer (Pillar 4 + eno2 bridges)

## Overview

CurXor implements OpenClaw-inspired patterns **without** replacing the four-pillar split:

| OpenClaw pattern | CurXor implementation |
|------------------|----------------------|
| SOUL.md / USER.md / MEMORY.md | `/etc/curxor/agent-workspace/` |
| TOOLS.md / HEARTBEAT.md | Per-Claw workspace + scheduler |
| agentskills.io SKILL.md | `agent-workspace/{appId}/skills/*.md` |
| Messaging gateway | `/api/channels` + Telegram + Slack + WhatsApp + iMessage |
| Always-on daemon | `curxor-scheduler.service` + heartbeat runner |
| Session routing | Channel sessions → `assistAppAgent` |
| Egress control | Digital bridges on eno2 only |

## Persistence paths

| Path | Purpose |
|------|---------|
| `/etc/curxor/agent-workspace/_global/USER.md` | Operator profile |
| `/etc/curxor/agent-workspace/_global/MEMORY.md` | Cross-session memory |
| `/etc/curxor/agent-workspace/{appId}/SOUL.md` | Claw personality |
| `/etc/curxor/agent-workspace/{appId}/TOOLS.md` | Tool reference |
| `/etc/curxor/agent-workspace/{appId}/HEARTBEAT.md` | Scheduled checks |
| `/etc/curxor/agent-workspace/{appId}/skills/*.md` | Custom skills |
| `/etc/curxor/scheduler/jobs.json` | Cron / interval jobs |
| `/etc/curxor/channels/config.json` | Gateway config |
| `/etc/curxor/channels/sessions.json` | Per-chat sessions |
| `/etc/curxor/ccp-consent.json` | Scope consent matrix |
| `/etc/curxor/garmin-oauth.json` | Garmin OAuth tokens (v0.2) |

Env overrides: `CURXOR_AGENT_WORKSPACE_PATH`, `CURXOR_SCHEDULER_PATH`, `CURXOR_CHANNELS_PATH`, `CURXOR_CCP_CONSENT_PATH`.

## API routes

| Route | Purpose |
|-------|---------|
| `GET/POST /api/agent-workspace/[appId]` | Read/write workspace files |
| `GET /api/app-agent/[appId]` | Resolved agent + custom skills |
| `GET/POST /api/scheduler` | Jobs; `action: run_due` |
| `GET/POST /api/channels` | Gateway config |
| `POST /api/channels/telegram/webhook` | Telegram inbound |
| `POST /api/channels/slack/events` | Slack Events API |
| `GET/POST /api/channels/whatsapp/webhook` | WhatsApp Cloud API |
| `GET/POST /api/channels/imessage/webhook` | BlueBubbles iMessage bridge |
| `POST /api/channels/webchat` | Dashboard chat (same router as external channels) |
| `GET /api/channels/inbox` | Unified inbox — all sessions + CCP preview |
| `GET/POST /api/vital/garmin` | Garmin OAuth PKCE link + refresh |
| `GET/POST /api/mcp` | MCP servers (live JSON-RPC) + egress allowlist |
| `GET/POST /api/mesh/consent` | CCP consent matrix |
| `POST /api/vital/ingest` | Localhost-only vital readings from bridges |

## Digital bridge tools (eno2)

| Tool ID | Worker |
|---------|--------|
| `health.sync_wearables` | Oura PAT, Apple Health export, Garmin OAuth |
| `channel.telegram.send` | Outbound Telegram |
| `channel.slack.send` | Outbound Slack |
| `channel.whatsapp.send` | Outbound WhatsApp Cloud API |
| `channel.imessage.send` | Outbound iMessage via BlueBubbles |
| `browser.fetch_page` | Headless HTTP fetch |
| `browser.automate` | Playwright automation (optional: `pip install -e '.[browser]'`) |

Credentials: `/etc/curxor/digital.env` — `TELEGRAM_BOT_TOKEN`, `SLACK_BOT_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `BLUEBUBBLES_SERVER_URL`, `BLUEBUBBLES_PASSWORD`, `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, `OURA_PERSONAL_ACCESS_TOKEN`, `APPLE_HEALTH_EXPORT_PATH`.

## Heartbeat daemon

```bash
# Dev
npm run heartbeat:daemon

# Production
sudo systemctl enable --now curxor-scheduler.service
```

Parses `HEARTBEAT.md` via Settings or `POST /api/agent-workspace/[appId]` with `action: sync_heartbeat`.

## Telegram setup

1. Create bot via @BotFather → add `TELEGRAM_BOT_TOKEN` to `digital.env`
2. Settings → Agent runtime → Enable channels + Telegram
3. Generate webhook URL → register with Telegram `setWebhook`
4. Message bot: `/vital status` or `/capital what's my watchlist?`

## Slack setup

1. Create Slack app → **Event Subscriptions** → Request URL: `https://<appliance>/api/channels/slack/events`
2. Subscribe to bot message events (`message.im`, `message.channels`)
3. Add `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` to `digital.env`
4. Settings → Agent runtime → Enable Slack
5. DM the bot: `/vital status`

## WhatsApp setup (v0.2)

1. Meta Developer Console → WhatsApp Business → add `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to `digital.env`
2. Settings → Agent runtime → Enable WhatsApp → Generate verify token
3. Webhook URL: `https://<appliance>/api/channels/whatsapp/webhook` with the verify token
4. Subscribe to `messages` field

## iMessage setup (v0.2)

Requires a Mac running [BlueBubbles Server](https://bluebubbles.app/) on your LAN:

1. Set `BLUEBUBBLES_SERVER_URL` and `BLUEBUBBLES_PASSWORD` in `digital.env`
2. Settings → Agent runtime → Enable iMessage → copy webhook URL
3. BlueBubbles → Webhooks → POST to CurXor URL with header `x-curxor-imessage-secret`

## Garmin OAuth (v0.2)

1. Register app at [Garmin Developer Portal](https://developer.garmin.com/)
2. Add `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET` to `digital.env`
3. Settings → Agent runtime → Link Garmin
4. Tokens persist to `/etc/curxor/garmin-oauth.json`; eno2 bridge auto-refreshes

## Unified communications (v0.2.1)

All messaging — external channels and dashboard chat — flows through `channel-router` → `assistAppAgent` → CCP publish:

| Surface | Entry | Session id |
|---------|-------|------------|
| Dashboard chat | `POST /api/channels/webchat` | `webchat:{appId}` (session id) |
| Telegram / Slack / WhatsApp / iMessage | webhooks | `{channel}:{chatId}` |

CCP keys published by bridge:

- `work/inbox.{sessionId}` — unified comms rollup (Outreach, Optimus, Forge read this)
- `{scope}/inbox.{sessionId}` — app-specific scope (health, finance, family, …)
- `personal/comms.latest.{sessionId}` — household-aware latest

Kin routing: link channel handles on family profiles (`/my-family`) — WhatsApp phone, Telegram id, etc. map to `profileId` for CCP-scoped replies.

UI: **Home** and **Outreach Claw** show the unified inbox panel. `GET /api/channels/inbox` aggregates sessions + mesh preview.

## MCP live handshake (v0.2)

MCP servers register in Settings → Agent runtime. CurXor performs JSON-RPC `initialize` + `tools/list` against each enabled server URL (append `/mcp` if needed). Falls back to ping when the server is unreachable.

## Multi-model routing (Settings → Intelligence)

When enabled in user settings, frontier requests route by task type:

- **Coding** keywords → `codingProviderId`
- **Planning** keywords → `planningProviderId`
- **Long context** → `longContextProviderId`

Uses your own API keys / OAuth — no CurXor cloud.

## Related

- [15-claw-context-protocol.md](15-claw-context-protocol.md)
- [16-vital-claw.md](16-vital-claw.md)
- [12-digital-action-layer.md](12-digital-action-layer.md)
