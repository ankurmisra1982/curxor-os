# CurXor ops credentials (local · CTO-managed)

> **Founder + CTO only.** Never commit secrets. Never paste API keys in Cursor chat.

## Identity

- **Primary:** `ops@curxor.ai` (Google Workspace)
- **Runtime on dev:** `config/local/ops-digital.env` (gitignored)
- **Runtime on appliance:** `/etc/curxor/digital.env`

## Setup (first time)

From repo root:

```bash
cd pillar-4-dashboard
npm run setup:ops-env
```

Then edit **`config/local/ops-digital.env`** (created from `ops-digital.env.example`) with keys from provider dashboards.

Optional recovery copy: private Google Doc on `ops@curxor.ai` only — not 1Password required at solo stage.

## Push keys to the appliance

After editing **`config/local/ops-digital.env`** on the laptop:

```powershell
.\scripts\push-ops-env-to-box.ps1
```

Installs to **`/etc/curxor/digital.env`** (mode 600, `curxor:curxor`) and restarts the dashboard. CRLF-safe.

## Rules

1. **No secrets in chat** — build agent reads `ops-digital.env` locally only.
2. **Paper only** for Alpaca until hardware golden path + explicit live flip.
3. **Wave order:** Google OAuth → Alpaca paper → Bluesky / Telegram / Discord → Wave 2 (X, Meta, HubSpot, M365, Garmin, Slack, WhatsApp).
4. Production keys live on the appliance, not on a dev laptop long-term.

## Full key catalog

See `config/digital/digital.env.example` for every bridge the product supports. This folder holds the **ops identity subset** used for dogfooding and demo proof.
