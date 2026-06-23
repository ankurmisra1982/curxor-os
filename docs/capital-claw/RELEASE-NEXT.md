# Capital Claw — Release Next

## Current policy: demo mode only

Ship and test without broker credentials. End users and developers can use the full desk UX with demo portfolio, PFM sample data, and local trade log. Bridge rails (Alpaca, Plaid, SnapTrade, live money) stay **opt-in** until the todo below is completed.

See [STARTUP-GUIDE.md](./STARTUP-GUIDE.md) for the day-one operator path.

## Todo — exit demo mode (when ready)

Scaffold (no keys): `npm run setup:capital-env` · `npm run verify:exit-demo-scaffold` · see [EXIT-DEMO.md](./EXIT-DEMO.md)

- [ ] **Alpaca paper keys** — `ALPACA_*` in `digital.env` · verify Go Live Alpaca step green · first paper fill via bridge
- [ ] **Plaid sandbox** — `PLAID_*` + Link bank in PFM panel · PFM `dataSource: plaid`
- [ ] **SnapTrade OAuth** — `SNAPTRADE_*` + link flow in Brokers panel
- [ ] **Live money gate** — set `CURXOR_CAPITAL_LIVE_ENABLED=1` only after paper path proven · FRE live + desk confirm
- [ ] **SnapTrade bridge worker** — pillar-3 execution for Fidelity/Public/TD (OAuth scaffold shipped; worker pending)
- [ ] **QA with keys** — re-run `npm run qa:local` with keys present · smoke `snaptrade`, `plaid`, live gate

Helper scripts: `npm run setup:capital-env` · `npm run configure:capital-keys` · `npm run verify:exit-demo-scaffold`

## Shipped (Sovereign Alpha Feed — fomo-inspired P0)

- **Alpha tab** — default home for Standard+ (`CapitalWorkspaceTabs`)
- **Alpha feed** — merged timeline: trades, pilots, movers, thesis, intel fires (`capital-alpha-feed.ts`)
- **Thesis journal** — local entries in intel cache v3 (`add_thesis` / `list_thesis`)
- **Alert preferences** — mover spike %, pilot min notional (`set_alert_preferences`)
- **New alert kinds** — `mover_spike`, `pilot_signal` with Telegram/Slack nudge
- **Chart overlays** — buy/sell/pilot markers on research charts
- **Pilot leaderboard** — ranked 24h / 7d / 30d / 1Y
- **Build plan** — [SOCIAL-ALPHA-BUILD-PLAN.md](./SOCIAL-ALPHA-BUILD-PLAN.md)

## Next dev sprint

- **Composer parity (Tier 1)** — [COMPOSER-PARITY-SPRINT.md](./COMPOSER-PARITY-SPRINT.md) · describe bar, backtest→arm, pilot filter, auto-approval UX

## Shipped (V4.6.2 — polish & exit-demo scaffold)

- **EXIT-DEMO.md** — operator guide for Alpaca paper / Plaid / SnapTrade without changing demo policy
- **verify:exit-demo-scaffold** — 8 checks (env template, go_live, broker routes) · wired into `qa:local`
- **Go Live panel** — inline exit-demo commands when Alpaca keys absent
- **digital.env.example** — Webull + E*TRADE vars · `demo:capture:capital` script
- **Chat skill parity** — `create_rule` + `arm_rule` executors; plan skills unblocked in `executeMyCapitalSkill`
- **Docs sync** — BEST-IN-CLASS / RELEASE-NEXT deferred sections updated
- **Tagged v0.3.4**

## Shipped (V4.6 — day-one excellence sprint)

