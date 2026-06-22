# Capital Claw — Getting Started

Capital Claw (`/my-capital`) is your on-appliance rule engine for paper trading via Alpaca.

> **Current release: demo mode only.** No broker keys required to use the desk. See [STARTUP-GUIDE.md](./STARTUP-GUIDE.md) for the day-one path; broker setup is deferred — [RELEASE-NEXT.md](./RELEASE-NEXT.md) todo list.

## Day-one checklist (demo)

1. **Complete FRE setup** — risk profile, **Paper only** mode, seed watchlist.
2. Open **Setup Wizard** (header) or **Go Live** — Alpaca warning is OK without keys; demo portfolio is seeded.
3. **Create & arm a rule** — visual WHEN/THEN builder in Rule engine, or rebalance rule from Portfolio health hints.
4. **Preview & execute** — trades log locally; bridge fills when Alpaca keys are added later.
5. **Standard+**: Analytics tab (scorecard, walk-forward, NL Q&A), full trade log, pending-approval banner.
6. Explore **research**, **pilots**, **PFM** (Mint-style demo data), **agent/MCP** preview flows.

Skip [Broker & live rails](#broker--live-rails) until you exit demo mode.

## Broker & live rails (deferred — not required for demo)

When ready to exit demo mode, see **[EXIT-DEMO.md](./EXIT-DEMO.md)** (step-by-step) and [RELEASE-NEXT.md](./RELEASE-NEXT.md) todo **Exit demo mode**.

### Local dev (Windows / macOS)

```bash
cd pillar-4-dashboard
npm run setup:capital-env
npm run verify:exit-demo-scaffold
npm run configure:capital-keys   # optional — opens signup pages
```

This creates `scripts/dev-qa/digital.env` and `.env.local` pointing at it. Edit `digital.env`:

| Variable | Where to get it |
|----------|-----------------|
| `CURXOR_CAPITAL_LIVE_ENABLED` | Leave `0` for demo; set `1` only when exercising live-money gate |
| `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY` | [Alpaca paper dashboard](https://app.alpaca.markets/paper/dashboard/overview) |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | [Plaid dashboard](https://dashboard.plaid.com/developers/keys) · use `PLAID_ENV=sandbox` |
| `SNAPTRADE_CLIENT_ID` / `SNAPTRADE_CONSUMER_SECRET` | [SnapTrade](https://snaptrade.com/) developer portal |

Then `npm run dev` and open Capital desk → **Brokers** (SnapTrade link) · **PFM** (Plaid Link bank).

### Production appliance

```bash
sudo cp config/digital/digital.env.example /etc/curxor/digital.env
sudo chmod 600 /etc/curxor/digital.env
```

Set the same Capital variables in `/etc/curxor/digital.env`. Set `CURXOR_CAPITAL_LIVE_ENABLED=1` only when you intend to exercise live-money mode (paper remains default until FRE switches to `live` and you confirm in **Risk & permissions**).

Required Alpaca keys for paper bridge:

- `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY`, `ALPACA_PAPER_BASE_URL`

## Modes

| Mode | Behavior |
|------|----------|
| `paper` | Real Alpaca paper orders via bridge |
| `dry_run` | Log trade locally only — no bridge call |

## Autonomous trading

Grant permission on the **Risk & permissions** panel:

| Mode | Behavior |
|------|----------|
| `off` | Manual + agent skills only |
| `approval_each` | Heartbeat/agent fires → Telegram approval → Submit |
| `auto_armed_rules` | Armed rules auto-evaluate on heartbeat (risk guard applies) |

## Heartbeat daemon

The dashboard heartbeat (`scripts/heartbeat-daemon.mjs`) keeps Capital Claw warm without manual refreshes:

| Tick | Action | Purpose |
|------|--------|---------|
| Rules | `evaluate_rules` | Auto-fire armed rules when `autonomousMode` is `auto_armed_rules` |
| Pilots | `sync_pilot_subscriptions` | Mirror subscribed pilot signals into the trade queue |
| Intel | `GET /api/capital/intel?refresh=1` | Refresh market digest cache (`CURXOR_CAPITAL_INTEL_PATH`) |
| Alerts | `POST /api/capital/intel` `{ "action": "evaluate_alerts" }` | Telegram/Slack nudges on dip or sentiment triggers |
| PFM | `POST /api/capital/pfm` `{ "action": "refresh_snapshot" }` | Cash-flow and spending snapshot when Plaid is linked |
| Quotes | `refresh_quotes` | Movers and position marks (Standard+ desk lazy-load) |

Run locally: `node scripts/heartbeat-daemon.mjs --base http://127.0.0.1:3080`. On appliance, systemd timer or cron invokes the same script against the LAN dashboard port.

## TradingView webhooks

Set `CURXOR_CAPITAL_TV_SECRET` and point alerts to:

`POST /api/capital/tradingview` with header `X-Curxor-Tv-Secret: <secret>`

```json
{ "ticker": "NVDA", "action": "buy", "qty": 1, "ruleId": "RULE-02" }
```

## Pilot marketplace (copy trading)

Inspired by [Autopilot](https://www.joinautopilot.com/landing) — sovereign on-appliance:

```json
{ "action": "list_pilots" }
{ "action": "subscribe_pilot", "pilotId": "PILOT-NDAQ10", "allocationUsd": 1000, "brokerId": "alpaca" }
{ "action": "emit_pilot_signal", "pilotId": "PILOT-NDAQ10", "ticker": "NVDA", "pilotQty": 100, "actionTrade": "buy" }
{ "action": "sync_pilot_subscriptions" }
{ "action": "pause_subscription", "subscriptionId": "SUB-01" }
```

Demo pilots are **not** affiliated with third-party trackers — for paper testing only.

## Market intel & ticker research

Capital desk surfaces TradingView-style basics plus social chatter:

- **Fundamentals** — price, market cap, P/E, 52-week range, 3-month chart (Yahoo Finance)
- **News** — CNBC RSS headlines
- **Chatter** — Reddit WSB / r/stocks / r/investing, X FinTwit (live with `X_BEARER_TOKEN`, demo fallback otherwise)
- **Smart take** — one-line synthesis from local LLM when inference is enabled

```http
GET /api/capital/intel
GET /api/capital/intel?ticker=NVDA&refresh=1
POST /api/capital/intel  { "action": "ticker_lookup", "ticker": "NVDA" }
POST /api/capital/intel  { "action": "refresh_digest" }
```

Cache path: `CURXOR_CAPITAL_INTEL_PATH` (default `/etc/curxor/capital-intel.json`). Heartbeat refreshes the digest each tick.

**Experience levels** — Beginner gets ticker search + smart take + top headlines; Standard adds chart, fundamentals, WSB/Reddit/FinTwit chatter, intel alerts, and the market digest panel; Expert shows engagement counts, sentiment scores, and the full digest feed.

**Intel-to-action** — From research: Arm 5% dip rule · Add to watchlist · Intel alerts (Telegram/Slack).

**Data sources** — Yahoo fundamentals · Alpaca News (Benzinga) · CNBC RSS · SEC 8-K · Reddit · X FinTwit.

Agent tools: `GET /api/capital/tools?tool=get_ticker_intel&ticker=NVDA`

## Broker linking (Webull / E*TRADE)

1. Add app credentials to `digital.env` (see `digital.env.example`).
2. Capital desk → **Broker integrations** → **Link account** (opens OAuth in browser).
3. Or via API:
   - Webull: `POST /api/capital/webull` `{ "action": "start" }` → open `authorizeUrl`
   - E*TRADE: `POST /api/capital/etrade` `{ "action": "start" }` → open `authorizeUrl`, complete verifier callback

Rules can set `brokerId` to `webull` or `etrade`; bridge dispatches by `broker_id` in the trade intent.

## Bracket orders (Alpaca)

Rules with `takeProfitPct` / `stopLossPct` submit Alpaca `order_class: bracket`. Dashboard passes computed prices from quote cache; bridge falls back to Alpaca data API for reference price.

## Broker integrations

See [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — Alpaca (live), TradingView (webhook), Robinhood MCP (agent catalog), Webull/E*TRADE (planned).

## API

`POST /api/capital/status`:

```json
{ "action": "dashboard_bootstrap" }
{ "action": "run_demo_tour" }
{ "action": "go_live" }
{ "action": "execute_now", "ruleId": "RULE-01" }
{ "action": "create_rule", "name": "BTC dip", "asset": "BTC-USD", "qty": 0.01 }
{ "action": "arm_rule", "ruleId": "RULE-01" }
{ "action": "execute_trade", "ruleId": "RULE-01" }
{ "action": "set_autonomous_mode", "autonomousMode": "auto_armed_rules" }
{ "action": "evaluate_rules" }
{ "action": "refresh_quotes" }
{ "action": "backtest_rule", "ruleId": "RULE-01" }
{ "action": "recovery_retry", "tradeId": "TRD-001" }
```

## Agent skills

- **Create Rule** — add rule to local store
- **Arm Rule** — enable selected rule
- **Execute Trade** — paper order via Alpaca bridge
- **Subscribe Pilot** — mirror marketplace portfolio
- **Sync Pilots** — rebalance active subscriptions
- **Research Ticker** — fundamentals + news + social chatter

## Environment

| Variable | Purpose |
|----------|---------|
| `CURXOR_CAPITAL_QUEUE_PATH` | Rules + trade log store |
| `CURXOR_CAPITAL_INTEL_PATH` | Market digest + ticker intel cache |
| `CURXOR_CAPITAL_REQUIRE_APPROVAL` | `1` to queue trades for manual submit |
| `CURXOR_CAPITAL_TV_SECRET` | TradingView webhook auth header |
| `CURXOR_CAPITAL_LIVE_ENABLED` | `1` to unlock live-money FRE (requires desk confirm) |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` | Plaid Link for PFM (`sandbox` or `production`) |
| `SNAPTRADE_CLIENT_ID` / `SNAPTRADE_CONSUMER_SECRET` | SnapTrade OAuth for multi-broker link |
| `CURXOR_DIGITAL_ENV_PATH` | Override path to digital.env (local: `scripts/dev-qa/digital.env`) |
| `CURXOR_CAPITAL_FAILURE_NOTIFY` | Telegram/Slack on failed trades |
| `SEC_EDGAR_CONTACT_EMAIL` | SEC fair-access User-Agent contact |
| `ALPACA_DATA_BASE_URL` | Alpaca news/data API base |

## Demo mode

Without Alpaca keys, portfolio shows demo values and rules seed from FRE watchlist. Trades log locally; bridge returns failure until keys are set. **This is the intended default for the current release** — see [STARTUP-GUIDE.md](./STARTUP-GUIDE.md).
