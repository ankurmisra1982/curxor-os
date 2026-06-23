"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import {
  shopTabsForGrowth,
  defaultShopTabForGrowth,
  shopSectionVisibleForGrowth,
  type ShopWorkspaceTab,
} from "@/lib/shop-level-gates";

export type { ShopWorkspaceTab };

const TAB_LABELS: Record<ShopWorkspaceTab, string> = {
  overview: "Overview",
  pipeline: "Pipeline",
  margins: "Margins",
  fulfillment: "Fulfillment",
};

interface ShopWorkspaceTabsProps {
  active: ShopWorkspaceTab;
  onChange: (tab: ShopWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function ShopWorkspaceTabs({ active, onChange, growthLevel }: ShopWorkspaceTabsProps) {
  const visible = shopTabsForGrowth(growthLevel);

  return (
    <nav className="flex flex-wrap gap-1 border border-line bg-panel px-2 py-2 font-mono text-[10px]">
      {visible.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`px-3 py-1 uppercase tracking-widest ${
            active === tab
              ? "border border-cursor-glow text-cursor-glow"
              : "border border-transparent text-muted hover:border-line hover:text-stark"
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}

export function defaultShopTab(growthLevel: GrowthLevel): ShopWorkspaceTab {
  return defaultShopTabForGrowth(growthLevel);
}

export { shopSectionVisibleForGrowth as shopSectionVisible } from "@/lib/shop-level-gates";
