# Capital Claw — Startup Guide

Quick orientation for operators and developers opening the desk for the first time.

## Current release mode: **demo only**

This build intentionally runs **without broker credentials**. That is expected — not a misconfiguration.

| What works in demo | What waits for later |
|--------------------|----------------------|
| FRE setup, watchlist, rules, backtest | Alpaca paper orders via bridge |
| **Run demo tour** → simulated fill | Plaid bank link → real PFM |
| Research, intel digest, pilots (paper) | SnapTrade multi-broker OAuth |
| Auto-approval, agent/MCP preview flows | Live money (`CURXOR_CAPITAL_LIVE_ENABLED`) |
| Beginner recent trades · Standard decision timeline | Real bridge receipts |

Header shows **`demo`** until `ALPACA_*` keys are set. Without keys, executes produce **`simulated`** fills at quote price — not broker failures.

---

## Day-one startup (demo)

1. Open **`/my-capital`** (Capital Claw desk).
2. Complete **FRE** if prompted — keep **Paper only** trading mode.
3. Use **Setup Wizard** (header) or **Run demo tour** in Go Live — creates a rule, arms it, and **simulates a fill** (no broker keys).
4. **Research** a ticker → optional **Arm dip rule** or use **Rule engine** visual builder.
5. Beginners see **Recent trades** strip; Standard+ unlocks Analytics tab, full trade log + decision timeline.

No `digital.env` setup required for this path.

---

## When you leave demo mode

See **[EXIT-DEMO.md](./EXIT-DEMO.md)** — scaffold without keys:

```bash
cd pillar-4-dashboard
npm run setup:capital-env
npm run verify:exit-demo-scaffold
npm run configure:capital-keys   # when you have Alpaca / Plaid / SnapTrade keys
```

---

## Related docs

- [GETTING-STARTED.md](./GETTING-STARTED.md) — full checklist, API, env vars
- [EXECUTION-FLOW.md](./EXECUTION-FLOW.md) — rule / agent / auto-approve journeys
- [EXIT-DEMO.md](./EXIT-DEMO.md) — leave demo mode (Alpaca paper, Plaid, SnapTrade)
- [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — competitive gaps and shipped sprints
