# Capital Claw — Exit Demo Mode

Move from **demo** (simulated fills, no keys) to **paper bridge** (Alpaca orders via eno2) without changing release policy. Everything below is local setup — no cloud dependency beyond each broker’s sandbox.

## Prerequisites

- Capital desk works in demo (`demoReady` green after Setup Wizard or demo tour)
- `npm run qa:local` passes on your machine
- Pillar-3 digital bridge running when testing real fills (see [EXECUTION-FLOW.md](./EXECUTION-FLOW.md))

## Step 1 — Scaffold `digital.env`

```bash
cd pillar-4-dashboard
npm run setup:capital-env
```

Creates `scripts/dev-qa/digital.env` (gitignored) from `digital.env.example` and wires `.env.local`.

Verify scaffold (no keys required):

```bash
npm run verify:exit-demo-scaffold
```

## Step 2 — Add broker keys (pick one path first)

Interactive (opens signup pages):

```bash
npm run configure:capital-keys
```

Non-interactive (CI or secret manager):

```bash
ALPACA_API_KEY_ID=... ALPACA_API_SECRET_KEY=... \
  node scripts/configure-capital-keys.mjs --non-interactive
```

| Provider | Env vars | Desk action after restart |
|----------|----------|---------------------------|
| **Alpaca paper** | `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY` | Go Live → Alpaca step **complete** · first **filled** trade (not simulated) |
| **Plaid sandbox** | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox` | PFM → Link bank · `dataSource: plaid` |
| **SnapTrade** | `SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_SECRET` | Brokers → Link via SnapTrade OAuth |
| **Webull** | `WEBULL_CLIENT_ID`, `WEBULL_CLIENT_SECRET` + OAuth link | Brokers → Webull · set active broker |
| **E*TRADE** | `ETRADE_CONSUMER_KEY`, `ETRADE_CONSUMER_SECRET` + OAuth link | Brokers → E*TRADE · set active broker |

Restart `npm run dev` after editing `digital.env`.

## Step 3 — Prove paper path

1. Open `/my-capital` → **Go Live** → refresh checklist.
2. Alpaca step should show **complete** when keys are set.
3. Arm a rule → **Execute now** → trade status should be **`filled`** or **`submitted`**, not `simulated`.
4. `paperReady` turns true when bridge path is proven (see `buildCapitalGoLiveReport`).

```bash
npm run qa:local
npm run qa:capital-checklist
```

## Step 4 — Live money (optional, last)

Only after paper path is proven:

1. Set `CURXOR_CAPITAL_LIVE_ENABLED=1` in `digital.env`
2. FRE → switch trading mode to **live**
3. Desk → **Risk & permissions** → confirm live money
4. Go Live → live money gate **complete**

## What still requires engineering (not keys)

| Gap | Status |
|-----|--------|
| SnapTrade **execution** worker in pillar-3 | OAuth + UI shipped · bridge worker pending |
| Robinhood MCP sovereign execution | Link UI + catalog · cloud RH agentic account |
| Full tax-lot engine | Beta avg-cost from trades · FIFO/LIFO deferred |
| QA with keys in CI | Run locally after configuring keys |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Header still says **demo** | Restart dev server after `digital.env` change |
| Executes stay **simulated** | Check `ALPACA_*` · bridge worker logs on eno2 |
| Go Live Alpaca **warning** | Expected without keys — not an error in demo release |
| Plaid link 500 | Set `PLAID_*` sandbox keys first |
| Walk-forward shows stub note | Needs Alpaca **data** bars or live creds for multi-window OOS |

## Related

- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — shipped vs deferred checklist
- [GETTING-STARTED.md](./GETTING-STARTED.md) — full env reference
- [STARTUP-GUIDE.md](./STARTUP-GUIDE.md) — day-one demo path
