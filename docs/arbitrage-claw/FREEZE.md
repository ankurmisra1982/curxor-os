# Arbitrage Claw — Day One Freeze

**Route:** `/my-shop` · **Appliance ID:** `my-shop`  
**Freeze band:** Tier C preview (Coming Soon) · **Target tag:** v0.3.10 Tier C sweep  
**Frozen:** 2026-06-23

---

## Verdict

**Ready to freeze** as a **preview + showcase** claw — not as a sixth flagship.

| Gate | Status |
|------|--------|
| Tier C honesty (badge, no false Go Live) | ✅ |
| L1–L5 leveling + tab/skill gates | ✅ |
| Commerce read bridges (Shopify, eBay, Printify) via eno2 pattern | ✅ |
| Live multi-channel desk showcase (`activate_desk_showcase`) | ✅ |
| QA (`qa:shop-levels`, `qa:shop-bridges`, `verify:shop-freeze`) | ✅ |
| GTM capture scripts | ✅ |
| Copy audit (agent catalog, preview banner) | ✅ |
| Appliance receipt validation on real hardware | ⏳ post-freeze |
| Write paths (inventory, Printify order create) | ⏳ post-freeze |

---

## What “frozen” means

**In scope (no new features until unfreeze):**

- Preview shell, growth levels, demo skills (`ingest_order` → `ship_bin`)
- Channel connect strips + receipt-gated “connected” semantics
- Merged margin desk + eBay pipeline + Printify fulfillment strip
- `activate_desk_showcase` / `sync_all_channels` API actions
- Mock dev path (`CURXOR_*_MOCK=1`) for demos without API keys

**Out of scope (explicit unfreeze waves):**

- Etsy, TikTok Shop, AliExpress, CSV import bridges
- Shopify inventory write, Printify order create, eBay offer publish
- Margin alert rules engine, claw pick verification, ship-bin hardware bridge
- Removing Coming Soon badge (flagship promotion only after appliance validation)

---

## GTM truth (say this at freeze)

| ✅ Allowed | ❌ Do not say |
|-----------|----------------|
| “Ten Claws — Arbitrage is **Coming Soon** with a live desk **preview**” | “Full production arbitrage desk today” |
| “See Shopify + eBay + Printify merge on one sovereign spread matrix” | “Works with your stores out of the box at $3,999” |
| “Activate desk preview in the demo — receipt-gated via eno2” | “We replace Shopify Admin” |
| “Connectors ship wave by wave after appliance validation” | “All marketplaces integrated” |

**Elevator (showcase mode):**  
*Arbitrage Claw — sovereign multi-channel margin desk. Shopify COGS, eBay fulfillment, and Printify production cost in one spread matrix, receipt-gated on your appliance. Preview it today; link your stores when the box validates.*

---

## Freeze checklist (operator)

Run from `pillar-4-dashboard` with dev server up (`npm run dev` or `npm run qa:local`):

```bash
# 1 — Growth + preview contract
npm run qa:shop-levels

# 2 — Commerce bridges + live desk showcase (needs CURXOR_*_MOCK=1 on server)
npm run qa:shop-bridges

# 3 — Freeze scaffold (routes, API shape, docs, env template)
npm run verify:shop-freeze

# 4 — GTM assets (Playwright)
npm run demo:capture:shop
npm run demo:record:shop
```

**Demo env (dev-qa):** `qa-local.mjs` sets `CURXOR_SHOPIFY_MOCK`, `CURXOR_EBAY_MOCK`, `CURXOR_PRINTIFY_MOCK` and commerce credential paths automatically.

**Showcase flow for buyers:**

1. Settings → Arbitrage growth **L2 Flipper** (or FRE `side_hustle_flips`)
2. `/my-shop` → **Activate desk preview**
3. Walk Overview strip → Margins (merged spreads) → Pipeline (eBay) → Fulfillment (Printify)

---

## File map (frozen surface)

| Area | Path |
|------|------|
| App shell | `components/apps/MyShopApp.tsx` |
| Desk showcase | `components/apps/shop/ShopMultiChannelDeskStrip.tsx` |
| Bootstrap | `lib/shop-dashboard-bootstrap.ts`, `lib/shop-desk-showcase.ts` |
| API | `app/api/shop/status/route.ts` |
| eno2 bridges | `pillar-3-telemetry/.../digital_bridges.py` (`commerce.shopify.*`, `commerce.ebay.*`, `commerce.printify.*`) |
| Product docs | `docs/arbitrage-claw/*` |
| QA | `scripts/qa-shop-*.mjs`, `scripts/verify-shop-freeze-scaffold.mjs` |
| Screenshots | `docs/demo-pack/screenshots/shop/` |

---

## Unfreeze triggers

Open a new build wave only when:

1. **MS-S1 validated** — at least one real channel receipt on appliance (not mock)
2. **Ankur approves** flagship promotion OR a specific bridge write path
3. **Scope doc updated** — bump `RELEASE-NEXT.md` before coding

Post-freeze first wave recommendation: **Shopify read on appliance** (prove eno2 receipt end-to-end) before any write path.

---

## References

- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — shipped list + deferred
- [PRODUCT-DEFINITION.md](./PRODUCT-DEFINITION.md) — north star
- [COMMERCE-BRIDGE-ROADMAP.md](./COMMERCE-BRIDGE-ROADMAP.md) — eno2 build order
- [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) — persona matrix
- [../curxor-os/DAY-ONE-BUILD-PLAN.md](../curxor-os/DAY-ONE-BUILD-PLAN.md) — Tier C contract
