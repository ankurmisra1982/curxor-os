# Ad Audience Definitions — Meta & Google

> **Status:** Ready to implement when paid spend starts  
> **ICP:** [ICP-ONE-PAGER.md](./ICP-ONE-PAGER.md) · [AUDIENCE-FRAME.md](./AUDIENCE-FRAME.md)  
> **Creative rule:** Lead with **GTM hero** + grammar gap — never dream-state hero on cold paid

---

## Campaign map (systematic)

| Campaign | Objective | Primary persona | Wedge creative | Funnel |
|----------|-----------|-----------------|----------------|--------|
| **C1 · Core operator** | Conversions (pre-order / waitlist) | P1 Alex | Grammar gap + three Claws | Cold → landing |
| **C2 · Creator wedge** | Conversions | P3 Sam | Headless content / Creator | Cold → landing `#creator` |
| **C3 · Wealth wedge** | Conversions | P2 Jordan | Capital / rules on metal | Cold → landing `#capital` |
| **C4 · Retarget warm** | Conversions | Site visitors 7–30d | Exit-demo clip + objection kill | Warm → landing |
| **C5 · Lookalike seed** | Conversions | 1% LAL from waitlist/email | GTM hero | Cold → landing |
| **C6 · Thesis nurture** | Traffic (not primary spend) | S2 Morgan | Signal accent → `/signal` | Cold → thesis page |

**Budget priority at launch:** C1 > C4 > C2 ≈ C3. **Do not scale C6** until C1 CPA is understood.

---

## Universal targeting rules

### Geo (Act I launch)
- **Primary:** United States, Canada, United Kingdom, Australia
- **Secondary test:** Germany, Netherlands, Ireland (English creative)
- **Exclude:** Markets where $3,999 + shipping/support not ready

### Age
- **Primary:** 25–54
- **Narrow test:** 28–45 for C1

### Language
- English only at launch

### Placements
- **Meta:** Feed + Stories + Reels; exclude Audience Network until creative proven
- **Google:** Search (high intent) + YouTube in-stream (demo clips); Display only for retargeting

### Exclusions (all campaigns)
- Students / university targeting overlays where available
- Interests: "free software," "open source contributions" (assembler persona)
- Job titles: IT Director, CIO, CISO, Procurement (enterprise anti-ICP)
- Custom exclusion: site converters last 30d (from retarget pool)

---

## Meta Ads — audience builds

### C1 · Core operator (Ad Set: Alex)

**Campaign name:** `CURXOR | Conv | C1 Core Operator | US+`

#### Ad set A — Broad interest stack
**Type:** Advantage+ audience OR manual interest stack

**Interests (OR stack — test 3–5 per ad set):**
- Entrepreneurship
- Small business owners
- Startup company
- Freelancer
- Consulting
- Artificial intelligence
- ChatGPT
- OpenAI
- Productivity software
- Email marketing
- Content marketing
- Social media marketing

**Behaviors (optional layer):**
- Small business owners
- Technology early adopters

**Age:** 28–45  
**Gender:** All

#### Ad set B — Creator-adjacent operator
**Interests:**
- Content creation
- YouTube
- Podcasting
- Newsletter
- Substack
- Indie hacker
- Solopreneur

#### Ad set C — Stack pain / SaaS overlap
**Interests:**
- Zapier
- Notion
- HubSpot
- Mailchimp
- Buffer
- Hootsuite
- Instantly (if available)
- Lemlist (if available)

**Creative angle:** "Stop renting five tools."

---

### C2 · Creator wedge (Ad Set: Sam)

**Campaign name:** `CURXOR | Conv | C2 Creator | US+`

**Interests:**
- Content creation
- YouTube creator
- Video production
- Social media marketing
- Twitter / X
- LinkedIn
- Personal branding
- Ghostwriting
- Copywriting

**Exclude:** Gaming creators (wrong wedge unless Engage-led creative)

**Headline tests:**
- "Your content pipeline. On a box you own."
- "Draft while you sleep — on your metal, not their cloud."

---

### C3 · Wealth wedge (Ad Set: Jordan)

**Campaign name:** `CURXOR | Conv | C3 Wealth | US+`

**Interests:**
- Stock trading
- Investing
- Cryptocurrency
- Personal finance
- Algorithmic trading
- Day trading
- Financial independence
- FinTech

**Creative compliance:** No guaranteed returns. Paper trading / rules desk language. "When you wire bridges" honesty.

**Headline tests:**
- "Rules on your metal — not your keys in their cloud."
- "Capital Claw on the desk you own."

---

### C4 · Retarget warm

**Campaign name:** `CURXOR | Conv | C4 Retarget | All geos`

| Audience | Window | Message |
|----------|--------|---------|
| All site visitors | 7d | Demo clip + pre-order |
| All site visitors | 8–30d | Grammar gap + objection FAQ |
| Pricing page viewers | 14d | $3,999 vs SaaS rent calculator frame |
| Video 50%+ | 14d | "See Outreach run locally" |

**Exclude:** Purchased / pre-ordered (custom conversion)

---

### C5 · Lookalike

**Campaign name:** `CURXOR | Conv | C5 LAL 1% | US`

**Seed:** Waitlist email list · pre-order purchasers · engaged site 60s+  
**Size:** 1% US → expand to 1% CA/UK after 50+ seed events  
**Do not seed:** X followers only (too noisy)

---

### C6 · Thesis (low budget)

**Campaign name:** `CURXOR | Traffic | C6 Signal Thesis | US`

