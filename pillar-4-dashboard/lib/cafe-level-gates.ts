import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type CafeWorkspaceTab = "play" | "ascension" | "progress" | "host";

export type CafeSection =
  | "lanes"
  | "guest-queue"
  | "spatial-room"
  | "ascension-profile"
  | "work-xp"
  | "host-config";

const SECTION_MIN: Record<CafeSection, GrowthLevel> = {
  lanes: "L1",
  "guest-queue": "L1",
  "spatial-room": "L1",
  "ascension-profile": "L1",
  "work-xp": "L1",
  "host-config": "L2",
};

export function cafeTabsForGrowth(growth: GrowthLevel): CafeWorkspaceTab[] {
  const tabs: CafeWorkspaceTab[] = ["play", "ascension", "progress"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("host");
  return tabs;
}

export function defaultCafeTabForGrowth(_growth: GrowthLevel): CafeWorkspaceTab {
  return "play";
}

export function cafeSectionVisibleForGrowth(growth: GrowthLevel, section: CafeSection): boolean {
  return meetsGrowthLevel(growth, SECTION_MIN[section]);
}
