# CurXor OS — Founder Overnight Audit

> **Date:** June 2026 (overnight session)  
> **For:** Ankur Misra, Founder & CEO  
> **Version audited:** `0.6.5`  
> **Hardware:** MS-S1 MAX incoming (~Thu Jun 25)

---

## Executive summary

**You are in a good place to unbox — not a finished product, but an honest sovereign OS demo that can make you smile on first boot if we follow the hardware checklist.**

The dashboard is **functionally rich on the dev machine**: four flagship Claws + Forge have Go Live flows, growth levels, and QA checklists; Claw Cafe has shipped the C4–C7 vision arc (pixel room, patron, cross-Claw sync, ceremonies, easter eggs, Go Live); Tier C apps are honestly labeled Coming Soon.

**One critical bug was fixed tonight:** gamification and Cafe state were defaulting to `scripts/dev-qa` inside the install directory on production — **systemd blocks writes there**. All XP/Cafe stores now use `lib/curxor-data-dir.ts` → `/etc/curxor` when `NODE_ENV=production`.

**What will still feel “dev” on first hardware boot:** no API keys until you add them, Ollama models may need pull, vision mesh idle without cameras, pixel art is placeholder rectangles (charming, not final art).

---

## 1. Where we stand — app by app

### Tier A — Flagship (production-demo quality)

| App | Route | Functional? | Go Live | Growth L1–L5 | Notes |
|-----|-------|-------------|---------|--------------|-------|
| **The Forge** | `/claw-forge` | Yes | Yes | Yes | F0–F15 shipped; mint → Cafe events |
| **Capital** | `/my-capital` | Yes | Yes | Yes | Paper Alpaca path; keys in `digital.env` |
| **Creator** | `/my-content` | Yes | Yes | Yes | Publish loop; bridges need keys |
| **Outreach / Work** | `/my-work` | Yes | Yes | Yes | Persona levels, deliverability surfaces |

### Tier B — Claw Cafe

| Capability | Status |
|------------|--------|
| G1–G6 ascension | Shipped |
| Pixel room + patron walk/inspect | Shipped |
| Cross-Claw sync (Work, Creator, Capital, Swarm, Forge) | Shipped |
| Level-up modal, default Ascension tab L2+ | Shipped |
| Go Live + demo tour | Shipped |
| Architect easter egg + yard dock | Shipped |
| C8 FRE intent / milestone nudges | **Shipped** — `cafeGrowthIntent`, `CafeLevelUpNudge`, ascension coach tips, Gamification toggle |
| C9 GTM scorecard / v0.7.0 tag | **Shipped** — `cafe-checklist.mjs`, EXIT-DEMO, captures, `version.json` 0.7.0 |

### Tier C — Coming Soon (honest previews)

Arbitrage, Signal, Swarm, Vital, Kin — preview banners, no fake live APIs. **Correct for GTM.**

### OS shell

| Surface | Status |
|---------|--------|
| FRE `/setup` | Works — redirects until initialized |
| Home `/home` | Fixed tonight — uses `user-settings` (was fre-state drift) |
| Settings | Appearance, claws, intelligence, MCP egress, **Build Plane panel** |
| Forged claws `/my-claw/[slug]` | Works |
| Build Plane | **BP0 + BP1 shipped** — Settings panel, `/api/build/status`, inbound MCP at `/api/build/mcp` (read-only); real Cursor OAuth still deferred |

---

## 2. Unified architecture — does it delight?

### What works well

1. **Three-tier experience** (`beginner` / `standard` / `expert`) + **L1–L5 growth** per Claw — progressive disclosure is real, not cosmetic.
2. **`ExperienceAppSection`** + coach tips — consistent shell across flagships.
3. **Claw Context Protocol (CCP)** — inter-Claw mesh context exists; consent matrix in place.
4. **Operate vs Build planes** — conceptually separated; Cafe Architect reads `buildPlane.linkStatus`.
5. **Sovereignty UX** — gamification opt-out, honest Tier C labels, local inference default.

### Friction to know (not blockers)

| Issue | Severity | User impact | Fix status |
|-------|----------|-------------|------------|
| XP/Cafe wrote to wrong path on appliance | **P0** | Cafe ascension never persists | **Fixed** — `curxor-data-dir.ts` |
| Home vs nav `selectedApps` source | P1 | Rare module list mismatch | **Fixed** — home uses user-settings |
| Settings label “Work gamification” | P2 | Confusing — controls all XP | Rename in C8 |
| `UiModeProvider` localStorage vs server | P2 | Brief tier flash on load | Acceptable for v1 |
| Shop / Kin / Signal no Go Live panel | P2 | Uneven exit-demo | Tier C — OK |
| Build Plane not runtime-connected | P2 | Was expected pre-BP1 | **Partially fixed** — inbound MCP read tools live; OAuth/worker deferred |
| Pixel room art = colored tiles | P2 | Vision fidelity ~3.5/5 | Art pass later |

**Verdict:** The overlay architecture **works as intended** for a sovereign appliance demo. The delight layer (Cafe, ceremonies, easter eggs) is **credible** — not yet best-in-class GTM (4.5+) until C8/C9 + appliance capture.

---

## 3. Does the OS work as intended?

On **dev machine** with `npm run qa:local`:

