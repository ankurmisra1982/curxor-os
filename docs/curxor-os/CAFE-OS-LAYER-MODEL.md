# Cafe, Ten Claws & Forge Fusion — OS layer model (locked)

> **Room:** Vision & Strategy · capture only · **no build** until gated  
> **Roadmap:** Program **OL** (G2) · **FF** · **OL-Kin** in [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md) · G4+ in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Roster lock:** [IDEA-G07](./FUTURE-ROADMAP.md#idea-g07-operate-claw-roster--estate--learn-founder-locked) (Jun 2026)  
> **Status:** **founder locked** (June 2026) · **Last updated:** June 2026

---

## CurXor OS stack (locked)

```text
┌──────────────────────────────────────────────────────────────┐
│  UNIVERSAL APPS (always on · not in the ten)                  │
│  · Claw Cafe — Patron Hall                                    │
│  · Signal Claw — The Neural Link                              │
│  · Kin — household mapper (profiles · scopes · devices)       │
│  · Patron Link — mobile pull/push (/m)                        │
│  · Patron Ask — chat FAB / fullscreen (Master AI UI)          │
├──────────────────────────────────────────────────────────────┤
│  TEN OPERATE CLAWS (vertical desks)                           │
│  1 Capital   2 Work   3 Creator*   4 Arbitrage   5 Vital    │
│  6 Learn     7 Gamer   8 Swarm     9 Forge      10 Estate**   │
├──────────────────────────────────────────────────────────────┤
│  FORGED SPECIALISTS (+ Forge fusion children)                 │
│  MASTER AI + Chief of Staff horizontal (G5+ horizon)          │
└──────────────────────────────────────────────────────────────┘

* Creator includes merged Engage inbox (DM triage · auto-reply).
** Estate = one desk · three lanes: Legal · Property · Tax.
```

| Layer | GTM | Route | Module picker |
|-------|-----|-------|---------------|
| **Claw Cafe** | Patron Hall | `/claw-cafe` | Always on |
| **Signal Claw — The Neural Link** | Orchestration · devices | `/optimus` | Always on |
| **Kin** | Household mapper | `/my-family` | Always on · not an “employee” |
| **Patron Link** | Mobile companion | `/m` | Pair per device · [MOBILE-PATRON-LINK](./MOBILE-PATRON-LINK.md) |
| **Patron Ask** | Master AI chat (FAB → fullscreen) | `/ask` + global chrome | Always on · [PATRON-CHAT-UI](./PATRON-CHAT-UI.md) |
| **Ten operate claws** | “Ten Claws” | `/my-*`, `/claw-forge` | Enable per desk |
| **Forged / fusion** | Specialists you mint | `/my-claw/{slug}` | Per mint |

---

## Roster math (how we get to ten)

| Moved out of “ten” | Where it lives now |
|--------------------|-------------------|
| **Engage** (was `claw-cafe` mislabel) | **Creator** Engage inbox tab |
| **Cafe** | Universal Patron Hall |
| **Signal** | Universal Neural Link · [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md) |
| **Kin** (was operate #6) | Universal household mapper · Program **OL-Kin** |

| Added / locked in ten | Role |
|-----------------------|------|
| **Gamer** | Play · stream · AI game studio |
| **Learn** | Tutor desk · uses Kin mapper for learners · `/my-learn` |
| **Estate** | Legal · Property · Tax — **one desk** · `/my-estate` |

**Result:** Ten named operate claws — **no open slot**. Slot #10 is **Estate**, not a parking lot.

**Rejected as separate claws:** Chief of Staff → Master AI horizontal ([IDEA-C07](./FUTURE-ROADMAP.md#idea-c07-chief-of-staff--master-ai-horizontal-generic-ops)); Insurance/Medicare → Vital extension ([IDEA-E09](./FUTURE-ROADMAP.md#idea-e09-vital--insurance--medicare-extension)). See [REJ-02 / REJ-03](./FUTURE-ROADMAP.md#dropped--rejected-keep-honest).

---

## Ten operate claws (locked roster)

| # | Claw | Route | Role |
|---|------|-------|------|
| 1 | **Capital** | `/my-capital` | Wealth · rules · alpha |
| 2 | **Work** | `/my-work` | Outbound · pipeline |
| 3 | **Creator** | `/my-creator` | Publish · **Engage inbox** (merged) |
| 4 | **Arbitrage** | `/my-arbitrage` | Commerce · margin |
| 5 | **Vital** | `/my-vital` | Longevity · protocol · **+ Insurance/Medicare ext** (G4+) |
| 6 | **Learn** | `/my-learn` | Tutor · curricula · Kin learner picker |
| 7 | **Gamer** | `/my-game` | Play · stream · AI game studio |
| 8 | **Swarm** | `/my-swarm` | Fleet orchestration |
| 9 | **Forge** | `/claw-forge` | Factory · mint · **fusion** |
| 10 | **Estate** | `/my-estate` | Legal · Property · Tax (one desk, three lanes) |

**Build gates:** Learn + Estate ship after G4 UAT smile · Kin universal decouple at G2+ (OL-Kin). Specs: [IDEA-LR0](./FUTURE-ROADMAP.md#idea-lr0-learn-claw--tutor-desk) · [IDEA-ES0](./FUTURE-ROADMAP.md#idea-es0-estate-claw--legal--property--tax).

---

## Kin — household mapper (not operate claw #)

**Founder lock (IDEA-G08):** Kin is **always on** — profiles, scopes, devices, CCP `family.*` — but **not** FRE-selectable as an employee. Route stays `/my-family`.

| Kin does | Kin does not |
|----------|--------------|
| Household identity for every Claw | Own vertical “job” in the ten |
| Learner picker for **Learn** | Appear as operate sprite in Cafe roster |
| CCP publish · Signal guest policy | Replace Vital or Estate desks |

Forge fusion **Vital × Kin** unchanged: household health specialist from longevity + mapper context.

---

## Signal — The Neural Link (not operate claw #)

**Founder GTM (locked):**

| | |
|--|--|
| **Name** | **Signal Claw — The Neural Link** |
| **Not** | “AI Device Hub” headline · “Signal” alone |
| **Hero** | *What is the next interface? Wrong question.* |
| **Payoff** | *Interfaces drift. Your desk conducts.* |

Signal = **orchestration engine** for robots, glasses, VR, smart home, voice, vehicles, gaming endpoints. Operate claws think; Signal **conducts** delivery.

---

## Claw Cafe — Patron Hall (not operate claw #)

Living mirror · ascension · handshakes · fusion births · VR portal. Consumes events; does not scrape, trade, or pair hardware.

Engage fiction **departed** — Cafe is universal, not optional Engage.

---

## Forge Fusion (locked v1)

**Metaphor:** two claws → Forge delivers specialist → Cafe celebrates birth.

**v1 recipes only (founder locked):**

| Parents | Path ID | Child (example) |
|---------|---------|-----------------|
| **Capital + Creator** | `fintwit_influencer` | Fintwit Desk |
| **Work + Creator** | `brand_from_outbound` | Pipeline Publisher |
| **Vital + Kin** | `household_health` | Family Protocol Desk |

**Note:** Kin is universal mapper — fusion still uses Vital + household context from `family-profiles.json`, not “Kin the employee.”

**Guardrails:** confirm gate · 3+ handshakes / 14 days before Discover offer · no kid/guest mint · `parentLineage` on forged-apps.

Full pipeline: see § Forge Fusion below · Program **FF**.

---

## Fix plan (phased)

### OL1 — Copy & nav (G2+)

| Change | Detail |
|--------|--------|
| Remove `claw-cafe` from operate ten in `ootb-apps.ts` | `layer: "universal"` |
| Remove `tesla-optimus-engine` from operate ten | `layer: "universal"` · keep route |
| Move **Kin** to universal | `layer: "universal"` · nav “Household” · not FRE employee |
| Add `my-game` (Gamer) to operate ten | GM0 |
| Nav | **Claw Cafe** · **Signal** · **Kin** · operate ten |
| Storefront | “**Ten Claws** · **Cafe** · **Neural Link** · **Household**” |

### OL-Kin — Mapper decouple (G2+ → G4)

| Wave | Detail |
|------|--------|
| **OL-Kin1** | FRE decouple · copy Kin Claw → Kin · universal layer in `ootb-apps` |
| **OL-Kin2** | Learn reads Kin profiles · QA CCP + Signal guest policy |

### OL-ES / OL-LR — New operate desks (G4+)

| Desk | Waves | Gate |
|------|-------|------|
| **Estate** | ES0 shell + 3 lanes · ES1 Legal · ES2 Property/Tax | G4 / G5 |
| **Learn** | LR0 shell + Kin picker · LR1 curriculum + XP | G4 / G5 |

### OL2–OL4

FRE decouple · `/cafe` alias · Flight Command patron card · honest Tier C cards for Learn/Estate until live.

---

## Forge Fusion — pipeline

```text
Parent A ──handshake── Parent B (v1: Cap×Cre | Work×Cre | Vital×Kin)
        → HS Discover (after pattern threshold)
        → Forge Fusion UI confirm
        → provision + parentLineage
        → forge.fusion_minted
        → Cafe birth ceremony
```

| Metaphor | Product |
|----------|---------|
| Dating | Sustained handshake + Leverage |
| Hospital | **Forge** provisions |
| Nursery | **Cafe** door ceremony |
| Baby | **Forged specialist** (not an OOTB operate slot) |

---

## GTM (locked)

| Say | Don't say |
|-----|-----------|
| “Ten Claws for work” | “Eleven claws” |
| “Claw Cafe — your Patron Hall” | “Engage Claw” |
| “Signal Claw — The Neural Link” | “Signal app” |
| “Kin — your household on the box” | “Kin Claw employee” |
| “Learn — tutor on your metal” | “Kin teaches” (Kin maps; Learn operates) |
| “Estate — legal, property, tax in one desk” | Three separate paperwork claws |
| “Interfaces drift. Your desk conducts.” | “AI Device Hub” as hero |
| “Forge fusion — specialist from two claws” | Auto-spawn agents |
| “Patron Link — confirm and brief from your phone” | “Full CurXor mobile app” |
| “**Ask** — patron chat anywhere · expand when you need depth” | “Another Claw” |

---

## FF waves

| Wave | Scope | Gate |
|------|-------|------|
| **FF0** | OL1 nav + universal vs operate split | G2 |
| **FF1** | `parentLineage` schema | G3 |
| **FF2** | **3 v1 recipes** manual confirm | G4 |
| **FF3** | Cafe birth ceremony | G4 |
| **FF4** | 14-day auto-draft Discover | G5 |
| **FF5** | VR birth ceremony | G5+ |

---

## Open (minor)

| Item | Status |
|------|--------|
| Route `/cafe` vs `/claw-cafe` | Optional polish G4 |
| Learn / Estate Tier C honest cards | Until ES0 / LR0 ship at G4 |
| Public “fusion” vs “specialist mint” | Pro copy = fusion · Cafe = birth mythic |
| Code drift | `ootb-apps.ts` still lists Cafe as Engage · Kin in ten — **OL1 pending** |

---

## References

- Roster ideas: [IDEA-G07](./FUTURE-ROADMAP.md#idea-g07-operate-claw-roster--estate--learn-founder-locked) · [IDEA-ES0](./FUTURE-ROADMAP.md#idea-es0-estate-claw--legal--property--tax) · [IDEA-LR0](./FUTURE-ROADMAP.md#idea-lr0-learn-claw--tutor-desk) · [IDEA-G08](./FUTURE-ROADMAP.md#idea-g08-kin--universal-mapper-program-ol-kin)
- Signal: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
- Gamer: [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md)
- Cafe PRD: [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
- Handshakes: [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md)
- **Universal layer map (full):** [UNIVERSAL-OS-LAYER.md](./UNIVERSAL-OS-LAYER.md)
