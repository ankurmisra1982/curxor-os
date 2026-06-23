import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type VitalWorkspaceTab = "overview" | "lab" | "protocol" | "reports" | "bridges" | "analytics";

export type VitalFeature =
  | "vitals-grid"
  | "longevity-lab"
  | "protocol"
  | "mesh-publish"
  | "reports"
  | "bridges"
  | "garmin-oauth"
  | "diet-sync"
  | "analytics"
  | "analytics-lite"
  | "trend-summary"
  | "level-up-nudge";

const FEATURE_MIN: Record<VitalFeature, GrowthLevel> = {
  "vitals-grid": "L1",
  "longevity-lab": "L1",
  protocol: "L1",
  "mesh-publish": "L2",
  reports: "L2",
  bridges: "L2",
  "garmin-oauth": "L2",
  "diet-sync": "L3",
  analytics: "L4",
  "analytics-lite": "L3",
  "trend-summary": "L3",
  "level-up-nudge": "L2",
};

export function vitalFeatureVisible(growth: GrowthLevel, feature: VitalFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

export function vitalTabsForGrowth(growth: GrowthLevel): VitalWorkspaceTab[] {
  const tabs: VitalWorkspaceTab[] = ["overview", "lab", "protocol"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("bridges");
  if (meetsGrowthLevel(growth, "L3")) tabs.push("reports");
  if (meetsGrowthLevel(growth, "L4")) tabs.push("analytics");
  return tabs;
}

export function defaultVitalTabForGrowth(growth: GrowthLevel): VitalWorkspaceTab {
  if (meetsGrowthLevel(growth, "L1")) return "lab";
  return "overview";
}

export function vitalSectionVisibleForGrowth(
  sectionId: string,
  activeTab: VitalWorkspaceTab,
  growth: GrowthLevel,
): boolean {
  const tab = VITAL_SECTION_TAB[sectionId];
  if (!tab || tab !== activeTab) return false;

  const feature = VITAL_SECTION_FEATURE[sectionId];
  if (!feature) return true;

  if (sectionId === "analytics-summary" && growth === "L3") {
    return vitalFeatureVisible(growth, "analytics-lite");
  }

  return vitalFeatureVisible(growth, feature);
}

const VITAL_SECTION_TAB: Record<string, VitalWorkspaceTab> = {
  "vitals-grid": "overview",
  "mesh-publish": "overview",
  "longevity-lab": "lab",
  protocol: "protocol",
  reports: "reports",
  bridges: "bridges",
  "garmin-oauth": "bridges",
  "diet-sync": "bridges",
  "analytics-summary": "analytics",
  "trend-summary": "analytics",
};

const VITAL_SECTION_FEATURE: Record<string, VitalFeature | undefined> = {
  "vitals-grid": "vitals-grid",
  "mesh-publish": "mesh-publish",
  "longevity-lab": "longevity-lab",
  protocol: "protocol",
  reports: "reports",
  bridges: "bridges",
  "garmin-oauth": "garmin-oauth",
  "diet-sync": "diet-sync",
  "analytics-summary": "analytics",
  "trend-summary": "trend-summary",
};

export const VITAL_SKILL_MIN_GROWTH: Record<string, GrowthLevel> = {
  ask_longevity: "L1",
  ingest_report: "L2",
  publish_context: "L2",
  update_protocol: "L1",
  sync_wearables: "L1",
};

export function vitalSkillVisible(growth: GrowthLevel, skillId: string): boolean {
  const min = VITAL_SKILL_MIN_GROWTH[skillId];
  if (!min) return true;
  return meetsGrowthLevel(growth, min);
}

export { VITAL_SECTION_TAB as VITAL_SECTION_TAB };
