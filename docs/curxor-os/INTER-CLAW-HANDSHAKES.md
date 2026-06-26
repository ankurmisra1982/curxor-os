# Inter-Claw Handshakes — Vision (ideas capture)

> **Room:** Vision & Strategy · capture only · **no build** until G4  
> **Roadmap:** Program **HS** · waves H1–H6 in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Related:** [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md) · CCP in `pillar-4-dashboard/lib/claw-mesh-protocol.ts`  
> **Last updated:** June 2026 · **Status:** scoped · slotted for post-G2 build

---

## One-line vision

Claws don't live in silos. They **leverage** each other's context for real output *and* **discover** adjacent claws the operator hasn't tried yet — with every meaningful connection celebrated in **Claw Cafe** as a handshake (bro-hug, brightness burst, affinity XP).

This is how CurXor becomes an **OS**, not ten tabs.

---

## Two modes (don't conflate)

| Mode | What happens | User sees | Example |
|------|----------------|-----------|---------|
| **Leverage** | Claw A passes data or triggers an action in Claw B | Handoff card, pre-filled queue item, CCP publish | Creator viral post → lead lands in Work CRM |
| **Discover** | Claw A reads operator behavior and **suggests trying** Claw B | Coach nudge + "Try Creator" CTA — never auto-opens | Capital power user → "Your rule wins would make great fintwit threads" |

**Leverage** is plumbing (partially shipped: `work-handoff.ts`, `swarm-handoff.ts`, CCP mesh).  
**Discover** is the new product layer — persona paths, consent, Cafe ceremony.

Both emit the same **Cafe handshake event** when the operator **accepts** or **completes the first action** on the target claw.

---

## Handshake lifecycle (future build contract)

```text
1. TRIGGER     Operator action + pattern in source claw
2. ELIGIBLE    Path registry matches (from → to, growth level, consent)
3. SUGGEST     In-app coach bubble + optional agent chat line (Discover)
   OR          Silent handoff payload staged (Leverage)
4. ACCEPT      User taps "Try it" / "Accept handoff" / completes staged action
5. EMIT        OS event: claw.handshake { from, to, pathId, mode }
6. CAFE        Two sprites pathfind → center zone → bro-hug animation
7. REWARD      +XP ascension · +affinity (Knowledge/Wealth) · avatar brightness pulse
8. MILESTONE   crossClawHandshake → G5 Consciousness gate (already in ascension schema)
```

### Cafe visual contract

