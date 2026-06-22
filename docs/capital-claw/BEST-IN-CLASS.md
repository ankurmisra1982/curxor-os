# Capital Claw — best-in-class landscape

Research snapshot for Sprints 1–3 (June 2026). CurXor’s wedge: **sovereign on-appliance** — LLM plans, deterministic risk guard executes, egress only via eno2.

## Agent-native finance

| Product | Model | CurXor takeaway |
|---------|--------|-----------------|
| [Era](https://era.app/en-GB) | MCP-native finance, explicit permissions, RIA-backed automations | Match **permission granularity** (off / per-trade / auto-armed) and MCP catalog for brokers |
| [Autopilot](https://www.joinautopilot.com/landing) | Copy-trading marketplace — pick pilot, connect brokerage, proportional mirror | **Pilot marketplace** + subscriptions + proportional copy on sovereign bridge |
| TradingView / CNBC / Reddit | Fundamentals, charts, headlines, WSB chatter | **Ticker research** — Yahoo basics + CNBC + Reddit + FinTwit digest, local LLM smart take |
| [Composer](https://www.composer.trade/) | No-code strategy builder + auto execution | Rule engine + backtest on save |
| [Robinhood Agentic Trading](https://robinhood.com/us/en/support/articles/agentic-trading-overview/) | Official MCP at `https://agent.robinhood.com/mcp/trading`, isolated agentic account | Listed in broker registry as **MCP tier** — user connects from agent settings |

## Institutional rails

| Product | Model | CurXor takeaway |
|---------|--------|-----------------|
| [Clear Street](https://www.clearstreet.com/) | Prime brokerage, institutional API/MCP | Reference for **risk + execution separation** — not retail-focused |

## Retail brokers (integration tiers)

| Broker | API | Capital Claw tier |
|--------|-----|-------------------|
| **Alpaca** | REST paper/live | **Live** — `capital.execute_trade` bridge |
| **TradingView** | Alert webhooks | **Webhook** — `POST /api/capital/tradingview` |
| **Robinhood** | Agentic MCP | **MCP** — catalog + docs |
| **Webull** | OpenAPI + OAuth | **Live** — OAuth link + bridge worker |
| **E*TRADE** | OAuth 1.0a REST | **Live** — OAuth link + preview/place bridge |
| **Public / Fidelity** | No retail API | **Unavailable / planned** — route via TV or manual approval |

## Sprint mapping

- **Sprint 1** — Risk guard, positions sync, idempotency (`client_order_id`), crisis pause UI
- **Sprint 2** — Quote cache, condition evaluator, heartbeat `evaluate_rules`, movers, backtest on rule save
- **Sprint 3** — Rebalance rules, Telegram approval, TradingView webhook, broker registry, autonomous modes

## Autonomous trading permission

Users must explicitly set **Autonomous mode** on the Capital desk:

- `off` — manual + agent skills only
- `approval_each` — heartbeat/agent fires → `pending_approval` → Telegram/Slack nudge
- `auto_armed_rules` — armed rules evaluate on heartbeat; risk guard + daily caps apply

Set `CURXOR_CAPITAL_TV_SECRET` (or store secret via permissions) for TradingView alert ingress.

## Day-one launch sprint (intel + desk UX)

Shipped for ~90% retail day-one:

| Capability | Status |
|------------|--------|
| Multi-range price chart (1M/3M/ALL) + hover | Shipped — Standard+ research panel |
| Earnings date (Yahoo) + Alpaca corp actions | Shipped when Alpaca keys set |
| SEC Form 4 insider filings in digest/research | Shipped |
| Headline vs chatter contradiction note | Shipped — smart take panel |
| Rule from thesis (dip vs manual buy heuristic) | Shipped — UI chip + agent skill |
| Watchlist pulse strip + movers → research | Shipped — Standard+ |
| Pending trade approval banner | Shipped — desk header |
| Keyword intel alerts | Shipped — Standard+ alerts panel |
| Pilot marketplace credibility (demo badge, perf bars, disclosure lag) | Shipped |
| Idempotent pilot subscribe (QA-safe) | Shipped |

Still deferred for v2+: mobile push for pending approvals, contextual PFM ads opt-in, Clear Street tier.

## V2 sprint (shipped)

| Capability | Status |
|------------|--------|
| TradingView Lightweight Charts (Expert research) | Shipped — `lightweight-charts` v5 |
| Live SEC pilot feeds (Form 4 + 13F signals) | Shipped — hourly heartbeat refresh |
| Robinhood MCP bridge | Shipped — `capital.execute_trade_robinhood` + OAuth link UI |
| Enhanced NLP sentiment | Shipped — negation, emoji, intensifiers, confidence |
| Visual rule builder | Shipped — WHEN/THEN panel on rule engine |
| Multi-account broker rotation | Shipped — `activeBrokerId` + Set active on brokers panel |

Remaining v3+: full tax-lot engine, Robinhood banking MCP, full 13F XML holdings parse.

## V3 sprint (shipped)

| Capability | Status |
|------------|--------|
| PFM hub (cash flow, spend categories, wealth goals) | Shipped — Standard+ desk section |
| Financial suggestions (spend → invest/save actions) | Shipped — bridges to rules & pilots |
| Auto-approval stack (paper-first, notional caps) | Shipped — Standard+ panel |
| Order preview API | Shipped — `preview_trade` |
| Portfolio health (concentration, sectors) | Shipped — Standard+ panel |
| Backtest equity curve | Shipped — on rule save |
| Contextual ad slots (disabled by default) | Shipped — roadmap in V3-ROADMAP.md |

See [V3-ROADMAP.md](./V3-ROADMAP.md) for V4 backlog (SnapTrade, Quiver, ads opt-in).

## V4.1 sprint (shipped)

| Capability | Status |
|------------|--------|
| Quiver congressional feed | `capital-quiver-feeds.ts` · `live_quiver` pilot + disclosure lag UX |
| Plaid PFM scaffold | `/api/capital/plaid` · read-only sync when `PLAID_*` set |
| Capital MCP tools v2 | 10 agent tools — PFM, preview, health, Quiver/Plaid status |
| SPY benchmark backtest | Strategy vs buy-and-hold dual-line chart |
| Auto-approval audit trail | `approvalNote` on every trade in log |

## V4.2 sprint — Agent & MCP trading (shipped)

| Capability | Status |
|------------|--------|
| Sovereign MCP server | Shipped — `GET/POST /api/capital/mcp` JSON-RPC |
| Robinhood-style preview/place | Shipped — `review_equity_order` + `place_equity_order` |
| Agent execute pipeline | Shipped — `capital-agent-executor.ts` + status `agent_execute_trade` |
| Agent audit log | Shipped — `agentAuditLog` in queue file + `list_agent_audit` |
| Agent kill switch | Shipped — desk toggle + `set_agent_kill_switch` |
| Auto-approval agent toggles | Shipped — `autoApproveAgentChat`, `requireAgentPreview` |
| Claw skills | Shipped — `preview_trade`, `agent_execute_trade` |
| Desk UI | Shipped — Agent & MCP trading panel + coach tips |

See [AGENT-TRADING.md](./AGENT-TRADING.md) for setup, competitive research (Robinhood Agentic, Era, SignalStack, Autopilot, Composer), and safety checklist.

## V4.3 — Gap analysis & execution UX (shipped)

| Priority | Gap | Competitor reference | Recommended fix | Effort | Status |
|----------|-----|---------------------|-----------------|--------|--------|
| P0 | SnapTrade / Fidelity / Public execution | Autopilot, SignalStack | OAuth + bridge worker | L | **Shipped V4.4** — OAuth scaffold + link UI |
| P0 | Plaid Link in desk | Mint, SoFi Relay | PFM panel Link button + sync status | M | **Shipped V4.4** — Plaid Link + sync in PFM |
| P0 | Live money FRE + env gate | Era, Robinhood Agentic | FRE live option + go-live step | M | **Shipped V4.4** — `CURXOR_CAPITAL_LIVE_ENABLED` + confirm |
| P0 | Pending-trade UX | Robinhood, Composer | Banner + approvalNote + Approve & submit | S | **Shipped V4.3** |
| P1 | Agent preview in UI | Robinhood MCP | Reuse order preview panel | S | **Shipped V4.3** |
| P1 | TradingView webhook wizard | TradingView alerts | Desk panel: URL, secret, test ping | M | **Shipped V4.4** — brokers panel wizard |
| P1 | Tax lots / cost basis | Composer, Magnifi | Lot store + P&L in health panel | L | **Shipped V4.4** — beta scaffold from Alpaca avg entry |
| P1 | Auto-approval audit panel | Era permissions | Filter trade log by approval path | S | **Shipped V4.4** — source/approval filters |
| P1 | Go-live persistence | Onboarding apps | Show checklist until `ready` at Standard+ | S | **Shipped V4.3** |
| P1 | Rule creation UX | Composer | Visual builder only — no `prompt()` | S | **Shipped V4.3** |
| P1 | Post-execute feedback | Retail brokers | Status-aware header copy | S | **Shipped V4.3** |
| P2 | Options/crypto rules | Composer | Condition types + bridge | L | **Partial** — builder conditions shipped · bridge execution deferred |
| P2 | Mobile pending push | Autopilot | Push beyond Telegram/Slack | M | Planned |

See [EXECUTION-FLOW.md](./EXECUTION-FLOW.md) for journey maps and mermaid diagrams.


### Agent-native comparison (updated)

| Product | Agent interface | Capital Claw |
|---------|-----------------|--------------|
| Robinhood Agentic | Cloud MCP, isolated RH account | On-appliance MCP, Alpaca paper bridge, local audit |
| Era | MCP + RIA automations | MCP + sovereign auto-approval + kill switch |
| SignalStack | Webhook → broker cloud | TradingView webhook → local risk guard → bridge |
| Autopilot | App copy-trading | Pilot marketplace + proportional sync on-box |
| Composer | Cloud strategy + execution | Local rules + backtest + agent-assisted creation |
