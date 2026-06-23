# Arbitrage Claw — Growth Leveling Build Plan

> **Audience:** L1–L4 core (Scout → Wholesaler) · L5 scaffolded  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Code seed:** `pillar-4-dashboard/lib/os-growth-level.ts` (`ShopGrowthIntent`)  
> **Status:** Tier C preview · **Day One frozen** · live bridges = showcase/mock until appliance validation

## North star

Arbitrage Claw is a **sovereign margin desk** that grows with commerce responsibility — not a fake Shopify admin on day one:

1. **Scout** — honest preview, roadmap, demo ingest skill only  
2. **Flipper** — local spread watchlist + demo pipeline  
3. **Operator** — margin alerts, ship/retry skills, fulfillment tab  
4. **Wholesaler** — multi-channel spread matrix + mesh bridge preview  
5. **Desk Lead** — policy, audit, delegation (future)

Not “dropship autopilot.” Not implied live marketplace APIs at $3,999.

---

## Tier C honesty contract (always on)

| Requirement | Implementation |
|-------------|----------------|
| Coming Soon badge | `ComingSoonBadge` + `PreviewModuleBanner` in `MyShopApp` |
| Preview FRE | Shortened activate tips · no Go Live |
| Honest chat | `previewAgentPromptBlock` + preview replies in `app-agent-assist.ts` |
| No fake production metrics | L1 shows `3 demo orders` not `128 ingested` |
| 1 demo skill at L1 | `shopSkillVisible` — `ingest_order` only |

---

## Persona matrix

### L1 — Scout
**Who:** Curious operator, learning arbitrage concepts.

| Show | Hide |
|------|------|
| Overview tab · roadmap · notify stub | Pipeline tab · margin tab · fulfillment |
| Ingest Order skill | sort_sku · ship_bin · retry_pick |

**Default tab:** `overview`

**FRE seed:** `learning_arbitrage` · desk name only

---

### L2 — Flipper
**Who:** Side hustle — eBay, Etsy, retail flips.

| Show | Hide |
|------|------|
| Pipeline demo · margin watchlist | Margin alerts · fulfillment tab |
| ingest_order · sort_sku | ship_bin · retry_pick |

**Default tab:** `margins`

**FRE seed:** `side_hustle_flips`

---

### L3 — Operator
**Who:** Daily pick/pack/ship on the desk.

| Show | Hide |
|------|------|
| All L2 + fulfillment tab · margin alerts | Mesh bridge (L4) |
| ship_bin · retry_pick | — |

**Default tab:** `pipeline`

---

### L4 — Wholesaler
Multi-channel ops · mesh bridge preview panel.

### L5 — Desk Lead
Governance scaffold — future wave.

---

## Workspace tabs by level

| Level | Tabs |
|-------|------|
| L1 | overview |
| L2 | overview · pipeline · margins |
| L3+ | + fulfillment |

---

## Implementation sprints

| Sprint | Goal | Key files | Acceptance |
|--------|------|-----------|------------|
| **AB1** | FRE intent + growth persist | `shop-growth.ts`, app-fre route | FRE saves `growthLevel` |
| **AB2** | Tier C shell | `MyShopApp`, `ShopPreviewHeroPanel`, banners | Coming Soon visible · honest copy |
| **AB3** | L2 pipeline + margins | `ShopPipelinePanel`, `ShopMarginWatchPanel` | Tabs gate correctly |
| **AB4** | L3 fulfillment + skills | `shop-level-gates.ts`, `ClawAgentConsole` | Skills filter by level |
| **AB5** | QA + GTM | `qa-shop-levels.mjs`, capture/record scripts | Demo at L2 Flipper |
| **AB7–AB10** | Commerce read + desk showcase | `shop-desk-showcase.ts`, bridge workers | **Frozen** — see [FREEZE.md](./FREEZE.md) |

---

## QA + GTM (freeze gate)

```bash
npm run qa:shop-levels
npm run qa:shop-bridges      # mock env on server
npm run verify:shop-freeze
npm run demo:capture:shop
npm run demo:record:shop
```

Demo captures: **L2 Flipper** + **Activate desk preview** unless testing Scout explicitly.
