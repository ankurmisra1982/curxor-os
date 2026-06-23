import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type KinWorkspaceTab = "members" | "profile" | "devices" | "mesh" | "settings";

export type KinFeature =
  | "add-member"
  | "profile-detail"
  | "channel-handles"
  | "bind-device"
  | "mesh-registry"
  | "household-settings"
  | "notify-waitlist";

const FEATURE_MIN: Record<KinFeature, GrowthLevel> = {
  "add-member": "L1",
  "profile-detail": "L1",
  "channel-handles": "L2",
  "bind-device": "L2",
  "mesh-registry": "L3",
  "household-settings": "L4",
  "notify-waitlist": "L1",
};

export function kinFeatureVisible(growth: GrowthLevel, feature: KinFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

export function kinTabsForGrowth(growth: GrowthLevel): KinWorkspaceTab[] {
  const tabs: KinWorkspaceTab[] = ["members", "profile"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("devices");
  if (meetsGrowthLevel(growth, "L3")) tabs.push("mesh");
  if (meetsGrowthLevel(growth, "L4")) tabs.push("settings");
  return tabs;
}

export function defaultKinTabForGrowth(growth: GrowthLevel): KinWorkspaceTab {
  if (growth === "L1") return "members";
  if (growth === "L2") return "profile";
  if (growth === "L3") return "mesh";
  return "settings";
}

/** Skills hidden below minimum growth (agent panel filter). */
export const KIN_SKILL_MIN_GROWTH: Record<string, GrowthLevel> = {
  bind_device: "L2",
  resync_mesh: "L3",
};

export function kinSkillVisible(growth: GrowthLevel, skillId: string): boolean {
  const min = KIN_SKILL_MIN_GROWTH[skillId];
  if (!min) return true;
  return meetsGrowthLevel(growth, min);
}