- **Setup Wizard** — 5-step risk → rule → arm → execute → Go Live (`CapitalSetupWizard.tsx`)
- **Analytics tab** — desk analytics, rule scorecard, tax lots, portfolio Q&A (Standard+)
- **Go Live semantics** — `demoReady` / `paperReady` without requiring Alpaca in demo mode
- **Walk-forward backtest** — `walk_forward_backtest` action with overfit risk label
- **Rebalance rule builder** — Signal / Rebalance toggle in visual rule builder
- **Heartbeat desk alerts** — portfolio health, stale pending approval, dormant armed rules
- **NL portfolio queries** — `nl_portfolio_query` + MCP `query_portfolio` + chat skill
- **Chat skills** — `run_demo_tour`, `execute_now`, `portfolio_query`
- **UX polish** — coach banner, benchmark strip, post-execute scroll, Beginner unlock nudge

## Shipped (V4.6.1 — review hardening)

- **Rebalance end-to-end** — portfolio health CTAs create + arm rules; chat `rebalance` skill executes
- **Setup Wizard** — strict `ok` checks; finish blocked until `demoReady` or `paperReady`
- **Go Live persistence** — Standard+ panel stays until `paperReady`
- **Pending banner** — gated to Standard+ (Beginner sees recent trades strip only)
- **Tools/MCP parity** — `query_portfolio`, `get_go_live_report`, `walk_forward_backtest`
- **Analytics fix** — sell win-rate from avg-cost pairing; SPY benchmark from movers feed
- **QA** — rebalance rule, walk-forward, wizard API sequence, tools smoke

## Shipped (V4.5 — demo excellence)

- **Simulated fills** — no broker keys → `simulated` status at quote price (not failed)
- **Run demo tour** — Go Live one-click: rule → arm → simulated execute
- **Trade decision timeline** — Standard+ trade log + permission tier matrix
- **Beginner recent trades** strip + click-to-cycle experience level (beginner/standard/expert)
- **FIFO cost basis beta** + wash-sale hint from trade history
- **Crypto/options rule conditions** (beta) in visual builder
- **Pending approval email** via `CURXOR_CAPITAL_APPROVAL_EMAIL` + SMTP

## Shipped
- **Sprints 1–3** — Risk guard, rule engine, heartbeat, TradingView, autonomous modes, broker registry
- **Broker adapters** — Alpaca brackets, Webull OAuth, E*TRADE OAuth 1.0a
- **Pilot marketplace** — Autopilot-style browse/subscribe/proportional copy (`capital-pilot-*`)

## Deferred (requires keys or pillar-3 worker)

- SnapTrade **execution** worker (OAuth + desk link shipped)
- Robinhood MCP **sovereign execution** (catalog + link UI shipped)
- Full tax-lot engine (FIFO/LIFO — beta avg-cost shipped in health panel)
- Options/crypto **bridge execution** (condition types in builder shipped)
- Full 13F holdings XML parse (signal aggregation shipped)
- Webull signed OpenAPI (non-OAuth) for institutional keys

## Intel sprint (shipped)

- Alpaca News + SEC 8-K + provider registry with cache TTL
- Intel-to-action: dip rule, watchlist, alerts (Telegram/Slack)
- Agent tools API (`/api/capital/tools`) + mesh `intel.*` context
- `research_ticker`, `subscribe_pilot`, `sync_pilots`, `create_rule_from_thesis` skill executors

## Day-one desk UX (shipped)

- Enhanced research chart (range toggle, gradient, hover)
- Corporate actions + earnings on ticker card
- SEC Form 4 in digest
- Watchlist pulse strip, pending-trade banner, movers → research
- Keyword alerts, rule-from-thesis, pilot credibility UI
- QA: `create_dip_rule`, `add_to_watchlist`, `create_rule_from_thesis`, idempotent `subscribe_pilot`

## V2 (shipped)

- TradingView Lightweight Charts on Expert research panel
- Live SEC pilot feeds (`refresh_pilot_feeds` + hourly heartbeat)
- Robinhood MCP bridge (`/api/capital/robinhood`, `capital.execute_trade_robinhood`)
- Enhanced sentiment scoring (negation, emoji, confidence)
- Visual rule builder + structured `create_rule`
- Multi-account: `activeBrokerId`, broker panel Set active
- QA: `refresh_pilot_feeds`, `set_active_broker`, robinhood status
