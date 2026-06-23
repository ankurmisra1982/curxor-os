import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type ForgeWorkspaceTab = "mint" | "fleet" | "stacks" | "templates" | "import" | "ops";

export type ForgeSection =
  | "intent"
  | "connection-mode"
  | "fleet-registry"
  | "stacks-catalog"
  | "mint-wizard"
  | "templates-catalog"
  | "import-upload"
  | "go-live"
  | "ops-health";

const SECTION_MIN: Record<ForgeSection, GrowthLevel> = {
  intent: "L1",
  "connection-mode": "L1",
  "mint-wizard": "L1",
  "go-live": "L1",
  "fleet-registry": "L2",
  "stacks-catalog": "L3",
  "templates-catalog": "L4",
  "import-upload": "L4",
  "ops-health": "L5",
};

export function forgeTabsForGrowth(growth: GrowthLevel): ForgeWorkspaceTab[] {
  const tabs: ForgeWorkspaceTab[] = ["mint"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("fleet");
  if (meetsGrowthLevel(growth, "L3")) tabs.push("stacks");
  if (meetsGrowthLevel(growth, "L4")) tabs.push("templates", "import");
  if (meetsGrowthLevel(growth, "L5")) tabs.push("ops");
  return tabs;
}

export function defaultForgeTabForGrowth(growth: GrowthLevel): ForgeWorkspaceTab {
  if (meetsGrowthLevel(growth, "L5")) return "ops";
  if (meetsGrowthLevel(growth, "L4")) return "templates";
  if (meetsGrowthLevel(growth, "L2")) return "fleet";
  return "mint";
}

export function forgeSectionVisibleForGrowth(growth: GrowthLevel, section: ForgeSection): boolean {
  return meetsGrowthLevel(growth, SECTION_MIN[section]);
}
