# Capital Claw — V3 Roadmap

## Shipped (V3 alpha)

| Capability | Status |
|------------|--------|
| **PFM hub** (`/api/capital/pfm`) | Mint-style demo seed — accounts, 30d cash flow, category spend, wealth goals |
| **Suggestion engine** | Dining/subscription/savings hints → dip rules, goal bumps, pilot subscribe |
| **Auto-approval stack** | Policy on queue file · `set_auto_approval` · `previewTrade` · paper notional caps |
| **Portfolio health** | Concentration, sector mix, rebalance hints from live positions |
| **Desk panels** | `CapitalPfmPanel`, `CapitalAutoApprovalPanel`, `CapitalPortfolioHealthPanel` in Standard+ |
| **Coach tips** | `pfm`, `auto-approval`, `portfolio-health` sections |
| **QA** | `CURXOR_CAPITAL_PFM_PATH` · smoke: pfm GET, set_auto_approval, preview_trade |
| **Heartbeat** | Hourly optional PFM refresh via `POST /api/capital/pfm` `{ action: "refresh" }` |
| **Backtest equity curve** | `capital-backtest.ts` emits `equityCurve` + `simulatedReturnPct` on rule save |

## In progress / next

- Plaid (or sovereign bank feed) to replace demo PFM transactions — **Link UI + sandbox scaffold shipped** · see [EXIT-DEMO.md](./EXIT-DEMO.md)
- PFM ↔ portfolio reconciliation (brokerage balance vs Alpaca positions)
- Portfolio health chart (weight over time)
- SnapTrade pillar-3 execution worker (OAuth scaffold shipped)

## Env

```bash
CURXOR_CAPITAL_PFM_PATH=/etc/curxor/capital-pfm.json   # default
```

## API quick reference

| Action | Route | Notes |
|--------|-------|-------|
| PFM snapshot | `GET /api/capital/pfm` | Returns `PfmSnapshot` |
| Refresh PFM | `POST /api/capital/pfm` | `{ action: "refresh" }` |
| Update goal | `POST /api/capital/pfm` | `{ action: "update_goal", goalId, monthlyContributionUsd }` |
| Set auto-approval | `POST /api/capital/status` | `{ action: "set_auto_approval", autoApproval: { … } }` |
| Preview trade | `POST /api/capital/status` | `{ action: "preview_trade", ticker, previewQty, actionTrade }` |
