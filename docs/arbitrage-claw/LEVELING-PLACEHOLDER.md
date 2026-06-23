# Arbitrage Claw — Growth Leveling

**Implementation plan:** [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)  
**OS framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
**Labels in code:** `GROWTH_LABELS["my-shop"]` — Scout → Flipper → Operator → Wholesaler → Desk Lead

## Status

| Sprint | Scope | Status |
|--------|--------|--------|
| **AB1** | FRE intent + `growthLevel` persist + badge | Shipped |
| **AB2** | L1 Scout · Tier C preview shell | Shipped |
| **AB3** | L2 Flipper · pipeline + margin watch | Shipped |
| **AB4** | L3 Operator · fulfillment + skill gates | Shipped |
| **AB5** | QA + demo capture scripts | Shipped |
| **AB6** | Live eno2 scrape + fulfillment bridge | Planned |
| **AB7** | Shopify Wave 1 read (`commerce.shopify.catalog.sync`) | Shipped |
| **AB8** | eBay fulfillment read (`commerce.ebay.fulfillment.sync`) | Shipped |
| **AB9** | Printify cost pull (`commerce.printify.catalog.sync`) | Shipped |
| **AB10** | Live multi-channel desk showcase (preview GTM) | Shipped · **freeze** |

## Freeze (Day One)

Arbitrage is **frozen** as Tier C preview with live desk showcase. No new features until [RELEASE-NEXT.md](./RELEASE-NEXT.md) unfreeze wave.

```bash
npm run qa:shop-levels && npm run qa:shop-bridges && npm run verify:shop-freeze
npm run demo:capture:shop
```

See [FREEZE.md](./FREEZE.md) for GTM truth table and operator checklist.

## Dev note

Arbitrage remains **Tier C preview** (Coming Soon badge) until flagship promotion after appliance validation. Demo captures use **L2 Flipper** (`side_hustle_flips` FRE seed) + **Activate desk preview**.

**Product vision:** [PRODUCT-DEFINITION.md](./PRODUCT-DEFINITION.md) · **eno2 bridge order:** [COMMERCE-BRIDGE-ROADMAP.md](./COMMERCE-BRIDGE-ROADMAP.md)
