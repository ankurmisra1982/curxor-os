# Capital Claw — Sovereign Alpha Feed (Social Alpha)

> **Inspiration:** [fomo.family](https://fomo.family/) social discovery layer — adapted for sovereign on-appliance Capital Claw.  
> **Wedge:** Local alpha graph (pilots, intel, your trades, thesis journal) — not a cloud social network.

## North star

Operators open Capital and see **one feed** of auditable signals: pilot moves, movers, their fills, thesis entries, intel fires — then act via rules, research, or copy.

## Wave P0 (this sprint)

| Capability | Status |
|------------|--------|
| **Alpha tab** — default home for Standard+ | Shipped |
| **Alpha feed** — merged timeline from desk + intel cache | Shipped |
| **Thesis journal** — local entries per ticker, linked to trades/rules | Shipped |
| **Alert preferences** — min notional, mover spikes, pilot signals | Shipped |
| **Chart trade overlays** — own fills + pilot signals on research chart | Shipped |
| **Pilot leaderboard** — ranked 24h/7d/30d/1Y from marketplace perf | Shipped |
| **Consensus meter** — pilots + chatter + your position on research card | Shipped (Wave 1 GTM) |

## Wave P1 (next)

- Position share cards for GTM
- Trending pilots (subscription velocity in demo)
- Creator Claw opt-in publish from thesis

## Wave P2 (deferred)

- Operator profile / local track record
- Mobile push for feed events
- Perps / extended asset classes

## Demo script (GTM · ~90s)

1. **Standard mode** — Capital opens on **Alpha** tab (default for Standard+).
2. **Alpha feed** — mover + pilot signal + recent fill in sovereign timeline; empty state → **Run demo tour**.
3. **Demo tour** — Go Live or Alpha CTA → rule → arm → simulated fill → thesis journal auto-prompts save.
4. Tap ticker → **Research** tab with chart markers + **consensus meter** (pilots · chatter · you).
5. Save **thesis** → **Rule from thesis** → arm → execute (simulated).
6. **Intel alerts** — enable mover spike + pilot signal filters.

## Code map

| Area | Files |
|------|--------|
| Types | `lib/capital-alpha-types.ts`, `lib/capital-intel-types.ts` |
| Feed builder | `lib/capital-alpha-feed.ts` |
| Thesis + prefs store | `lib/capital-intel-store.ts` |
| API | `app/api/capital/intel/route.ts` |
| UI | `CapitalAlphaFeedPanel`, `CapitalThesisJournalPanel`, `CapitalPilotLeaderboardPanel`, `CapitalConsensusMeter`, chart markers |

## What we did NOT copy from FOMO

- Public social graph / follow friends
- Multichain memecoin DEX / Apple Pay onboarding
- Unregulated on-chain everything app
- Fake community network effects
