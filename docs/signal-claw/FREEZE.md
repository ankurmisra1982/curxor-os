# Signal Claw — Day One Freeze

**Route:** `/optimus` · **Appliance ID:** `tesla-optimus-engine`  
**Freeze band:** Tier C preview (Coming Soon) · **Target tag:** v0.3.10 Tier C sweep  
**Frozen:** 2026-06-22

---

## Verdict

**Ready to freeze** as the **Humanoid Home Hub preview** — not a sixth flagship.

| Gate | Status |
|------|--------|
| Tier C honesty (badge, preview FRE/agent) | ✅ |
| Humanoid Home Hub (teach · instruct · relate) | ✅ |
| Five-tab workspace (Home, Fleet, Knowledge, Routines, Control) | ✅ |
| Pair-day wizard (preview — `paired_preview`) | ✅ |
| Kin-aware policies + knowledge audit | ✅ |
| Motor mesh preview (Control tab) | ✅ |
| QA (humanoid hub checks in `qa:smoke`) | ✅ |
| Live Optimus hardware pairing | ⏳ post-freeze |
| Ambient signal desk / feed orchestration | ⏳ post-freeze |

---

## What “frozen” means

**In scope (no new features until unfreeze):**

- Preview shell, `PreviewModuleBanner`, Kin cross-link
- Humanoid hub store, pair wizard simulation, knowledge push/audit
- Routine compose + arm templates for pair day
- Control tab motor preview (torque envelope, no live motion)
- Skills: `home_position`, `grip_test` (preview-gated)

**Out of scope (explicit unfreeze waves):**

- Live BLE/VIN pairing with production Optimus units
- Real-time motor commands on paired hardware
- Ambient world-signal feeds spinning up other Claws
- Removing Coming Soon badge (flagship promotion only after hardware validation)

---

## Demo script (45s)

1. Open **Signal Claw** → **Coming Soon** preview banner
2. **Home** — relationship + neural link readiness
3. **Knowledge** — house rules, Kin policy, **Push to mesh**, **View audit**
4. **Fleet** — add unit → **Pair day wizard** (preview finish)
5. **Control** — mesh preview; close with honest “pair day enables real motion”

---

## QA

```bash
cd pillar-4-dashboard
npm run dev   # terminal 1
npm run qa:smoke   # includes humanoid hub + optimus mesh checks
npm run verify:tier-c-sweep
```

**Screenshot:** `docs/demo-pack/screenshots/07-unified-inbox.png` (nav context) · capture Signal tabs via Playwright when refreshing demo pack.

---

## References

- [PRODUCT-DEFINITION.md](./PRODUCT-DEFINITION.md)
- [EXIT-DEMO.md](./EXIT-DEMO.md)
- [../curxor-os/DAY-ONE-BUILD-PLAN.md](../curxor-os/DAY-ONE-BUILD-PLAN.md) — Tier C contract
