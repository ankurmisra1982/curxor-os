# Arbitrage Claw — Commerce Bridge Roadmap (eno2)

> **Pattern:** Same systematic build as Creator `SOCIAL_BRIDGE_ROADMAP` — one wave at a time, preview UI shows full journey, live tools unlock with receipts.  
> **Code seed (future):** `pillar-4-dashboard/lib/commerce-bridge-roadmap.ts`  
> **Executor home (future):** `pillar-3-telemetry/src/curxor_broker/digital_bridges.py`

**Status:** Wave 1 Shopify read **done** · Wave 3 eBay fulfillment read **done** · Wave 5 Printify cost pull **done** · **Day One freeze** — see [FREEZE.md](./FREEZE.md)

---

## Bridge build order

| Step | Channel | Status | eno2 tools (planned) | Read → Write |
|------|---------|--------|----------------------|--------------|
| **0** | Preview / demo | **done** | Local demo spreads + pipeline | — |
| **1** | Shopify Admin (GraphQL) | **done** | `commerce.shopify.products.list`, `commerce.shopify.orders.list`, `commerce.shopify.catalog.sync` | read |
| **2** | Shopify | planned | `commerce.shopify.inventory.adjust` (optional) | write |
| **3** | eBay Fulfillment | **done** (read) | `commerce.ebay.orders.list`, `commerce.ebay.fulfillment.sync` | read |
| **4** | eBay Inventory | planned | `commerce.ebay.offers.create`, `commerce.ebay.offers.publish` | write |
| **5** | Printify | **done** (read) | `commerce.printify.products.list`, `commerce.printify.catalog.sync` | read |
| **6** | Printify webhooks | planned | Ingest `order:shipped` → digital_in receipt | event |
| **7** | Etsy Open API v3 | planned | `commerce.etsy.listings.draft`, `commerce.etsy.receipts.list` | read + write |
| **8** | TikTok Shop Partner | planned | `commerce.tiktok.products.sync`, `commerce.tiktok.orders.list` | read + write |
| **9** | AliExpress DS | planned | `commerce.aliexpress.product.search`, `commerce.aliexpress.order.create` | read + write |
| **10** | CSV / collectibles | planned | `commerce.import.csv` (TCGplayer-style exports) | read |

---

## Per-channel notes (from platform research)

### Shopify (Step 1–2)

- **API:** GraphQL Admin only for new work (`/admin/api/{version}/graphql.json`).
- **Auth:** OAuth per shop; token in `/etc/curxor/commerce-shopify.json`.
- **Scopes (minimal start):** `read_products`, `read_orders` → later `write_inventory`.
- **Ops:** Quarterly version bumps; use `bulkOperationRunQuery` for large catalogs.

### eBay (Step 3–4)

- **APIs:** Sell Inventory + Sell Fulfillment.
- **Auth:** OAuth 2.0 via eBay Developer Program.
- **Prerequisite:** Seller opted into business policies (payment, fulfillment, return).
- **Collectibles fit:** Primary programmatic path for sports cards / singles.

### Printify (Step 5–6)

- **API:** REST `https://api.printify.com/v1/` — PAT or OAuth.
- **Flow:** Upload → product → publish (two-step) → order POST → webhooks.
- **Note:** If seller uses Printify↔Shopify native link, CurXor can **read costs/orders** without duplicating publish — still valuable for margin desk.

### Etsy (Step 7)

- **API:** Open API v3 — OAuth PKCE.
- **Scopes:** `listings_r/w`, `transactions_r`, `shops_r`.
- **Approval:** Production apps need Etsy app review.

### TikTok Shop (Step 8)

- **API:** Partner Center — custom app for single seller vs public app.
- **Regions:** US Partner Portal vs Global — may need both for multi-region sellers.
- **Shortcut:** Shopify hub sync for operators already on Shopify + TikTok channel.

### AliExpress DS (Step 9)

- **API:** AliExpress Open Platform — Dropshipping AppKey.
- **Prerequisite:** Buyer joins Dropshipping Center (`ds.aliexpress.com`).
- **Risk:** Policy-heavy; some legacy DS endpoints deprecated — validate before build.

### CSV / TCG (Step 10)

- **TCGplayer:** Restrictive API for new integrators; **CSV export/import** is the practical v1.
- **Bridge:** `commerce.import.csv` → normalize to SKU spread + inventory rows.

---

## UI coupling (preview → live)

Each roadmap step maps to a card in `ShopPreviewHeroPanel` / future **Channels tab**:

| Step live | UI unlock |
|-----------|-----------|
| 0 | Overview roadmap (now) |
| 1–2 | Margins tab: “Shopify connected” strip + real COGS column |
| 3–4 | Pipeline: eBay order rows from API |
| 5–6 | Fulfill: Printify status + tracking receipt |
| 7+ | Channel filter on spread desk |

**Go Live panel (future):** Per-channel checklist — OAuth done, test receipt, kill switch — mirrors Capital Go Live honesty.

---

## Credential storage (planned)

| File | Channel |
|------|---------|
| `/etc/curxor/commerce-shopify.json` | Shopify offline token + shop domain |
| `/etc/curxor/commerce-ebay.json` | eBay OAuth refresh |
| `/etc/curxor/commerce-printify.json` | PAT or OAuth + shop_id |
| `/etc/curxor/commerce-etsy.json` | OAuth refresh + shop_id |
| `/etc/curxor/commerce-tiktok.json` | Partner app tokens |
| `/etc/curxor/commerce-aliexpress.json` | AppKey + session |

LLM and engine **never** read these files.

---

## QA (when bridges ship)

```bash
npm run qa:shop-levels          # growth bootstrap
node scripts/qa-shop-bridges.mjs   # future — mock OAuth + receipt assertions
npm run demo:capture:shop       # preview captures until live screenshots gated
```

---

## Related

- [PRODUCT-DEFINITION.md](./PRODUCT-DEFINITION.md)
- [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)
- Creator bridge pattern: `pillar-4-dashboard/lib/social-bridge-roadmap.ts`