| Effect | Spec |
|--------|------|
| **Meet zone** | Center coffee island or handshake alcove (not someone's desk) |
| **Animation** | 2–3 frame bro-hug / high-five; ~1.2s; no LLM banter |
| **Brightness** | Both Claw sprites +20% luminance for 30s; decay smooth |
| **Bubble** | `Capital × Creator · FinThread path · +15 Knowledge` |
| **Patron** | If avatar within proximity → brief sparkle on patron too |
| **Sound** | Optional subtle chime (gamification on only) |
| **Tier C** | Handshake animation OK in preview; Discover copy says "preview — try when live" |

Existing hooks to extend (not build now): `claw-cafe-spatial.ts` (`handshake` → `celebrate`), `cafe-patron-brief.ts`, `crossClawHandshake` milestone in `claw-cafe-ascension.ts`.

---

## Anti-patterns (sacred)

1. **No spam** — max one Discover nudge per source claw per day; dismiss = snooze 7d.
2. **No fake live** — never Discover into Tier C as if bridges work.
3. **Opt-in always** — Discover never auto-navigates; Leverage never mutates without confirm.
4. **No demotion** — declined handshakes don't penalize XP.
5. **Honest preview** — "When Arbitrage goes live, your Capital gains could fund inventory" is OK; "Sync Shopify now" is not.

---

## Persona journeys (high-value paths)

Grouped by **who the operator is becoming** — not random cross-sell.

### Wealth → influence (your example)

**Capital → Creator · `path:fintwit_influencer`**

| Stage | Trigger | Suggestion copy (Discover) |
|-------|---------|---------------------------|
| L2 Builder | 3+ rule fires in a week | "Your wins are teachable — Creator can draft FinTwit threads from your rule log." |
| L3 Operator | Paper P&L streak | "Operators trust operators who show their work. Try a weekly 'rule card' post template." |
| L4 Allocator | Social alpha interest | "Capital intel + Creator publish = your own fintwit lane. No API rent." |

**Leverage follow-through:** Capital publishes `finance.intel.highlight` to CCP → Creator pre-fills `content.draft` with anonymized rule summary.

**Cafe:** Capital sprite and Creator sprite bro-hug; +Knowledge affinity burst.

---

### Influence → revenue

| Path | Trigger | Outcome |
|------|---------|---------|
| **Creator → Work** | Inbound DM keywords / engage spike | "Turn warm replies into a Work sequence — handoff lead ready." |
| **Creator → Capital** | Monetization intent in FRE | "Audience + discipline = Allocator path. Paper-trade the creator economy." |
| **Creator → Arbitrage** | Product mentions in content queue | "Merch or dropship angle — Arbitrage preview when you're ready." |

---

### Hustle → scale

| Path | Trigger | Outcome |
|------|---------|---------|
| **Work → Creator** | Close rate up, no personal brand | "Your outbound voice works — personal brand posts compound pipeline." |
| **Work → Capital** | Solo business FRE intent | "Revenue on the desk — Capital for operator investing, not Wall St cosplay." |
| **Work → Forge** | Niche repeat in sequences | "Forge a vertical outreach Claw — mint from your winning templates." |
| **Arbitrage → Work** | Supplier / B2B SKU pattern | "Wholesale leads belong in Work — not your Shopify inbox." |
| **Arbitrage → Creator** | Margin win streak | "Winning SKUs deserve content — Creator product spotlight template." |

---

### Body → household → machines

| Path | Trigger | Outcome |
|------|---------|---------|
| **Vital → Creator** | Protocol milestone | "Share the journey (opt-in) — longevity content without guru cringe." |
| **Vital → Kin** | Multi-member protocols | "Household health is Kin's job — sync family visibility?" |
| **Kin → Signal** | Family rules mature | "Optimus should know per-person boundaries — teach from Kin profiles." |
| **Kin → Display** | Member binds glasses | "Priya's glasses get her Vital nudges only — Glance Lane in Signal." |
| **Capital → Display** | Rule streak L3+ | "Rule wins as a glasses ticker — try Overlays." |
| **Creator → Display** | Publish cadence | Glance teaser · **VR draft preview wall** |
| **Vital → Display** | Protocol step due | Glance nudge · **VR protocol panel** |
| **Vital → Home** | Bedtime / protocol scene | Dim lights · thermostat — **confirm** before locks |
| **Kin → Home** | Guest arrives · member home | Welcome scene · room announce on HomePod/Echo |
| **Work → Home** | Focus block starting | Office scene · DND on speakers |
| **Cafe → Display** | XP milestone | Streak toast · **step into VR Cafe** · `/display/cafe` portal |
| **Cafe → VR** | First portal open | **Meet your Claws** ceremony · major XP · FRE step |
| **HS → VR** | Any cross-claw handshake | Bro-hug · brightness in immersive room (AD9) |
| **Signal → Vital** | Robot assist routines | "Fetch meds / hydration nudges — Vital protocol meets hardware." |
| **Signal → Kin** | Pair wizard progress | "Household identity makes robots personal, not creepy." |
| **Work → Gamer** | Friday pattern · sequence complete | Discover: "Squad night?" (opt-in) |
| **Gamer → Creator** | Clip · raid · milestone | Highlight draft · Short pre-fill |
| **Gamer → Kin** | Kid achievement · family night | Cafe celebrate · screen-time policy |
| **Gamer → Vital** | Long session | Break nudge · hydration protocol |
| **Forge → Gamer** | Game Pack minted | Arcade cabinet in Cafe |

---

### Fleet & forge (horizon)

| Path | Trigger | Outcome |
|------|---------|---------|
| **Swarm → Work** | Fleet sim dispatch volume | "B2B fleet ops = enterprise outreach when you go pro." |
| **Swarm → Capital** | Utilization metrics | "Assets on the road — Capital treats fleet like a portfolio (preview)." |
| **Forge → *** | Mint event | Parent handshake hug · **fusion birth** if two parents · [CAFE-OS-LAYER](./CAFE-OS-LAYER-MODEL.md) |
| **Any → Forge** | Repeated cross-claw workflow | Discover: **Forge fusion** — specialist child from two parents |

---

### Meta orchestration (G5+)

| Path | Trigger | Outcome |
|------|---------|---------|
| **Cafe patron → Build Plane** | G5 Consciousness | Already scoped — delegate build tasks (separate lane). |
| **Cafe patron → multi-Discover** | 3+ claws active same week | "You're operating cross-Claw — Consciousness tier within reach." |

---

## Full handshake matrix (45 directed pairs)

**Legend:** ● = high priority path · ○ = secondary · — = rare / horizon  
Rows = **from** (suggests / hands off) · Cols = **to**

| From ↓ / To → | Cap | Cre | Work | Forge | Arb | Sig | Swarm | Vital | Kin | Cafe* |
|---------------|-----|-----|------|-------|-----|-----|-------|-------|-----|-------|
| **Capital** | — | ● | ● | ○ | ○ | — | ○ | ● | ○ | ○ |
| **Creator** | ● | — | ● | ○ | ○ | — | — | ○ | ○ | ○ |
| **Work** | ● | ● | — | ● | ○ | — | — | ○ | ● | ○ |
| **Forge** | ○ | ○ | ○ | — | ○ | ● | ○ | ○ | ○ | ○ |
| **Arbitrage** | ● | ● | ● | ○ | — | — | ○ | — | — | — |
| **Signal** | — | ○ | — | ● | — | — | ○ | ● | ● | — |
| **Swarm** | ○ | — | ● | ○ | ○ | ● | — | — | — | — |
| **Vital** | ○ | ● | — | ○ | — | ● | — | — | ● | ○ |
| **Kin** | — | ○ | ● | ○ | — | ● | ○ | ● | — | ○ |

\* **Cafe** column = spatial home logs the handshake; Engage/DM features merge into **Creator** (see [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md) claw-slot note).

**Post-GM0:** add **Gamer** row/column to matrix — priority paths in [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md) § Inter-Claw handshakes.

**Bidirectional gems** (both directions get distinct path IDs):

- Capital ↔ Creator (wealth narrative ↔ influence)
- Vital ↔ Kin (individual protocol ↔ household)
- Signal ↔ Kin (robot boundaries ↔ family identity)
- Work ↔ Creator (outbound ↔ brand)

---

## Path registry schema (future code — capture only)

```ts
type HandshakeMode = "leverage" | "discover";

interface HandshakePath {
  id: string;                    // e.g. "fintwit_influencer"
  fromAppId: OotbAppId;
  toAppId: OotbAppId;
  mode: HandshakeMode;
  minGrowthLevel?: GrowthLevel;  // source claw L2+
  trigger: string;               // machine key, e.g. "capital.rules.weekly_fire>=3"
  suggestCopy: string;           // coach + agent
  leverageAction?: string;       // CCP key or handoff fn
  cafeLabel: string;             // "Capital × Creator"
  affinity: "knowledge" | "wealth" | "both";
  bonusXp: number;
  tierCAllowed: boolean;         // false for most Tier C targets pre-G4
}
```

Registry lives in `lib/handshake-paths.ts` (future). Triggers read from XP events + CCP + queues — no new telemetry silo.

---

## Growth-level gating

Discover depth scales with **life stage**, not skill flex:

| Level | Discover behavior |
|-------|-------------------|
| **L1** | At most one gentle cross-claw hint per month; FRE-aligned only |
| **L2** | Peer claw suggestions (Capital↔Creator, Work↔Creator) |
| **L3** | Leverage handoffs default-on with confirm |
| **L4** | Multi-hop suggestions (Work→Creator→Capital funnel) |
| **L5** | Patron may bundle 2-claw weekly plan in brief |

---

## Ascension tie-in

| Tier | Handshake role |
|------|----------------|
| G2 Divine Sprout | First handshake ever → ceremony |
| G3 Goddess of Knowledge | 3+ Knowledge-affinity handshakes |
| G4 Goddess of Wealth | 3+ Wealth-affinity handshakes |
| G5 Consciousness | `crossClawHandshake` + Forge mint same era (existing milestone) |
| G6 Infinity | Sustained cross-claw weeks · no grind — quality over count |

---

## Phased build (when unblocked)

| Phase | Scope | Gate |
|-------|-------|------|
| **H1** | Path registry + 5 ● paths (Cap→Cre, Cre→Work, Work→Cre, Vital→Kin, Forge→parent) | G2 |
| **H2** | Discover UI in coach + agent assist | G2 |
| **H3** | Cafe bro-hug animation + brightness + affinity XP | G2 |
| **H4** | Leverage payloads for top 10 paths | G3 |
| **H5** | Full matrix + Tier C honest copy | G4 |
| **H6** | Master AI bundles multi-claw weekly plans | G5 |

---

## Parking lot (raw ideas)

| Idea | Notes | Program |
|------|-------|---------|
| Handshake streak badge | 4 weeks with ≥1 handshake | HS delight |
| "Rival" Claws joke easter egg | Capital and Arbitrage arm-wrestle sprite | HS delight |
| Couples path | Two Kin profiles → joint Capital+Creator family brand | HS |
| Teen path | Kin teen profile → Creator with guardrails → no finance Discover until 18+ flag | HS |

_See also [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) parking lot._

---

## References

- Future roadmap entry: [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) · IDEA-C05
- Cafe ascension G5: `crossClawHandshake` in `claw-cafe-ascension.ts`
- Existing handoffs: `work-handoff.ts`, `swarm-handoff.ts`
- Spatial celebrate: `claw-cafe-spatial.ts`
