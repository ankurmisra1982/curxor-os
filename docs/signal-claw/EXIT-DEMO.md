# Signal Claw — Exit Demo Script

**Duration:** ~100 seconds · **Audience:** home humanoid buyers, investors  
**Route:** `/optimus` · **Frame:** Humanoid Home Hub preview — teach before hardware arrives

---

## Before you record

```bash
cd pillar-4-dashboard
npm run dev
npm run demo:record:optimus
npm run demo:capture:optimus
```

---

## Narration script (~100s)

### 0:00 — Humanoid Home Hub

> "This is **Signal Claw** — CurXor's **Humanoid Home Hub**. Preview today: you teach your robot **before** it arrives. No cloud account linking spree."

**Show:** Home tab · Coming Soon badge · neural link readiness bar.

### 0:15 — Relationship

**Do:** Set robot name + "calls you" · Save relationship.

> "Name your unit and how it relates to you — warm, professional, guest-aware. This stays on **your appliance**, not a vendor cloud."

### 0:28 — Kin-aware policy

**Do:** **Knowledge** tab · scroll to Kin-aware robot policy · change one member's tone.

> "Every Kin member gets a **robot policy** — tone, kitchen boundaries, bedroom entry, ask-first zones. Kids get playful + restricted; guests get warm + no private rooms. Derived from Kin, tuned here, synced on push."

### 0:42 — Pair-day memory audit

**Do:** Click **View audit**.

> "Before pair day, you can **audit exactly what the robot inherits** — rules, Kin policies, armed routines, fleet slots, CCP consent. Transparent memory — no black box."

**Do:** Close audit · add a house rule · **Push to mesh**.

> "House rules package into **robot memory** on the Claw Context mesh alongside Kin policies."

### 0:58 — NL routine composer

**Do:** **Routines** tab · type a plain-language instruction · **Compose & arm**.

> "Describe routines in English — guest greet, quiet hours, elder support — the hub structures them and **arms for pair day**. Templates still ship; composition is live in preview."

### 1:12 — Fleet + Control

**Do:** **Fleet** tab · optional pair-day wizard preview · **Control** tab · torque slider.

> "Multi-robot fleet and pair wizard are **simulated on appliance** today. Control is mesh preview only — we're not claiming live humanoid motion in the box yet."

### 1:22 — Agent

**Do:** Ask agent: *"What will my robot know about guests on pair day?"*

> "The agent reads the same mesh — Push Knowledge and Sync Context publish what you taught. **Neural link lite** starts here."

### 1:30 — Close

> "CurXor: teach, instruct, relate — then pair. Everything you saw ran on localhost."

---

## Do not say

| Avoid | Say instead |
|-------|-------------|
| "Controls your Tesla Bot today" | "Hub + mesh preview until pair day" |
| "Production home robot" | "Preview — knowledge packages ship now, motion later" |
| "Cloud-trained personality" | "Kin-aware policies on your appliance" |

---

## Capture checklist

| Asset | Command | Output |
|-------|---------|--------|
| Walkthrough video | `npm run demo:record:optimus` | `docs/demo-pack/optimus-walkthrough.webm` |
| Screenshots | `npm run demo:capture:optimus` | `docs/demo-pack/screenshots/signal/` |

---

## Related

- [PRODUCT-DEFINITION.md](./PRODUCT-DEFINITION.md)