**Landing:** `/signal` — NOT main pre-order hero  
**Interests:** Robotics, Smart home, Virtual reality, Wearable technology, Tesla  
**Note:** Validates category story; do not optimize account on this campaign

---

## Google Ads — audience builds

### Search — high intent (always-on)

**Campaign name:** `CURXOR | Search | Brand+Intent | US`

#### Ad group 1 — Brand
```
curxor
curxor ai
curxor.ai
curxor box
curxor appliance
```

#### Ad group 2 — Category intent
```
ai appliance
local ai server
ai hardware box
autonomous ai agents
ai agents hardware
personal ai server
sovereign ai
```

#### Ad group 3 — Problem intent
```
ai that runs locally
self hosted ai agents
alternative to chatgpt subscription
ai outbound automation
ai content automation
```

#### Ad group 4 — Competitor adjacent (careful)
```
openclaw hardware
openclaw appliance
local llm server
```

**Negative keywords (account level):**
```
free
open source tutorial
diy
homelab build
enterprise
sso
compliance
student
course
jobs
career
intern
raspberry pi
mac mini hack
chatgpt plus
```

---

### YouTube — demo clips

**Campaign name:** `CURXOR | YouTube | Demo | US`

**Targeting:**
- Custom intent: searched "AI automation business," "ChatGPT for business," "content automation"
- Placement: indie business, productivity, trading, creator economy channels (curate list)
- In-market: Business services, Business technology

**Creative:** 30–60s exit-demo — Outreach or Creator — no Signal thesis lead

---

### Display — retarget only

**Campaign name:** `CURXOR | Display | Retarget | US`

- Site visitors 30d
- No cold display at launch

---

## Creative matrix (persona × hook)

| Persona | Hook 1 (grammar gap) | Hook 2 (ownership) | Hook 3 (wedge) |
|---------|---------------------|-------------------|----------------|
| **Alex P1** | "AI every day. Nothing stays on." | "$3,999 once · $0/mo API" | "Outreach + Creator + Capital" |
| **Sam P3** | "Still copying prompts at midnight?" | "Headless pipeline on your desk" | "Creator Claw" |
| **Jordan P2** | "Your rules. Your metal." | "No keys in their cloud" | "Capital Claw" |

### Primary text template (Meta)
```
You use AI every day — but it still feels shallow.

CurXor is a desk appliance with ten AI agents that run on your metal 24/7. Outreach, Creator, and Capital in week one. $3,999 once · $0/mo API for the operate plane.

Pre-order → curxor.ai
```

### Headline tests (rotate 3)
1. Your AI team. On a box you own.
2. Stop renting your cognition.
3. Always-on Claws — local inference, your egress.

### CTA button
- Pre-order (primary)
- Learn more (retarget / thesis only)

---

## Tracking & UTM scheme

| Parameter | Value |
|-----------|-------|
| `utm_source` | `meta` · `google` |
| `utm_medium` | `paid` |
| `utm_campaign` | `c1-core` · `c2-creator` · `c3-wealth` · `c4-retarget` · `c5-lal` · `c6-thesis` |
| `utm_content` | `alex-grammar` · `sam-creator` · `jordan-capital` · `demo-outreach` |
| `utm_term` | `{keyword}` (Google Search only) |

**Example:**
```
https://curxor.ai/?utm_source=meta&utm_medium=paid&utm_campaign=c1-core&utm_content=alex-grammar
```

### Conversion events (define before spend)

| Event | Platform | Trigger |
|-------|----------|---------|
| `ViewContent` | Meta | Pricing section view |
| `Lead` | Meta / Google | Waitlist submit |
| `InitiateCheckout` | Meta | Pre-order click |
| `Purchase` | Both | Stripe success |
| `DemoPlay` | Internal | 50% video watch |

---

## Budget & kill rules (launch discipline)

| Signal | Action |
|--------|--------|
| C1 CPA > 2× target after 1k impressions/ad set | Pause ad set · new creative |
| CTR < 0.8% feed after 3k impressions | New hook · not new audience |
| C6 thesis CPA better than C1 | **Suspect attribution** — keep thesis low budget |
| High click, low pricing view | Landing mismatch — check hero + persona section |
| Comments "is this real?" | Pin demo clip + honesty comment |

**Target CPA (placeholder — set after first 10 pre-orders):**  
`$3,999 × margin assumption` → work backward from allowable CAC (~15–25% of ACV for hardware launch = **$600–$1,000** test band).

---

## Compliance & honesty (paid)

- No "guaranteed returns" on Capital creative
- No "all ten Claws production-ready"
- No "fully sovereign OS" until hardware validation — say "runs on your metal"
- Include "Frontier LLM opt-in" if mentioning inference
- Signal/humanoid creative must link to `/signal` with preview disclaimer

---

## Launch checklist

```
☐ Pixel + CAPI (Meta) · GA4 + Google Ads conversion linking
☐ UTM scheme in link builder doc
☐ Create C1–C4 campaigns; C5 after 100+ seed emails; C6 <10% budget
☐ Upload exclusion lists (enterprise titles, students)
☐ 3 creatives per persona minimum (static + 15s clip)
☐ Landing matches ad — persona section live (STOREFRONT-PERSONA-BLOCKS.md)
☐ Retarget pixel firing on pricing + 60s engage
☐ Weekly review: CPA, CTR, comment sentiment, "is this real?" rate
```

---

## Structured handoff

Audience IDs and persona keys: [profile.json](../founder/profile.json) → `gtmAudience.personas` · `gtmAudience.campaigns`
