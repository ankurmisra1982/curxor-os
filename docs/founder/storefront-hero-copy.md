# Storefront hero copy — paste into `curxor storefront`

> **Source of truth (structured):** [profile.json](./profile.json) → `messagingLadder` (GTM) · `dreamState` (vision)  
> **Dream state overview:** [DREAM-STATE-OVERVIEW.md](../curxor-os/DREAM-STATE-OVERVIEW.md) — investor / essay / category film  
> **Sync:** Paste into landing hero + optional “What is this?” strip on [curxor.ai](https://curxor.ai)  
> **Related:** [LOOP-POSITIONING.md](https://github.com/curxor-ai/curxor-storefront/blob/main/docs/LOOP-POSITIONING.md) (if present in storefront repo) · [IDEA-G11](../curxor-os/FUTURE-ROADMAP.md)

---

## Two messaging tiers (do not mix)

| Tier | When | Source | H1 |
|------|------|--------|-----|
| **GTM · ship now** | Cold traffic · pre-order · curxor.ai main hero | `messagingLadder.hero` | Your AI team. On a box you own. |
| **Dream state** | Investor · essay · `/signal` · film · G4 rebrand | `dreamState.hero` | Designed around you. Owned by you. |

**Rule:** Storefront main hero stays **GTM** until G4 gate. Dream-state copy lives on `/signal`, deck, and essay — not as the only headline for buyers who need plain English today.

Full dream-state blocks: [DREAM-STATE-OVERVIEW.md](../curxor-os/DREAM-STATE-OVERVIEW.md) · JSON in `profile.json` → `dreamState`.

---

## Problem we're fixing

**"The orchestrator on your desk"** is layer 4 (thesis). Cold visitors need layers **1 + 2** first. **Dream-state H1** (`Designed around you. Owned by you.`) is for vision surfaces — see tier table above.

| Layer | Job | Use on main hero? |
|-------|-----|-------------------|
| 1 · What | Physical object | **Yes — H1** |
| 2 · Do | Outcome | **Yes — subhead** |
| 3 · Different | vs cloud rent | **Yes — price line** |
| 4 · Thesis | Vision | **Accent only** — not sole headline |

---

## Hero block (paste)

> **Tier:** GTM · ship now (Act I). Do not replace with dream-state H1 until G4.

### H1
```
Your AI team. On a box you own.
```

### Subhead
```
CurXor is a desk appliance with CurXor OS — ten autonomous AI agents, local inference, and a command dashboard on your network. $3,999 once · $0/mo API for the operate plane.
```

### Accent line (smaller / italic — below subhead or above footer · links to `/signal`)
```
Interfaces drift. Your desk conducts.
```

**Conductor vs orchestrator (GTM Jun 2026):** Homepage accent uses **conductor** verb — more accessible than orchestrator on cold traffic. Essays, deck, and `/signal` payoff keep **orchestrator** noun. Same layer 4 thesis.

**Live storefront subhead weave (config.ts):** *…Run Capital, Creator, and Outreach Claws on a desk that conducts…*

### Primary CTA
```
Pre-order
```

### Secondary CTA
```
See how it works
```

---

## “What is this?” strip (three columns)

Place directly under hero or above pricing.

### Column 1 — The box
**Title:** The box  
**Body:** A MINISFORUM MS-S1-class appliance. Plug into your network. You own the hardware.

### Column 2 — The OS
**Title:** CurXor OS  
**Body:** Agents, inference, and control stay on your metal — not a cloud subscription.

### Column 3 — The agents
**Title:** Ten Claws  
**Body:** Your orchestra of autonomous AI agents — capital, content, outreach, and more. Mint sections in The Forge.

### Strip footer (one line)
```
You compose the score. Unplug egress — the hall keeps thinking. The symphony plays on your metal.
```

---

## Symphony section (homepage · live)

Placed after “What is this?” — component `SymphonySection` · copy in `symphony-metaphor.ts`.

### H2
```
One desk conducts. The symphony plays.
```

### Payoff (italic)
```
The symphony plays.
```

### Bridge
```
The orchestrator on your desk — the conductor for your Claws.
```

Five-column grid: You · CurXor desk · Claws · Signal · Claw Cafe — see `profile.json` → `dreamState.symphony.roles`.

---

## Section order (main landing)

1. **Hero** — layers 1–3 (box · agents · price)  
2. **What is this?** — three-column strip  
3. **Symphony** — `#symphony` five-role model · *The symphony plays.*  
4. **How it works** — Plug in → Flight Command → run Claws  
4. **Pricing** — Standard $3,999 · Pro 128 $4,999 (see MS-S1 cheatsheet)  
5. **Why orchestrator** — move “next interface” / thesis copy here or link to `/signal`  
6. **Honest preview** — shipped vs coming soon (no mock depth as live)

---

## Naming lock — Claw vs orchestrator

**Locked Jun 2026** · full spec: [DREAM-STATE-OVERVIEW.md](../curxor-os/DREAM-STATE-OVERVIEW.md) § Naming · JSON: `profile.json` → `dreamState.naming`

| Term | Use for |
|------|---------|
| **Orchestrator** | The desk / CurXor system — essay & deck noun |
| **Conducts / conductor** | Same thesis — **GTM verb** on homepage accent (`Interfaces drift. Your desk conducts.`) |
| **Claw** | Each vertical employee — Capital Claw, Creator Claw, etc. |
| **AI agents / digital employees** | Cold-traffic gloss before “Claw” |

**GTM accent:** *Interfaces drift. Your desk conducts.*

**Essay one-liner:** *CurXor is the orchestrator on your desk. Claws are the team it runs.*

**Never:** “ten orchestrators on your desk” · “Claw” alone above the fold without gloss.

**Strip column 3 title:** keep **Ten Claws** — body must include “autonomous digital employees” or “AI agents” in the first sentence.

---

## Demote on main hero (do not lead with)

- “The orchestrator on your desk” as **only** headline  
- “Sovereign” without a plain-English gloss on first visit  
- “Claws” without “AI agents” or “digital employees” in parentheses at least once  
- EN01 / EN02 / mesh jargon above the fold  

---

## Keep thesis on these routes only

| Route | Content |
|-------|---------|
| `/signal` | “What is the next interface? Wrong question.” |
| Founder essay | [Why I'm Building CurXor](https://x.com/ankurmisra/status/2070024704925077702) |
| Footer / meta | “The orchestrator on your desk” as tagline is OK |

---

## Meta / SEO (optional)

**Title:** CurXor — Your AI team on a box you own  
**Description:** Desk appliance + CurXor OS. Ten autonomous AI agents, local inference, $3,999 once, $0/mo API rent. Pre-order the sovereign AI desk.

---

## Comment reply template (social)

When someone asks what the hero means:

```
Plain version: a $3,999 AI box on your desk with CurXor OS — ten agents that run locally 24/7. No monthly API bill. "Orchestrator" is the vision; the box is what you buy.
```

---

## Storefront repo checklist

```
☐ Replace hero H1 + subhead with blocks above
☐ Add three-column “What is this?” strip
☐ Move orchestrator line to accent (smaller type)
☐ Link “See how it works” → how-it-works section or /signal (pick one)
☐ Update meta title + description
☐ A/B later: hero H1 alt — "An AI computer on your desk — with ten employees built in."
```

---

## One-liner (bios, Boardy, investor threads)

**GTM (ship now):**
```
CurXor — a desk appliance that runs ten AI agents on hardware you own. $3,999 once. No API rent.
```

**Dream state (investor / essay):**
```
CurXor — a sovereign AI system for your desk. Designed around you. Owned by you.
```
