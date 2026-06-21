# Tools available to Capital Claw

**Release mode: demo only** — broker keys optional. Trades log locally; bridge fills when `digital.env` has Alpaca keys. See `docs/capital-claw/STARTUP-GUIDE.md`.

Catalog skills (tap in workspace):
- **create_rule** (plan): Open rule builder
- **arm_rule** (plan): Enable selected rule
- **execute_trade** (digital): Paper trade via Alpaca bridge
- **preview_trade** (plan): Notional, risk note, auto-approve eligibility
- **agent_execute_trade** (digital): Preview then confirm paper trade (agent pipeline)
- **rebalance** (plan): Simulate allocation drift fix
- **research_ticker** (plan): Fundamentals + news + WSB/FinTwit chatter
- **subscribe_pilot** (plan): Mirror a marketplace pilot portfolio
- **sync_pilots** (digital): Rebalance all active pilot subscriptions
- **create_rule_from_thesis** (plan): Build rule from ticker intel smart take
- **pfm_refresh** (plan): Reload cash flow and net worth snapshot

## Sovereign MCP (`/api/capital/mcp`)

JSON-RPC over HTTP — connect from Claude Code or Cursor:

```bash
claude mcp add capital-claw --transport http http://127.0.0.1:3080/api/capital/mcp
```

| Tool | Safety | Purpose |
|------|--------|---------|
| `get_desk_status` | read | Portfolio, buying power, armed rules, auto-approval summary |
| `get_ticker_intel` | read | Fundamentals, news, sentiment, smart take |
| `get_portfolio_health` | read | Concentration score, sector notes |
| `get_pfm_snapshot` | read | Net worth, cash flow, goals |
| `get_auto_approval_policy` | read | Policy + kill switch state |
| `review_equity_order` | read | Trade preview — Robinhood Agentic parity |
| `place_equity_order` | execute | Paper trade after review (`confirm: true`) |
| `list_agent_audit` | read | Recent agent/MCP previews and executions |
| `get_quiver_status` | read | Congressional feed provider status |
| `get_plaid_status` | read | PFM bank link status |

Example JSON-RPC:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
{ "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "review_equity_order", "arguments": { "symbol": "SPY", "side": "buy", "quantity": 1 } } }
```

## Status API actions (`POST /api/capital/status`)

Agent pipeline:
- `preview_trade` — `{ ticker, previewQty, actionTrade }`
- `agent_execute_trade` — `{ ticker, qty, actionTrade, confirm }` — preview when `confirm: false`
- `agent_audit_list` — `{ limit }`
- `set_agent_kill_switch` — `{ agentKillSwitch: true|false }`
- `set_auto_approval` — patch `autoApproveAgentChat`, `requireAgentPreview`, etc.

Agent HTTP tools (`GET /api/capital/tools`):
- `get_ticker_intel?ticker=NVDA`
- `get_market_digest`
- `get_desk_status`
- `list_intel_alerts`

Intel actions (`POST /api/capital/intel`):
- `ticker_lookup`, `refresh_digest`, `add_alert`, `create_dip_rule`, `add_to_watchlist`, `evaluate_alerts`

Custom skills live in `skills/*.md` (agentskills.io format).

See [AGENT-TRADING.md](../../../../docs/capital-claw/AGENT-TRADING.md) for competitive landscape and setup guide.
