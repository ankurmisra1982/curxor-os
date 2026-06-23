# Vital Claw — Day One Freeze

**Route:** `/my-vital` · **Appliance ID:** `my-vital`  
**Freeze band:** Tier C preview (Coming Soon) · **Target tag:** v0.3.10 Tier C sweep  
**Frozen:** 2026-06-22

---

## Verdict

**Ready to freeze** as **Longevity Lab preview + honest bridges** — not a sixth flagship.

| Gate | Status |
|------|--------|
| Tier C honesty (badge, preview FRE/agent) | ✅ |
| L1–L5 leveling + tab/skill gates | ✅ |
| Longevity Lab (ask, RAG, protocol diff) | ✅ |
| Go-live checklist (`demoReady` — not production live) | ✅ |
| Wearable bridges labeled preview | ✅ |
| Kin cross-link | ✅ |
| QA (`qa:vital-levels`) | ✅ |
| Garmin/lab PDF OCR on real eno2 | ⏳ post-freeze |
| Clinician export on appliance | ⏳ post-freeze |

---

## What “frozen” means

**In scope (no new features until unfreeze):**

- Preview shell, growth levels, overview/protocol/reports/analytics tabs
- Lab Q&A, literature RAG, protocol diff panel
- Demo tour + go-live checklist (demo readiness only)
- Bridges panel with honest “preview until eno2” copy
- Skills: `sync_wearables`, `ingest_report`, `update_protocol` (local/demo)

**Out of scope (explicit unfreeze waves):**

- Live Garmin OAuth on appliance
- Full PDF OCR pipeline via eno2
- Production clinician packet export
- Removing Coming Soon badge (flagship promotion only after appliance validation)

---

## GTM truth (say this at freeze)

| ✅ Allowed | ❌ Do not say |
|-----------|----------------|
| “Longevity Lab runs on-box today — Q&A, protocol diff, demo vitals” | “Full clinical-grade health platform” |
| “Wearable bridges preview until your appliance validates eno2” | “Garmin sync works out of the box at $3,999” |
| “Ten Claws — Vital is **Coming Soon** with Lab live” | “Replaces your doctor” |

---

## Demo script (30s)

1. Open **Vital Claw** → **Coming Soon** preview banner
2. **Lab** — ask a longevity question (Attia lens)
3. **Protocol** — diff view + focus refresh
4. **Go Live** panel — demo checklist (not production Go Live)
5. Optional: **Kin** cross-link → household context story

---

## QA

```bash
cd pillar-4-dashboard
npm run qa:vital-levels
npm run verify:tier-c-sweep
```

---

## References

- [../guides/16-vital-claw.md](../guides/16-vital-claw.md)
- [../curxor-os/GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)
- [../curxor-os/DAY-ONE-BUILD-PLAN.md](../curxor-os/DAY-ONE-BUILD-PLAN.md) — Tier C contract
