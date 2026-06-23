import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type SwarmFeature =
  | "grid"
  | "fleet-roster"
  | "forge-roster"
  | "dispatch-policy"
  | "mesh-link"
  | "workload-strip"
  | "cafe-xp"
  | "exit-demo"
  | "audit-log";

const FEATURE_MIN: Record<SwarmFeature, GrowthLevel> = {
  grid: "L1",
  "fleet-roster": "L2",
  "forge-roster": "L2",
  "dispatch-policy": "L2",
  "mesh-link": "L3",
  "workload-strip": "L3",
  "cafe-xp": "L3",
  "exit-demo": "L4",
  "audit-log": "L4",
};

export function swarmFeatureVisible(growth: GrowthLevel, feature: SwarmFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

const SECTION_FEATURE: Record<string, SwarmFeature | undefined> = {
  grid: "grid",
  fleet: "fleet-roster",
  "forge-roster": "forge-roster",
  "dispatch-policy": "dispatch-policy",
  "mesh-link": "mesh-link",
  "workload-strip": "workload-strip",
  "workloads": "workload-strip",
  "cafe-xp": "cafe-xp",
  "exit-demo": "exit-demo",
  "audit-log": "audit-log",
};

export function swarmSectionVisible(sectionId: string, growth: GrowthLevel): boolean {
  const feature = SECTION_FEATURE[sectionId];
  if (!feature) return true;
  return swarmFeatureVisible(growth, feature);
}

/** Skills hidden below minimum growth (agent panel filter). */
export const SWARM_SKILL_MIN_GROWTH: Record<string, GrowthLevel> = {
  ping_unit: "L2",
  rebalance: "L3",
};

export function swarmSkillVisible(growth: GrowthLevel, skillId: string): boolean {
  const min = SWARM_SKILL_MIN_GROWTH[skillId];
  if (!min) return true;
  return meetsGrowthLevel(growth, min);
}
