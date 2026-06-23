# Claw Cafe — Growth Leveling Build Plan

> **Execution scope:** [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) (C4–C9)  
> **Tracking:** [RELEASE-NEXT.md](./RELEASE-NEXT.md) · **Scorecard:** [BEST-IN-CLASS.md](./BEST-IN-CLASS.md)  
> **PRD:** [CLAW-CAFE-PRD.md](../curxor-os/CLAW-CAFE-PRD.md)  
> **Route:** `/claw-cafe` · app id `claw-cafe` · nav label **Engage Claw** (rebrand optional C9)

## North star

Claw Cafe is the **OS gamification home** — cross-Claw progression, spatial room, Sprout → Infinity ascension. Play tab = kiosk / mesh demo lane until pixel room is default home on Ascension.

## Status

| Sprint | Scope | Status |
|--------|--------|--------|
| **CC0** | Workspace tabs, gates, badge, Work XP consumer | **Shipped** |
| **CC3** | Ascension G1–G6, event bus, CSS spatial grid, SSE, Forge sync | **Shipped (scaffold)** |
| **C4** | Pixel Canvas room + patron avatar + inspect | **Next** |
| **C5** | Creator/Capital/forged ingest; feed completeness | Planned |
| **C6** | Level-up UX, opt-out, default tab | Planned |
| **C7** | Easter eggs, yard dock, Go Live + demo tour | Planned |
| **C8** | FRE growth intent, coach, nudge | Planned |
| **C9** | QA checklist, GTM, v0.7.0 | Planned |
| **CC1/CC2** | FRE polish, Engage inbox slice | Deferred / light only |

## Workspace map (current)

| Tab | Min level | Content today | Target |
|-----|-----------|---------------|--------|
| **Play** | L1 | Kiosk lanes, vision, guest queue | Sub-lane of Cafe; optional default L1 only |
| **Ascension** | L1 | CSS room, G1–G6, cross-Claw feed | **Primary home** · pixel room + patron |
| **Progress** | L1 | Work-only XP | Merge into Ascension (C5) |
| **Host** | L2 | FRE desk config | Keep |

## Code map

| Area | Files |
|------|--------|
| Gates | `lib/cafe-level-gates.ts` · `lib/cafe-growth.ts` |
| Ascension | `lib/claw-cafe-ascension.ts` |
| Events | `lib/claw-cafe-events.ts` |
| Spatial | `lib/claw-cafe-spatial.ts` · `components/apps/cafe/CafeSpatialRoom.tsx` |
| UI | `ClawCafeApp.tsx` · `CafeAscensionPanel.tsx` · `CafeUnifiedFeedPanel.tsx` |
| Bridges | `work-xp-events.ts` · `swarm-xp-events.ts` · `forge-cafe-events.ts` |
| API | `app/api/cafe/status/route.ts` · `app/api/stream/cafe/route.ts` |
| QA | `npm run qa:cafe-ascension` |

## References

- Forge mint hooks: [../forge/RELEASE-NEXT.md](../forge/RELEASE-NEXT.md) F8–F12
- Work XP: [../outreach-claw/BEST-IN-CLASS-BUILD-PLAN.md](../outreach-claw/BEST-IN-CLASS-BUILD-PLAN.md)
