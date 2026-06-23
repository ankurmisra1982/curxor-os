import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type CapitalWorkspaceTab = "alpha" | "trade" | "research" | "risk" | "agents" | "analytics";

export type CapitalFeature =
  | "go-live"
  | "recent-trades"
  | "research"
  | "portfolio"
  | "alpha-feed"
  | "alpha-lite"
  | "pilot-leaderboard"
  | "thesis-journal"
  | "pilots"
  | "subscriptions"
  | "movers"
  | "intel-alerts"
  | "digest"
  | "auto-approval"
  | "pending-banner"
  | "pfm"
  | "portfolio-health"
  | "risk"
  | "brokers"
  | "agent-trading"
  | "trades-full"
  | "recovery"
  | "analytics"
  | "scorecard"
  | "tax-lots"
  | "nl-query"
  | "walk-forward"
  | "benchmark"
  | "watchlist-strip"
  | "level-up-nudge";

const FEATURE_MIN: Record<CapitalFeature, GrowthLevel> = {
  "go-live": "L1",
  "recent-trades": "L1",
  research: "L1",
  portfolio: "L1",
  "alpha-feed": "L2",
  "alpha-lite": "L2",
  "pilot-leaderboard": "L3",
  "thesis-journal": "L2",
  pilots: "L2",
  subscriptions: "L3",
  movers: "L2",
  "intel-alerts": "L3",
  digest: "L3",
  "auto-approval": "L3",
  "pending-banner": "L3",
  pfm: "L3",
  "portfolio-health": "L3",
  risk: "L2",
  brokers: "L4",
  "agent-trading": "L4",
  "trades-full": "L3",
  recovery: "L3",
  analytics: "L4",
  scorecard: "L4",
  "tax-lots": "L4",
  "nl-query": "L4",
  "walk-forward": "L4",
  benchmark: "L2",
  "watchlist-strip": "L2",
  "level-up-nudge": "L2",
};

const SECTION_TAB: Record<string, CapitalWorkspaceTab> = {
  "alpha-feed": "alpha",
  "pilot-leaderboard": "alpha",
  "thesis-journal": "alpha",
  "recent-trades": "trade",
  "go-live": "trade",
  portfolio: "trade",
  trades: "trade",
  recovery: "trade",
  movers: "trade",
  research: "research",
  "intel-alerts": "research",
  digest: "research",
  risk: "risk",
  "auto-approval": "risk",
  brokers: "risk",
  "portfolio-health": "risk",
  pilots: "agents",
  subscriptions: "agents",
  "agent-trading": "agents",
  pfm: "agents",
  analytics: "analytics",
  scorecard: "analytics",
  "tax-lots": "analytics",
  "nl-query": "analytics",
};

const SECTION_FEATURE: Record<string, CapitalFeature | undefined> = {
  "alpha-feed": "alpha-feed",
  "pilot-leaderboard": "pilot-leaderboard",
  "thesis-journal": "thesis-journal",
  "recent-trades": "recent-trades",
  "go-live": "go-live",
  portfolio: "portfolio",
  trades: "trades-full",
  recovery: "recovery",
  movers: "movers",
  research: "research",
  "intel-alerts": "intel-alerts",
  digest: "digest",
  risk: "risk",
  "auto-approval": "auto-approval",
  brokers: "brokers",
  "portfolio-health": "portfolio-health",
  pilots: "pilots",
  subscriptions: "subscriptions",
  "agent-trading": "agent-trading",
  pfm: "pfm",
  analytics: "analytics",
  scorecard: "scorecard",
  "tax-lots": "tax-lots",
  "nl-query": "nl-query",
};

export function capitalFeatureVisible(growth: GrowthLevel, feature: CapitalFeature): boolean {
  return meetsGrowthLevel(growth, FEATURE_MIN[feature]);
}

export function capitalTabsForGrowth(growth: GrowthLevel): CapitalWorkspaceTab[] {
  if (growth === "L1") return ["trade", "research"];
  if (growth === "L2") return ["trade", "research", "risk", "alpha"];
  if (growth === "L3") return ["alpha", "trade", "research", "risk", "agents", "analytics"];
  return ["alpha", "trade", "research", "risk", "agents", "analytics"];
}

export function defaultCapitalTabForGrowth(growth: GrowthLevel): CapitalWorkspaceTab {
  if (growth === "L1" || growth === "L2") return "trade";
  return "alpha";
}

export function capitalSectionVisibleForGrowth(
  sectionId: string,
  activeTab: CapitalWorkspaceTab,
  growth: GrowthLevel,
): boolean {
  const tab = SECTION_TAB[sectionId];
  if (!tab || tab !== activeTab) return false;

  if (sectionId === "recent-trades" && meetsGrowthLevel(growth, "L3")) return false;

  const feature = SECTION_FEATURE[sectionId];
  if (!feature) return true;

  if (sectionId === "alpha-feed" && growth === "L2") {
    return capitalFeatureVisible(growth, "alpha-lite");
  }

  return capitalFeatureVisible(growth, feature);
}

export { SECTION_TAB as CAPITAL_SECTION_TAB };
