# Swarm Claw — Growth Leveling Build Plan

> **Audience:** L1–L3 core (Observer → Coordinator) · L4–L5 scaffolded  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Code seed:** `pillar-4-dashboard/lib/os-growth-level.ts` (`SwarmGrowthIntent`)  
> **Status:** **Frozen for GTM** — Waves 1–3 + Robotaxi preview · see [FREEZE.md](./FREEZE.md)

## North star

Swarm Claw is the **fleet operator for digital employees** — scale Claws from one sovereign desk without cloud orchestration:

1. **Observe** — learn the grid, depot, and safe dispatch  
2. **Dispatch** — route a few units with clear policy  
3. **Coordinate** — daily ops, rebalance, mesh health  
4. **Lead** — multi-depot, audit, Forge roster at scale  
5. **Command** — governance, delegation, fleet policy (future)

Not “AWS ECS on day one.” Not fake robotaxi theater without Forge linkage.

---

## Architecture walkthrough

How grid, skills, FRE, and Forge connect:

```
┌─────────────────────────────────────────────────────────────────┐
│  FRE (/api/app-fre/robotaxi-fleet-manager)                      │
│  growthIntent → growthLevel · depot · fleetSize · dispatchPolicy│
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Swarm Command UI (RobotaxiApp @ /robotaxi)                     │
│  · bootstrap via POST /api/swarm/status                         │
│  · growth-gated sections (swarm-level-gates.ts)                 │
└──────────────┬───────────────────────────────┬──────────────────┘
               │                               │
┌──────────────▼──────────────┐   ┌────────────▼──────────────────┐
│  claw-profiles.json (Forge) │   │  Agent console skills         │
│  → buildSwarmFleet()        │   │  assign_route · recall (L1)   │
│  fallback: RX mock units    │   │  ping_unit (L2) · rebalance L3│
└──────────────┬──────────────┘   └────────────┬──────────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                    skill-executors → motor mesh (physical)
                    vision/motor SSE → Mesh Link panel (L3+)
```

| Layer | File | Role |
|-------|------|------|
| Growth | `lib/swarm-growth.ts` | FRE intent → L1–L5, badge label |
| Gates | `lib/swarm-level-gates.ts` | Section + skill visibility |
| Fleet | `lib/swarm-fleet.ts` | Forge profiles → units, policy, rebalance |
| Bootstrap | `lib/swarm-dashboard-bootstrap.ts` | Server bundle for workspace |
| API | `app/api/swarm/status/route.ts` | `dashboard_bootstrap` action |
| UI | `components/apps/RobotaxiApp.tsx` | Grid, fleet, roster, audit |
| Onboarding | `lib/swarm-onboarding.ts` | FRE → experience tier sync |

---

## Current state vs target

| Today (Wave 1) | Target |
|----------------|--------|
| Mock RX fleet only | **Forge-linked fleet** when profiles exist |
| Static skill state | Policy-aware dispatch + rebalance |
| 3-tier coach only | L1–L5 growth labels + FRE intent |
| No audit | Local dispatch audit log (L4+) |
| Motor hooks stub | Wave 2: real mesh RTT on ping |

**Migration:** `ExperienceAppSection` still uses legacy `minLevel`; growth gates use `swarmSectionVisible`.

---

## Persona matrix

### L1 — Observer
**Who:** First-time operator, learning the grid.

| Job | Feature |
|-----|---------|
| Understand depot + cells | Geospatial grid |
| Try safe dispatch | Assign Route, Recall (selected unit) |
| Not overwhelmed | Hide fleet roster depth, ping, rebalance |

**Show:** Grid, basic metrics  
**Hide:** Forge roster, dispatch policy panel, mesh, audit  
**Default skills:** assign_route, recall_vehicle

---

### L2 — Dispatcher
**Who:** Running a few Claws for side projects.

| Job | Feature |
|-----|---------|
| Pick the right unit | Fleet status table |
| See Forge linkage | Forge roster strip |
| Understand policy | Dispatch policy copy |
| Health check | Ping Unit skill |

**Show:** Grid + fleet + roster + policy  
**Hide:** Mesh link, audit log, rebalance

---

### L3 — Coordinator
**Who:** Daily fleet ops, multiple workloads.

| Job | Feature |
|-----|---------|
| Spread load | Rebalance skill |
| Monitor mesh | Mesh Link panel (motor + vision) |
| Suggested dispatch | Policy pick in header metrics |

**Show:** All L2 + mesh + rebalance  
**Hide:** Audit log (L4)

---

### L4 — Fleet Lead
**Who:** Multi-depot, audit-conscious ops.

| Job | Feature |
|-----|---------|
| Audit trail | Dispatch audit log |
| Forge at scale | Full roster within fleetSize |

---

### L5 — Commander (scaffold)
**Who:** Governance, delegation — future Claw Cafe XP hooks.

---

## Wave plan

### Wave 1 — ✅ This build
- [x] `SwarmGrowthIntent` + FRE field  
- [x] `buildSwarmFleet` from `claw-profiles.json`  
- [x] `/api/swarm/status` bootstrap  
- [x] Growth-gated workspace sections  
- [x] Policy-aware rebalance + ping  
- [x] Dispatch audit log (L4+)  
- [x] `qa:swarm-levels` script  

### Wave 2 — Mesh depth ✅
- [x] Real RTT from mesh on ping_unit (`swarm-mesh-ping.ts` + broker probe fallback)
- [x] Auto-dispatch from agent chat with workspace context (`swarm-dispatch.ts` + console auto-run)
- [x] Multi-depot FRE field (`secondaryDepot`)
- [x] Demo capture walkthrough (`npm run demo:record:swarm`)

### Wave 3 — Best-in-class ✅
- [x] Cross-claw workload queue (`swarm-workload-queue.ts` + handoff from Work/Capital/Creator)
- [x] Claw Cafe XP for fleet milestones (`swarm-xp-events.ts` + SwarmCafeXpPanel)
- [x] Exit-demo fleet scenario (`runSwarmExitDemoScenario` + verify/record scripts)
- [x] Robotaxi fleet horizon preview panel + demo capture (`demo:capture:cafe-swarm`)

---

## Demo capture (freeze)

```bash
npm run demo:capture:swarm-freeze   # swarm/19–21 screenshots
npm run demo:capture:cafe-swarm     # cafe ascension + swarm horizon only
npm run demo:record:swarm           # walkthrough webm (horizon pause)
npm run demo:record:swarm:exit      # exit-demo webm
```

Full freeze checklist: [FREEZE.md](./FREEZE.md)

## QA

```bash
cd pillar-4-dashboard
npm run dev          # terminal 1
npm run qa:swarm-levels   # terminal 2
```

FRE dev fixture: `scripts/dev-qa/app-fre/robotaxi-fleet-manager.json`

---

## References

- Operator route: `/robotaxi` · appliance id `robotaxi-fleet-manager`  
- Forge profiles: `CURXOR_CLAW_PROFILES_PATH` → `/etc/curxor/claw-profiles.json`  
- Agent catalog: `lib/app-agent-catalog.ts` → `robotaxi-fleet-manager`
