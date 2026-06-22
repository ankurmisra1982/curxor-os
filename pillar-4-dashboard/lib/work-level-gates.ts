import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type WorkWorkspaceTab = "start" | "outreach" | "comms" | "ops" | "integrations";

export type WorkFeature =
  | "go-live"
  | "morning-brief"
  | "inbox-triage"
  | "tasks"
  | "start-home"
  | "pipeline"
  | "kanban"
  | "import"
  | "sequences"
  | "mini-sequence"
  | "outbound"
  | "comms"
  | "reply-intent"
  | "analytics"
  | "analytics-lite"
  | "approval"
  | "recovery"
  | "send-policy"
  | "kill-switch"
  | "connector-vault"
  | "sync-audit"
  | "mcp"
  | "executive-brief"
  | "level-up-nudge"
  | "integrations-peek"
  | "deliverability"
  | "needs-you"
  | "crm-conflicts"
  | "audit-timeline";

const FEATURE_MIN: Record<WorkFeature, GrowthLevel> = {
  "go-live": "L1",
  "morning-brief": "L1",
  "inbox-triage": "L1",
  tasks: "L1",
  "start-home": "L1",
  pipeline: "L1",
  kanban: "L2",
  import: "L2",
  sequences: "L2",
  "mini-sequence": "L2",
  outbound: "L2",
  comms: "L2",
  "reply-intent": "L3",
  "analytics-lite": "L2",
  analytics: "L3",
  approval: "L3",
  recovery: "L3",
  "send-policy": "L3",
  "kill-switch": "L3",
  "connector-vault": "L4",
  "sync-audit": "L4",
  mcp: "L4",
  "executive-brief": "L5",
  "level-up-nudge": "L1",
  "integrations-peek": "L3",
  deliverability: "L3",
  "needs-you": "L5",
  "crm-conflicts": "L4",
  "audit-timeline": "L3",
};

export function workFeatureVisible(growth: GrowthLevel, feature: WorkFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

/** Tabs visible at each growth level (integrations peek handled in UI). */
export function workTabsForGrowth(growth: GrowthLevel): WorkWorkspaceTab[] {
  const tabs: WorkWorkspaceTab[] = ["start"];
  if (meetsGrowthLevel(growth, "L2")) tabs.push("outreach");
  if (meetsGrowthLevel(growth, "L3")) {
    tabs.push("comms", "ops");
  } else if (growth === "L2") {
    tabs.push("comms");
  }
  if (meetsGrowthLevel(growth, "L4")) tabs.push("integrations");
  return tabs;
}

export function defaultWorkTabForGrowth(growth: GrowthLevel): WorkWorkspaceTab {
  if (growth === "L1") return "start";
  if (growth === "L2") return "outreach";
  if (growth === "L3" || growth === "L4") return "comms";
  if (growth === "L5") return "ops";
  return "start";
}

export function workSectionVisibleForGrowth(
  sectionId: string,
  activeTab: WorkWorkspaceTab,
  growth: GrowthLevel,
): boolean {
  const SECTION_TAB: Record<string, WorkWorkspaceTab> = {
    "go-live": "start",
    tasks: "start",
    "start-home": "start",
    "morning-brief": "start",
    pipeline: "outreach",
    sequences: "outreach",
    "mini-sequence": "outreach",
    import: "outreach",
    outbound: "outreach",
    kanban: "outreach",
    comms: "comms",
    "inbox-triage": "comms",
    "sync-log": "comms",
    analytics: "ops",
    recovery: "ops",
    "send-policy": "ops",
    approval: "ops",
    "kill-switch": "ops",
    "day-brief": "ops",
    "connector-vault": "integrations",
    "sync-audit": "integrations",
    "executive-brief": "start",
    "integrations-peek": "start",
    deliverability: "ops",
    "needs-you": "ops",
    "crm-conflicts": "integrations",
    "audit-timeline": "ops",
  };

  const FEATURE_MAP: Record<string, WorkFeature | undefined> = {
    "go-live": "go-live",
    tasks: "tasks",
    "start-home": "start-home",
    "morning-brief": "morning-brief",
    pipeline: "pipeline",
    kanban: "kanban",
    import: "import",
    sequences: "sequences",
    "mini-sequence": "mini-sequence",
    outbound: "outbound",
    comms: "comms",
    "inbox-triage": "inbox-triage",
    "sync-log": "reply-intent",
    analytics: "analytics",
    recovery: "recovery",
    "send-policy": "send-policy",
    approval: "approval",
    "kill-switch": "kill-switch",
    "connector-vault": "connector-vault",
    "sync-audit": "sync-audit",
    "executive-brief": "executive-brief",
    "integrations-peek": "integrations-peek",
    deliverability: "deliverability",
    "needs-you": "needs-you",
    "crm-conflicts": "crm-conflicts",
    "audit-timeline": "audit-timeline",
  };

  const tab = SECTION_TAB[sectionId];
  if (sectionId === "inbox-triage" && growth === "L1") {
    return activeTab === "start" && workFeatureVisible(growth, "inbox-triage");
  }
  if (!tab || tab !== activeTab) return false;

  const feature = FEATURE_MAP[sectionId];
  if (!feature) return true;

  if (sectionId === "analytics" && growth === "L2") {
    return workFeatureVisible(growth, "analytics-lite");
  }
  if (sectionId === "sync-log" && growth === "L2") {
    return false;
  }

  return workFeatureVisible(growth, feature);
}

/** Skills hidden below minimum growth (agent panel filter). */
export const WORK_SKILL_MIN_GROWTH: Record<string, GrowthLevel> = {
  draft_sequence: "L2",
  send_sequence_step: "L2",
  enrich_lead: "L2",
  book_meeting: "L2",
  executive_brief: "L5",
  slack_digest: "L3",
  sync_crm: "L4",
};

export function workSkillVisible(growth: GrowthLevel, skillId: string): boolean {
  const min = WORK_SKILL_MIN_GROWTH[skillId];
  if (!min) return true;
  return meetsGrowthLevel(growth, min);
}
