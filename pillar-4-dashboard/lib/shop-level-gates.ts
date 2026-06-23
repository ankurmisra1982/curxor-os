import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type ShopWorkspaceTab = "overview" | "pipeline" | "margins" | "fulfillment";

export type ShopFeature =
  | "preview-hero"
  | "roadmap"
  | "notify-waitlist"
  | "pipeline-demo"
  | "margin-watch"
  | "margin-alerts"
  | "fulfillment-lanes"
  | "mesh-bridge"
  | "level-up-nudge";

const FEATURE_MIN: Record<ShopFeature, GrowthLevel> = {
  "preview-hero": "L1",
  roadmap: "L1",
  "notify-waitlist": "L1",
  "pipeline-demo": "L2",
  "margin-watch": "L2",
  "margin-alerts": "L3",
  "fulfillment-lanes": "L3",
  "mesh-bridge": "L4",
  "level-up-nudge": "L1",
};

export function shopFeatureVisible(growth: GrowthLevel, feature: ShopFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

export function shopTabsForGrowth(growth: GrowthLevel): ShopWorkspaceTab[] {
  const tabs: ShopWorkspaceTab[] = ["overview"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("pipeline", "margins");
  if (meetsGrowthLevel(growth, "L3")) tabs.push("fulfillment");
  return tabs;
}

export function defaultShopTabForGrowth(growth: GrowthLevel): ShopWorkspaceTab {
  if (growth === "L1") return "overview";
  if (growth === "L2") return "margins";
  return "pipeline";
}

const SECTION_TAB: Record<string, ShopWorkspaceTab> = {
  "preview-hero": "overview",
  roadmap: "overview",
  "notify-waitlist": "overview",
  pipeline: "pipeline",
  "margin-watch": "margins",
  "margin-alerts": "margins",
  "fulfillment-lanes": "fulfillment",
  "mesh-bridge": "fulfillment",
};

const FEATURE_MAP: Record<string, ShopFeature | undefined> = {
  "preview-hero": "preview-hero",
  roadmap: "roadmap",
  "notify-waitlist": "notify-waitlist",
  pipeline: "pipeline-demo",
  "margin-watch": "margin-watch",
  "margin-alerts": "margin-alerts",
  "fulfillment-lanes": "fulfillment-lanes",
  "mesh-bridge": "mesh-bridge",
};

export function shopSectionVisibleForGrowth(
  sectionId: string,
  activeTab: ShopWorkspaceTab,
  growth: GrowthLevel,
): boolean {
  const tab = SECTION_TAB[sectionId];
  if (!tab || tab !== activeTab) return false;

  const feature = FEATURE_MAP[sectionId];
  if (!feature) return true;
  return shopFeatureVisible(growth, feature);
}

/** Skills hidden below minimum growth (agent panel filter). L1 = demo ingest only. */
export const SHOP_SKILL_MIN_GROWTH: Record<string, GrowthLevel> = {
  sort_sku: "L2",
  ship_bin: "L3",
  retry_pick: "L3",
};

export function shopSkillVisible(growth: GrowthLevel, skillId: string): boolean {
  const min = SHOP_SKILL_MIN_GROWTH[skillId];
  if (!min) return true;
  return meetsGrowthLevel(growth, min);
}
