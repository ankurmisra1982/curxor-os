# Arbitrage Claw — Release Next

## Current policy: Tier C preview (frozen Day One)

Ship and demo **honestly** as **Coming Soon**. Full desk UX + live multi-channel **showcase** via mock or appliance credentials. No false Go Live. No implied flagship status at $3,999.

See [FREEZE.md](./FREEZE.md) for freeze checklist and GTM truth table.

---

## Shipped (AB1–AB10 — Day One freeze)

| Sprint | Scope |
|--------|--------|
| AB1 | FRE intent + `shopGrowthLevel` persist + badge |
| AB2 | Tier C shell · `PreviewModuleBanner` · `ComingSoonBadge` |
| AB3 | L2+ pipeline + margin watch tabs |
| AB4 | L3+ fulfillment + skill gates (`shop-level-gates.ts`) |
| AB5 | `qa-shop-levels.mjs` · `capture-shop-demo.mjs` · `record-shop-walkthrough.mjs` |
| AB7 | Shopify read · `commerce.shopify.catalog.sync` |
| AB8 | eBay fulfillment read · `commerce.ebay.fulfillment.sync` |
| AB9 | Printify cost pull · `commerce.printify.catalog.sync` |
| AB10 | Live multi-channel desk showcase · `activate_desk_showcase` |

**UX highlights:**

- `ShopMultiChannelDeskStrip` — 3-channel matrix, Activate / Re-sync all
- Merged spreads (`shopify` / `ebay` / `printify` sources)
- eBay → Pipeline tab · Printify → Fulfillment tab · Shopify → Margins tab
- Agent catalog + preview banner copy aligned to showcase mode

**QA / GTM:**

- `npm run qa:shop-levels`
- `npm run qa:shop-bridges` (includes live desk showcase check)
- `npm run verify:shop-freeze`
- `npm run demo:capture:shop` · `npm run demo:record:shop`

---

## Todo — post-freeze (unfreeze waves)

### Wave A — Appliance validation (P0)

- [ ] Real Shopify custom app token on MS-S1 · `commerce.shopify.catalog.sync` receipt on box
- [ ] eBay user token on appliance · fulfillment ingest receipt
- [ ] Printify PAT + shop_id on appliance · catalog sync receipt
- [ ] Re-capture demo pack on appliance IP (not dev mock)

### Wave B — Read depth (P1)

- [ ] eBay acquisition cost field / seller CSV merge for margin rows
- [ ] Printify webhook ingest (`order:shipped`) → digital_in receipt
- [ ] Margin alert rules (local threshold → nudge)

### Wave C — Write paths (P2 — after read proven)

- [ ] `commerce.shopify.inventory.adjust`
- [ ] `commerce.printify.orders.create`
- [ ] `commerce.ebay.offers.publish`

### Wave D — Flagship promotion (only after A + buyer trust)

- [ ] Remove Coming Soon badge (explicit product decision)
- [ ] Go Live checklist per connected channel
- [ ] Claw Cafe XP events for desk milestones

---

## Deferred (do not slip into freeze fixes)

- Etsy, TikTok Shop, AliExpress, TCG CSV import
- Hub-and-spoke duplicate sync when Printify↔Shopify native link exists
- Physical claw pick verification / ship-bin mesh bridge

---

## Helper commands

```bash
cd pillar-4-dashboard
npm run dev                    # terminal 1 (or npm run qa:local)
npm run qa:shop-levels
npm run qa:shop-bridges        # server needs CURXOR_*_MOCK=1 for mock sync
npm run verify:shop-freeze
npm run demo:capture:shop
```

Credential files (appliance): `/etc/curxor/commerce-shopify.json`, `commerce-ebay.json`, `commerce-printify.json`  
Dev-qa overrides: `scripts/dev-qa/commerce-*.json`
