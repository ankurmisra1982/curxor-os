# Kin Claw — Day One Freeze

**Route:** `/my-family` · **Appliance ID:** `my-family`  
**Freeze band:** Tier C preview (Coming Soon) · **Target tag:** v0.3.10 Tier C sweep  
**Frozen:** 2026-06-23

---

## Verdict

**Ready to freeze** as the **household identity showcase** — not a sixth flagship.

| Gate | Status |
|------|--------|
| Tier C honesty (badge, preview FRE/agent) | ✅ |
| “Why Kin matters” showcase (Optimus + Vital + mesh) | ✅ |
| L1–L5 leveling + tab gates | ✅ |
| Demo household fixture (Ankur, Priya, Arjun, Maya) | ✅ |
| Vital + Signal cross-links → `/my-family` | ✅ |
| CCP family publish + resync | ✅ |
| QA (`qa:kin-levels`) | ✅ |
| GTM capture (`demo:capture:kin`, `06-kin-claw.png`) | ✅ |
| Optimus guest-mode routing | ⏳ post-freeze (Signal Claw) |
| Vital per-member health routing | ⏳ post-freeze (Vital Claw) |

---

## What “frozen” means

**In scope (no new features until unfreeze):**

- Preview shell, growth levels, member/profile/devices/mesh/settings tabs
- Showcase narrative cards + honest “Coming Soon” on Optimus/Vital depth
- Local profiles (`family-profiles.json`) + mesh resync
- Skills: `add_member`, `bind_device`, `resync_mesh` (growth-gated)
- `notifyWhenLive` local flag on Settings tab

**Out of scope (explicit unfreeze waves):**

- Role/scope editors, child-mode policy UI
- Live Optimus guest recognition or Vital household routing
- Smart-home device discovery, hardware pairing
- Claw Cafe XP from cross-member habits

---

## Demo script (30s)

1. Open **Kin Claw** → **Why Kin matters** cards (Optimus tone, Vital per-person health)
2. Click **Priya** / **Arjun** — separate identities on one box
3. **Mesh** tab → Signal + Vital highlighted as family subscribers
4. Optional: **Vital** or **Signal** → “Open Kin Claw →” cross-link

---

## QA

```bash
npm run qa:kin-levels
npm run demo:capture:kin
```

**Dev fixture:** `scripts/dev-qa/family-profiles.json`  
**Screenshot:** `docs/demo-pack/screenshots/06-kin-claw.png`

---

## References

- [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)
- [17-kin-claw-family.md](../guides/17-kin-claw-family.md)
- [15-claw-context-protocol.md](../guides/15-claw-context-protocol.md)
