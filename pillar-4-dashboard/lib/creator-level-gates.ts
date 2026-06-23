import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type CreatorWorkspaceTab = "plan" | "create" | "publish" | "engage" | "analytics";

export type CreatorFeature =
  | "go-live"
  | "content-plan"
  | "calendar"
  | "playbooks"
  | "creation-studio"
  | "queue"
  | "draft-editor"
  | "bridge"
  | "bridge-roadmap"
  | "recovery"
  | "preflight"
  | "approval"
  | "pinterest-board"
  | "publish-receipts"
  | "engage"
  | "reply-queue"
  | "brand-studio"
  | "library"
  | "ig-grid"
  | "analytics"
  | "analytics-lite"
  | "attribution"
  | "team-review"
  | "ops"
  | "experiments"
  | "signal-feed"
  | "export"
  | "campaign"
  | "level-up-nudge";

const FEATURE_MIN: Record<CreatorFeature, GrowthLevel> = {
  "go-live": "L1",
  "creation-studio": "L1",
  queue: "L1",
  "draft-editor": "L1",
  calendar: "L2",
  preflight: "L2",
  bridge: "L2",
  "bridge-roadmap": "L2",
  "publish-receipts": "L2",
  playbooks: "L2",
  recovery: "L3",
  approval: "L3",
  "pinterest-board": "L3",
  engage: "L3",
  "reply-queue": "L3",
  campaign: "L3",
  library: "L3",
  "analytics-lite": "L3",
  analytics: "L4",
  "brand-studio": "L4",
  attribution: "L4",
  "ig-grid": "L4",
  "content-plan": "L4",
  ops: "L4",
  "signal-feed": "L4",
  export: "L4",
  experiments: "L5",
  "team-review": "L5",
  "level-up-nudge": "L1",
};

export function creatorFeatureVisible(growth: GrowthLevel, feature: CreatorFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

export function creatorTabsForGrowth(growth: GrowthLevel): CreatorWorkspaceTab[] {
  const tabs: CreatorWorkspaceTab[] = ["plan", "create"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("publish");
  if (meetsGrowthLevel(growth, "L3")) tabs.push("engage");
  if (meetsGrowthLevel(growth, "L4")) tabs.push("analytics");
  return tabs;
}

export function defaultCreatorTabForGrowth(growth: GrowthLevel): CreatorWorkspaceTab {
  if (growth === "L1") return "plan";
  if (growth === "L2") return "create";
  if (growth === "L3") return "publish";
  if (growth === "L4") return "engage";
  return "analytics";
}

const SECTION_TAB: Record<string, CreatorWorkspaceTab> = {
  "go-live": "plan",
  "content-plan": "plan",
  calendar: "plan",
  playbooks: "plan",
  "creation-studio": "create",
  queue: "create",
  "draft-editor": "create",
  bridge: "publish",
  "bridge-roadmap": "publish",
  recovery: "publish",
  preflight: "publish",
  approval: "publish",
  "pinterest-board": "publish",
  "publish-receipts": "publish",
  engage: "engage",
  "reply-queue": "engage",
  "brand-studio": "analytics",
  library: "analytics",
  "ig-grid": "analytics",
  analytics: "analytics",
  attribution: "analytics",
  "team-review": "analytics",
  ops: "analytics",
  experiments: "analytics",
  "signal-feed": "analytics",
  export: "analytics",
  campaign: "analytics",
};

const FEATURE_MAP: Record<string, CreatorFeature | undefined> = {
  "go-live": "go-live",
  "content-plan": "content-plan",
  calendar: "calendar",
  playbooks: "playbooks",
  "creation-studio": "creation-studio",
  queue: "queue",
  "draft-editor": "draft-editor",
  bridge: "bridge",
  "bridge-roadmap": "bridge-roadmap",
  recovery: "recovery",
  preflight: "preflight",
  approval: "approval",
  "pinterest-board": "pinterest-board",
  "publish-receipts": "publish-receipts",
  engage: "engage",
  "reply-queue": "reply-queue",
  "brand-studio": "brand-studio",
  library: "library",
  "ig-grid": "ig-grid",
  analytics: "analytics",
  attribution: "attribution",
  "team-review": "team-review",
  ops: "ops",
  experiments: "experiments",
  "signal-feed": "signal-feed",
  export: "export",
  campaign: "campaign",
};

export function creatorSectionVisibleForGrowth(
  sectionId: string,
  activeTab: CreatorWorkspaceTab,
  growth: GrowthLevel,
): boolean {
  const tab = SECTION_TAB[sectionId];
  if (!tab || tab !== activeTab) return false;

  const feature = FEATURE_MAP[sectionId];
  if (!feature) return true;

  if (sectionId === "analytics" && growth === "L3") {
    return creatorFeatureVisible(growth, "analytics-lite");
  }

  return creatorFeatureVisible(growth, feature);
}

/** Skills hidden below minimum growth (agent panel filter). */
export const CREATOR_SKILL_MIN_GROWTH: Record<string, GrowthLevel> = {
  adapt_for_platforms: "L2",
  fan_out_channels: "L2",
  batch_publish: "L2",
  publish_post: "L2",
  publish_reply: "L3",
  engage_reply: "L3",
  pull_recommendations: "L4",
  repurpose_content: "L4",
};

export function creatorSkillVisible(growth: GrowthLevel, skillId: string): boolean {
  const min = CREATOR_SKILL_MIN_GROWTH[skillId];
  if (!min) return true;
  return meetsGrowthLevel(growth, min);
}
