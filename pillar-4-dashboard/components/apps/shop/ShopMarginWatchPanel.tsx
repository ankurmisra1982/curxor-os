"use client";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ShopShopifyConnectStrip } from "@/components/apps/shop/ShopShopifyConnectStrip";
import { formatMarginPct, type SkuSpreadRow } from "@/lib/shop-margin-watch";
import { shopTerm } from "@/lib/shop-level-copy";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { shopFeatureVisible } from "@/lib/shop-level-gates";
import type { ShopifyBridgeStatus } from "@/lib/shop-dashboard-types";

interface ShopMarginWatchPanelProps {
  growthLevel: GrowthLevel;
  spreads: SkuSpreadRow[];
  selectedSku: string;
  onSelectSku: (sku: string) => void;
  shopify: ShopifyBridgeStatus;
  onShopifyUpdated: () => void;
  anyLiveSpreads?: boolean;
}

export function ShopMarginWatchPanel({
  growthLevel,
  spreads,
  selectedSku,
  onSelectSku,
  shopify,
  onShopifyUpdated,
  anyLiveSpreads = false,
}: ShopMarginWatchPanelProps) {
  const showAlerts = shopFeatureVisible(growthLevel, "margin-alerts");
  const liveRows = anyLiveSpreads || shopify.spreadSource === "shopify";

  return (
    <ExperienceAppSection
      appId="my-shop"
      sectionId="margin-watch"
      minLevel="beginner"
      title={shopTerm(growthLevel, "marginLabel")}
      subtitle={
        liveRows
          ? "Live channel spreads via eno2 · Shopify + Printify COGS when receipt validates"
          : "Demo watchlist until a channel sync receipt validates"
      }
    >
      <ShopShopifyConnectStrip shopify={shopify} onUpdated={onShopifyUpdated} />

      {!liveRows && (
        <p className="mb-4 font-mono text-[10px] text-amber-300/90">
          Preview rows below until Sync catalog returns a successful receipt. Printify sync lives on Fulfillment tab.
        </p>
      )}

      <p className="mb-4 font-mono text-[10px] text-muted">
        Tap a row to focus the agent. Chat: &ldquo;Alert me when margin on SKU X exceeds 12%.&rdquo;
      </p>
      <div className="font-mono text-xs">
        <div className="grid grid-cols-7 gap-2 border-b border-line pb-2 text-[10px] uppercase tracking-widest text-muted">
          <span>SKU</span>
          <span className="col-span-2">Channels</span>
          <span>Buy</span>
          <span>Sell</span>
          <span className="text-right">Margin</span>
          <span className="text-right">Src</span>
        </div>
        {spreads.map((row) => (
          <button
            key={`${row.source ?? "demo"}-${row.sku}`}
            type="button"
            onClick={() => onSelectSku(row.sku)}
            className={`grid w-full grid-cols-7 gap-2 border-b py-2 text-left ${
              selectedSku === row.sku ? "bg-surface text-cursor-glow" : "text-stark"
            }`}
          >
            <span>{row.sku}</span>
            <span className="col-span-2 text-muted">
              {row.channelBuy} → {row.channelSell}
            </span>
            <span>{row.buyPrice > 0 ? `$${row.buyPrice.toFixed(2)}` : "—"}</span>
            <span>{row.sellPrice > 0 ? `$${row.sellPrice.toFixed(2)}` : "—"}</span>
            <span className={`text-right ${row.alert && showAlerts ? "text-cursor-glow" : "text-muted"}`}>
              {formatMarginPct(row.marginPct)}
              {row.alert && showAlerts ? " · alert" : ""}
            </span>
            <span className="text-right text-[10px] uppercase text-muted">{row.source ?? "demo"}</span>
          </button>
        ))}
      </div>
    </ExperienceAppSection>
  );
}