- API smoke, user flows, per-Claw level scripts, forge/capital/creator checklists are wired.
- Middleware FRE routing, LAN auth on mutating routes, SSE streams for cafe/vision/motor.

On **appliance** (predicted):

- **Will work:** Dashboard, FRE, all UI, local JSON persistence (after tonight’s fix + seed script).
- **Needs config:** `digital.env` keys, Ollama model pull, eno1/eno2 networking scripts.
- **Needs validation:** ROCm inference, mesh broker, engine loop — **never proven on gfx1151 hardware yet**.

---

## 4. Changes executed tonight

| Change | Why |
|--------|-----|
| `lib/curxor-data-dir.ts` | Single production data root |
| Updated 10+ XP/Cafe/forge event stores | P0 persistence fix |
| `app/(desktop)/home/page.tsx` | Align selectedApps with nav |
| `scripts/seed-appliance-data.sh` | First-boot `/etc/curxor` seed |
| `pillar-4-dashboard/scripts/install.sh` | Calls seed script; chown `/etc/curxor` |
| `.env.example` | Document `CURXOR_DATA_DIR` |
| `docs/curxor-os/HW-READINESS-CHECKLIST.md` | Hardware session playbook |
| This audit doc | Founder report |

---

## 5. Gaps remaining (prioritized)

### Before unbox (software)

- [x] Run `npm run qa:local` green on dev machine
- [x] Complete Cafe **C8** (FRE intent, coach, nudge) + **C9** (scorecard, v0.7.0 tag) — Cafe Agent chat
- [x] Optional: rename gamification toggle in Settings

### At unbox (hardware)

- [ ] Follow [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md)
- [ ] BIOS UMA max, label eno1/eno2
- [ ] `install-all.sh` on clean Ubuntu or audited image
- [ ] On-device `qa-smoke.mjs` against `127.0.0.1:3080`

### After golden path

- [ ] OTA tag only after on-device smoke
- [ ] Appliance demo captures for storefront
- [ ] Optional kiosk (monitor-first): `install-kiosk-mode.sh` → reboot — [19-kiosk-mode.md](../guides/19-kiosk-mode.md)
- [ ] Master AI patron panel (v0.8)
- [x] Build Plane inbound MCP (v0.8.1) — PR #2 · merge pending approval

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh
# or: sudo CURXOR_ENABLE_KIOSK=1 /opt/curxor/scripts/install-all.sh
sudo reboot
```

---

## 6. Questions for build Agent chats

Use these when you return — each is a scoped sprint.

### Cafe Agent

1. C8: Add `cafeGrowthIntent` to FRE + `CafeLevelUpNudge` + ascension-focused coach tips?
2. C9: Run `cafe-checklist.mjs`, update BEST-IN-CLASS scorecard, bump to **v0.7.0**?
3. Tier C preview bubbles in pixel room — worth it before HW or defer?

### Forge / Build Plane Agent

4. ~~BP0 complete?~~ **Done** — BP1 inbound MCP shipped on PR #2.
5. Start v0.8.2 OS event bus webhooks (`forge.claw_minted`, `go_live.failed`, …)?
6. Any forged desk events still missing from Cafe sync?

### Hardware Agent (day of unbox)

6. Inventory output — clean install vs vendor image?
7. Does `rocm-smi` see gfx1151 after `deploy.sh --pull-models`?
8. eno1 captive portal + eno2 mesh — `verify-mesh.sh` pass?

### Flagship hygiene

9. Work deliverability — any red items in `work-checklist.mjs` before demo?
10. Capital — paper trading smoke with empty keys (demo path only)?

### GTM (storefront repo)

11. Storefront still claims “ten Claws” with five Coming Soon — copy accurate?
12. Add one appliance screenshot after first boot?

---

## 7. Recommended path forward

```text
Tonight (done)     → P0 fixes + HW checklist + this audit
Your return        → qa:local green · skim this doc
Before unbox       → Cafe C8+C9 (optional but recommended for smile)
Unbox day          → HW-READINESS-CHECKLIST with CTO session
Week after unbox   → Golden path doc · tag · OTA · continue iteration
```

### SDLC glossary (for you)

| Term | Meaning for CurXor |
|------|-------------------|
| **Dev QA** | `npm run qa:local` on laptop — automated API/UI hooks |
| **UAT** | You clicking through flagship + Cafe on real hardware — “does it make me smile?” |
| **Golden path** | Documented steps that worked once on MS-S1 — copy for every box |
| **Hardening** | Tonight’s persistence fix + seed script + install chown — not feature work |
| **Exit demo** | Go Live + demo tour + capture script per Claw |

---

## 8. Honest founder read

You are **not** going blind. The software is **real**, the vision layers **connect**, and the honest Coming Soon story **protects trust** at $3,999.

First hardware boot will feel like **a powerful dev kit that became an appliance** — not a polished consumer gadget. That is the correct stage. Your job at unbox is to **validate inference, networking, and persistence** — not to judge pixel art.

If sync works, ascension ticks up, Forge mint walks into the Cafe, and Settings feels calm — **you should smile.**

---

## References

- [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md)
- [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md)
- [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md)
- [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
- [FEATURE-FUNCTION.md](../FEATURE-FUNCTION.md)
