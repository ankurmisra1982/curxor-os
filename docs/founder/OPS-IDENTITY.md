# CurXor ops identity — founder + CTO

> **Room:** Founder / CTO only · not customer GTM  
> **Primary identity:** `ops@curxor.ai` (Google Workspace)  
> **Credential file (dev):** `config/local/ops-digital.env` (gitignored)  
> **Credential file (appliance):** `/etc/curxor/digital.env`

## Purpose

Dogfood every bridge the product sells: paper trading, social publish, Work comms, Vital wearables, messaging channels. Real receipts — not demo theater.

## Credential rules

| Do | Don't |
|----|-------|
| Store secrets in `config/local/ops-digital.env` | Paste keys in Cursor chat |
| Optional backup: private Google Doc on ops account | Commit `ops-digital.env` to git |
| CTO agent edits gitignored file in build chats | Use chat history as a vault |
| Paper Alpaca until G1 hardware + explicit live flip | Enable live money on day one |

## Wave checklist

### Wave 0 — Foundation

- [ ] Google Workspace user `ops@curxor.ai` + 2FA
- [ ] Recovery → `ankur@curxor.ai`
- [ ] Stable phone for SMS

### Wave 0.5 — Google Cloud (Work + YouTube)

- [ ] Project `curxor-ops` · OAuth consent **CurXor OS Ops**
- [ ] OAuth client · redirect `http://127.0.0.1:3080/api/work/google`
- [ ] Enable Gmail API + Calendar API

### Wave 1 — first smoke (tomorrow)

- [x] Google Workspace OAuth (ops@) — **linked**
- [ ] **X (Twitter)** — dev app + OAuth 1.0a keys → `X_*` in ops-digital.env (ops handle e.g. `@curxoros`; product `@curxorai` stays on `curxorsystems@gmail.com` login)
- [ ] **Bluesky** — app password (fastest publish smoke; do both if time allows)
- [ ] Alpaca **paper** (ops@curxor.ai)
- [ ] Telegram bot + chat ID
- [ ] Discord bot + channel ID
- [ ] Gmail SMTP/IMAP app password for ops mailbox (optional)

**X vs Bluesky (honest):** Bluesky = ~5 min, no app review. X = developer portal + keys, rate limits, aligns with GTM — worth Wave 1 if you have 30–45 min for [developer.x.com](https://developer.x.com). **Recommend both:** Bluesky for instant receipt, X for real fintwit/product dogfood path.

### Wave 2 — after Wave 1 green

X developer · Meta · HubSpot · M365 · Notion · Garmin · Slack · WhatsApp · Plaid sandbox

Redirect URIs: see `config/digital/digital.env.example` and build chat handoff in Program CP / this doc's sibling `config/local/README.md`.

## Dev bootstrap

```bash
cd pillar-4-dashboard
npm run setup:ops-env
# edit config/local/ops-digital.env
npm run dev
```

## Partner split

| Ankur | CTO agent (build chat) |
|-------|------------------------|
| Signups, SMS, 2FA, legal clicks | `setup:ops-env`, bridge health, smoke tests |
| Owns ops@curxor.ai | Reads gitignored env only — no chat secrets |
| Approve publish/trade when gated | Document Wave 2 gaps |

## Autonomous ops (honest)

Claws run on the appliance with ops creds. **You** remain approval partner for money, publish, and egress. "CurXor OS lives on platforms" means real bridge receipts from this identity — not an independent legal actor.
