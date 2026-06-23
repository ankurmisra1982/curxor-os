# Claw Cafe — Exit Demo Walkthrough

> **Audience:** Operator / buyer demo on dev box or MS-S1 appliance  
> **Route:** `/claw-cafe` · nav label still **Engage Claw** (kiosk sub-lane; full rebrand optional)  
> **Version target:** v0.7.0

## Before you start

1. Dashboard running: `npm run dev` (or appliance on `http://<appliance-ip>:3080`)
2. Gamification **on**: Settings → Appearance → **Gamification** checked
3. FRE initialized: `scripts/dev-qa/app-fre/claw-cafe.json` or setup wizard
4. Optional: Build Plane linked for Architect pulse (Settings → Build Plane)

**Post MS-S1 unbox:** Repeat this script on appliance IP after `npm run qa:local` green on-device.

---

## 1. Open Ascension home (30s)

1. Navigate to **Engage Claw** (`/claw-cafe`)
2. Note default tab: **L1 → Play**, **L2+ → Ascension** (dev-qa FRE uses L2 → lands on Ascension)
3. Open **Ascension** tab if not already there

**Say:** *"Claw Cafe is the OS gamification home — every Claw you run on this box feeds one ascension ledger."*

---

## 2. Sync cross-Claw events (45s)

1. Scroll to **Ascension** panel → tap **Sync Claws**
2. Open **Cross-Claw feed** — confirm Work / Creator / Capital / Forge / Swarm rows
3. Point at epithet strip: `{Ascension title} · {primary desk epithet}`

**Say:** *"No cloud leaderboard — this is your sovereign event bus on bare metal."*

---

## 3. Pixel room walk + inspect (60s)

1. In **Pixel room**, use **arrow keys** or **click** to walk
2. Walk adjacent to **Outreach** (mailbox) or **Creator** (publish desk)
3. Inspect flyout appears → **Open Claw** deep-links to the desk
4. Optional easter eggs:
   - Click **Coffee** tile
   - Press **E** for eno2 freeze (Claws hold outbound)
   - Night window: top row after 8pm local
   - **Blueprint nook** (L4+): The Architect inspect; whisper at lower tiers

**Say:** *"Patron walks the room; Claws animate on live SSE when real events fire."*

---

## 4. Go Live + demo tour (60s)

1. Scroll to **Go Live** checklist — note `demoReady` when XP + events exist
2. Tap **Run demo tour** (or agent skill **Run Demo Tour**)
3. Watch feed + pixel room pulse — Work stub, Forge stub, tour complete

**Say:** *"Buyer-ready in one click — no SMTP, no broker keys, no mock cloud."*

---

## 5. Level-up ceremony (30s)

1. If tier increased after tour/sync, **Ascension modal** appears (G-tier bump)
2. Show progress bar, Knowledge / Wealth affinities, milestone chips
3. If milestones incomplete, **Sync Claws to advance** nudge with CTA

**Say:** *"Ceremonies reward real OS mastery — not click farming."*

---

## 6. Play kiosk sub-lane (optional, 45s)

1. Switch to **Play** tab
2. Select lane → **Start Game** / **Drop Claw** skills
3. Lane A vision when mesh connected; yard dock sprites when LIVE

**Say:** *"Play is the event kiosk lane — Ascension is the product home."*

---

## 7. Host tab (L2+, 20s)

1. Open **Host** tab → kiosk name, prize mode, lanes from FRE

---

## QA gate (before recording)

```bash
cd pillar-4-dashboard
npm run typecheck
npm run qa:local -- --port 3081
npm run qa:cafe-ascension -- http://127.0.0.1:3081
npm run qa:cafe-checklist -- http://127.0.0.1:3081
node scripts/capture-cafe-swarm-freeze.mjs --base http://127.0.0.1:3081
```

Screenshots: `docs/demo-pack/screenshots/cafe/18-ascension-tab.png`, `19-pixel-room.png`

---

## Backlog (honest)

- Master AI patron chat (v0.8)
- Full forged desk XP hooks
- Tier C preview bubbles in pixel room
- Nav rebrand Engage → Claw Cafe
- Second room / eno2 break room
