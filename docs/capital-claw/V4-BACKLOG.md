# Capital Claw — V4 Backlog

Post V3 session (PFM, auto-approval, order preview, backtest curve, SnapTrade placeholder). Sovereign architecture unchanged: LLM → rules/risk guard → digital bridge.

## Shipped this session

| Capability | Notes |
|------------|--------|
| PFM desk panel | Mint-style demo · `/api/capital/pfm` · Standard+ |
| Auto-approval stack UI | `set_auto_approval` · paper-first notional caps |
| Order preview | `preview_trade` before Confirm & execute |
| Backtest equity curve | Lightweight Charts in rule engine · `backtest_rule` |
| Portfolio health | Expert panel · concentration + sector mix |
| SnapTrade broker placeholder | Registry tier `planned` |
| QA smoke | PFM, preview, backtest, auto-approval, SnapTrade catalog |

## Shipped (V4.1 session)

| Capability | Notes |
|------------|--------|
| Quiver API feeds | `capital-quiver-feeds.ts` · congress pilot `live_quiver` · disclosure lag UX |
| Plaid PFM scaffold | `/api/capital/plaid` · read-only sync · `PLAID_*` env |
| Capital MCP tools v2 | 10 agent tools incl. PFM, preview, health, Quiver/Plaid status |
| SPY benchmark backtest | Dual-line equity curve · strategy vs buy-and-hold |
| Auto-approval audit | `approvalNote` on every trade in trade log |
| Agent skills | `preview_trade`, `pfm_refresh`, `create_rule_from_thesis` in catalog |

## Top remaining gaps (post V4.4)

1. **SnapTrade bridge worker** — OAuth scaffold shipped; pillar-3 `digital_bridges` execution for Fidelity/Public/TD fills still needed.
2. **Full tax-lot engine** — Beta cost basis from Alpaca avg entry only; FIFO/LIFO and wash-sale rules deferred.
3. **Options & crypto wallet rules** — Condition types + bridge support for multi-asset strategies.
4. **Full 13F holdings XML** — Pilot feeds use signal aggregation; need holdings-level rebalance for institutional-style pilots.
5. **Robinhood MCP live execution** — Catalog + link UI; cloud RH agentic execution not on sovereign bridge.
6. **Contextual PFM ads (opt-in)** — Slots exist but disabled; product policy for sponsored suggestions without execution bias.
7. **Mobile pending push** — Telegram/Slack nudges exist; native push for pending approvals deferred.

## V4 sprint candidates (pick 3–5)

### P0 — Broker & data rails
- SnapTrade OAuth + bridge worker scaffold (`SNAPTRADE_*` in digital.env)
- Quiver provider module: `capital-quiver-feeds.ts` + pilot `PILOT-CONGRESS-TRACKER` live mode toggle
- Plaid link flow for PFM (read-only transactions, no trade side effects)

### P1 — Execution & trust
- Order preview bracket TP/SL lines when rule has takeProfitPct/stopLossPct
- Live-money FRE step + `CURXOR_CAPITAL_LIVE_ENABLED` env gate
- Auto-approval audit log panel (why trade skipped pending_approval)

### P2 — Strategy depth
- Walk-forward backtest vs buy-and-hold benchmark line on equity curve
- Rebalance rule UI (target weight + drift threshold) in visual builder
- Portfolio health → one-click rebalance rule suggestion

### P3 — Agent & ops
- Agent skills: `preview_trade`, `set_auto_approval`, `pfm_refresh`
- Heartbeat: PFM stale-account nudge, portfolio health alert when score &lt; 60
- Enable contextual ad slots with disclosure + kill switch in user settings

## Deferred (v5+)

- Robinhood banking MCP
- Clear Street / prime brokerage tier
- Magnifi-style natural-language portfolio queries (agent tool only, no direct broker)
- Mobile push for pending_approval (Telegram/Slack sufficient for launch)

## QA additions for V4

```bash
npm run typecheck
node scripts/qa-local.mjs --port 3102
```

Add smoke when shipped: `snaptrade_oauth_start`, `quiver_feed_refresh`, `plaid_link_status`, `live_money_gate`.
