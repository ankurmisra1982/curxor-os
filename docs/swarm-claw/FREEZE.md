# Swarm Claw — Freeze (Tier C Preview)

> **Route:** `/robotaxi` · app id `robotaxi-fleet-manager`  
> **Status:** **Frozen** for GTM — Waves 1–3 + Robotaxi horizon preview  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)

## What ships in this freeze

| Area | Shipped | Honest limit |
|------|---------|--------------|
| **Grid dispatch** | Geospatial grid, assign/recall, policy pick | Simulators + Forge-linked units — not live Tesla pairing |
| **Growth L1–L5** | FRE intent, gates, badge, section visibility | L5 governance is scaffold |
| **Mesh** | Ping RTT (broker fallback), motor hooks | No production ground fleet |
| **Cross-Claw** | Workload queue, Work/Capital handoffs | Receipts are local ledger |
| **Cafe XP** | Swarm milestones → Claw Cafe ascension | Via unified event bus |
| **Exit demo** | `run_exit_demo`, go-live steps, record scripts | Demo scenario only |
| **Robotaxi vision** | Horizon panel, Coming Soon banner, FRE copy | **Preview** — acquisition / autonomous fleet ops later |

## Deferred (post-freeze)

- Live Tesla VIN registry and fleet bridge
- On-road autonomous dispatch APIs
- Real mesh dispatch receipts (vs simulated)
- L5 commander governance UI
- Full best-in-class depth doc (mirror Capital/Work exit criteria)

## Pre-freeze gate

Dev server with dev-qa env on **3080** (or your port):

```bash
cd pillar-4-dashboard

# Terminal 1
npm run dev

# Terminal 2 — full local gate includes swarm via qa:local
npm run qa:swarm-levels
npm run verify:swarm-exit-demo-scaffold
npm run demo:capture:swarm-freeze
```

Or one shot (production bundle):

```bash
npm run qa:local
```

## Demo assets

| Asset | Command / path |
|-------|----------------|
| Horizon screenshot | `docs/demo-pack/screenshots/swarm/19-robotaxi-horizon.png` |
| Command grid | `docs/demo-pack/screenshots/swarm/20-swarm-grid.png` |
| Workloads (L3+) | `docs/demo-pack/screenshots/swarm/21-swarm-workloads.png` |
| Walkthrough video | `npm run demo:record:swarm` → `docs/demo-pack/swarm-walkthrough.webm` |
| Exit demo video | `npm run demo:record:swarm:exit` |

Capture refresh:

```bash
npm run demo:capture:swarm-freeze
```

## Code map (freeze)

| Layer | Files |
|-------|--------|
| Preview copy | `lib/claw-preview-apps.ts`, `lib/swarm-robotaxi-vision.ts` |
| Growth / gates | `lib/swarm-growth.ts`, `lib/swarm-level-gates.ts` |
| Fleet / dispatch | `lib/swarm-fleet.ts`, `lib/swarm-dispatch.ts`, `lib/swarm-mesh-ping.ts` |
| Workloads / handoff | `lib/swarm-workload-queue.ts`, `lib/swarm-handoff.ts` |
| Cafe hooks | `lib/swarm-xp-events.ts` → `lib/claw-cafe-events.ts` |
| API | `app/api/swarm/status/route.ts` |
| UI | `RobotaxiApp.tsx`, `SwarmRobotaxiVisionPanel.tsx`, swarm panels |
| QA | `qa-swarm-levels.mjs`, `verify-swarm-exit-demo-scaffold.mjs` |

## GTM talk track (60s)

1. Open **Swarm Claw** — **Coming Soon** preview banner (honest Tier C).
2. **Robotaxi fleet horizon** — operator acquires many Tesla Robotaxis; today = simulators.
3. Click grid cell **B3** → **Assign Route** or chat “dispatch lowest latency”.
4. **L3+** — workloads from Work/Capital handoffs, Cafe XP strip.
5. Close: sovereign dispatch ledger on-box — no cloud orchestration rent.

## References

- Build plan: [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)
- Agent catalog: `lib/app-agent-catalog.ts` → `robotaxi-fleet-manager`
- FRE fixture: `scripts/dev-qa/app-fre/robotaxi-fleet-manager.json`
