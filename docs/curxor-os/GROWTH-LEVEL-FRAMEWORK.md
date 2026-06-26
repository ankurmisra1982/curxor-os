# CurXor OS — Growth Level Framework (seed)

> **Status:** Product framework seed · not yet gamified  
> **Gamification home:** Claw Cafe (last app to reach best-in-class) — levels advance on **growth and use**, not raw ability alone.

## Why five levels

CurXor apps should not gate on “expertise.” They should gate on **life stage and responsibility**:

| Internal | Meaning |
|----------|---------|
| `L1` | Exploring — coordination before career |
| `L2` | Building — repeatable side income / hobby ops |
| `L3` | Operating — recurring comms responsibility (often non-corporate) |
| `L4` | Professional — revenue systems and client acquisition |
| `L5` | Executive — delegation, governance, leverage |

Legacy UI still uses `beginner` | `standard` | `expert` (3 tiers). New work maps **L1–L5 → display labels per app** while preserving backward compatibility.

## OS-wide placeholder labels

| Level | Work Claw | Creator Claw | Capital Claw | **Swarm Claw** | **The Forge** | Vital Claw | Kin Claw | Claw Cafe (future) |
|-------|-----------|--------------|--------------|----------------|---------------|------------|----------|-------------------|
| **L1** | Explorer | Explorer | Learner | **Observer** | **Sketcher** | Starter | Member | Visitor |
| **L2** | Side Hustler | Maker | Builder | **Dispatcher** | **Builder** | Tracker | Helper | Regular |
| **L3** | Operator | Publisher | Operator | **Coordinator** | **Smith** | Optimizer | Coordinator | Host |
| **L4** | Professional | Brand | Allocator | **Fleet Lead** | **Fabricator** | Athlete | Steward | Patron |
| **L5** | Executive | Studio | Principal | **Commander** | **Foundry** | Longevity | Elder | Founder |

Each app owns **persona copy, default templates, and visible panels** for its column. Shared mechanics live in `lib/os-growth-level.ts`.

## Progression philosophy (pre-gamification)

Until Claw Cafe ships, level selection is **user-declared + FRE intent**, not XP:

1. **FRE question:** “What best describes you right now?” → sets suggested `growthLevel`
2. **Upgrade nudge:** when usage patterns match next tier (e.g. 10+ leads + active sequence → suggest L2→L3)
3. **No punishment:** users can always view “show more” to peek at higher tiers (Capital pattern)

Future Claw Cafe hooks (see [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)):

- `growthXp` from cross-app habits → **Ascension G1–G6** (Sprout → Infinity)
- Per-app L1–L5 titles feed XP and **epithets**, not duplicate ascension tiers
- Badges per Claw vertical · easter eggs · level-up ceremonies in the spatial room

## Technical contract

```ts
// pillar-4-dashboard/lib/os-growth-level.ts
export type GrowthLevel = "L1" | "L2" | "L3" | "L4" | "L5";

// Backward compat during migration
export function growthLevelFromExperience(level: ExperienceLevel): GrowthLevel;
export function experienceLevelFromGrowth(growth: GrowthLevel): ExperienceLevel;
```

Settings may store `growthLevel` per user; FRE may store `growthIntent` per app.

## App priority

| App | Leveling build priority | Core customer levels |
|-----|-------------------------|----------------------|
| **Work Claw** | **P0 — first full implementation** | L1–L3 |
| **Creator Claw** | **P1 — leveling shipped** · R8 post-HW: [EXPLAINABLE-REPURPOSE-BUILD-PLAN.md](../creator-claw/EXPLAINABLE-REPURPOSE-BUILD-PLAN.md) | L1–L3 core |
| **Capital Claw** | **P1 — build plan ready** · [LEVELING-BUILD-PLAN.md](../capital-claw/LEVELING-BUILD-PLAN.md) | L1–L4 core |
| **Swarm Claw** | **P2 — Frozen (Tier C preview)** · [FREEZE.md](../swarm-claw/FREEZE.md) | L1–L3 core |
| Vital / Kin | **P2 — Kin leveling UX shipped** · [LEVELING-BUILD-PLAN.md](../kin-claw/LEVELING-BUILD-PLAN.md) | L1–L4 |
| **Claw Cafe** | **P0 — next deep build** · [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md) | G1–G6 ascension + app L1–L5 feed |

## References

- Work implementation plan: [../outreach-claw/LEVELING-BUILD-PLAN.md](../outreach-claw/LEVELING-BUILD-PLAN.md)
- Capital implementation plan: [../capital-claw/LEVELING-BUILD-PLAN.md](../capital-claw/LEVELING-BUILD-PLAN.md)
- Swarm implementation plan: [../swarm-claw/LEVELING-BUILD-PLAN.md](../swarm-claw/LEVELING-BUILD-PLAN.md)
- Claw Cafe implementation plan: [../claw-cafe/LEVELING-BUILD-PLAN.md](../claw-cafe/LEVELING-BUILD-PLAN.md)
- Kin implementation plan: [../kin-claw/LEVELING-BUILD-PLAN.md](../kin-claw/LEVELING-BUILD-PLAN.md)
- Creator Release 8 (post-HW): [../creator-claw/EXPLAINABLE-REPURPOSE-BUILD-PLAN.md](../creator-claw/EXPLAINABLE-REPURPOSE-BUILD-PLAN.md)
- Work competitive positioning: [../outreach-claw/BEST-IN-CLASS.md](../outreach-claw/BEST-IN-CLASS.md)
