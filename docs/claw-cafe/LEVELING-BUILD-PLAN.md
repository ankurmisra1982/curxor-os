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
| **C4** | Pixel Canvas room + patron avatar + inspect | **Shipped** |
| **C5** | Creator/Capital XP + sync + forged hooks; Progress merged | **Shipped** |
| **C6** | Level-up UX, opt-out, default tab | **Shipped** |
| **C7** | Easter eggs, yard dock, Go Live + demo tour | **Shipped** |
| **C8** | FRE growth intent, coach, nudge | **Shipped** |
| **C9** | QA checklist, GTM, v0.7.0 | **Shipped** |
| **C10** | Live ingest + approval bubbles | **Shipped** |
| **C11** | Vital/Kin/Shop/Signal emitters | **Shipped** |
| **C12** | Hidden Master AI + patron brief | **Shipped** |
| **C13** | Sprites + room mastery | **Shipped** |
| **CC1/CC2** | FRE polish, Engage inbox slice | Deferred / light only |

## Workspace map (current)

| Tab | Min level | Content today | Target |
|-----|-----------|---------------|--------|
| **Play** | L1 | Kiosk lanes, vision, guest queue | Sub-lane of Cafe; optional default L1 only |
| **Ascension** | L1 | Pixel room, G1–G6, cross-Claw feed, Work streak | **Primary home** |
| **Host** | L2 | FRE desk config | Keep |

## Code map

| Area | Files |
|------|--------|
| Gates | `lib/cafe-level-gates.ts` · `lib/cafe-growth.ts` |
| Ascension | `lib/claw-cafe-ascension.ts` |
| Events | `lib/claw-cafe-events.ts` |
| Spatial | `lib/claw-cafe-spatial.ts` · `lib/cafe-pixel-engine.ts` · `CafePixelCanvas.tsx` |
| UI | `ClawCafeApp.tsx` · `CafeAscensionPanel.tsx` · `CafeUnifiedFeedPanel.tsx` |
| Bridges | `work-xp-events.ts` · `creator-xp-events.ts` · `capital-xp-events.ts` · `swarm-xp-events.ts` · `forge-cafe-events.ts` |
| API | `app/api/cafe/status/route.ts` · `app/api/stream/cafe/route.ts` |
| QA | `npm run qa:cafe-ascension` |

## References

- Forge mint hooks: [../forge/RELEASE-NEXT.md](../forge/RELEASE-NEXT.md) F8–F12
- Work XP: [../outreach-claw/BEST-IN-CLASS-BUILD-PLAN.md](../outreach-claw/BEST-IN-CLASS-BUILD-PLAN.md)
