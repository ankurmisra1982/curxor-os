/**
 * CurXor OS growth levels (L1–L5) — product progression, not skill gating.
 * Gamification mechanics deferred to Claw Cafe; this module is labels + mapping only.
 */

import type { ExperienceLevel } from "./experience-level";

export type GrowthLevel = "L1" | "L2" | "L3" | "L4" | "L5";

export const GROWTH_LEVELS: GrowthLevel[] = ["L1", "L2", "L3", "L4", "L5"];

export const GROWTH_LEVEL_ORDER: Record<GrowthLevel, number> = {
  L1: 0,
  L2: 1,
  L3: 2,
  L4: 3,
  L5: 4,
};

export type OotbAppId =
  | "my-work"
  | "my-content-creator"
  | "my-capital"
  | "my-shop"
  | "my-vital"
  | "my-family"
  | "claw-cafe"
  | "robotaxi-fleet-manager";

/** Per-app display labels — placeholders until each app implements full leveling UX */
export const GROWTH_LABELS: Record<OotbAppId, Record<GrowthLevel, string>> = {
  "my-work": {
    L1: "Explorer",
    L2: "Side Hustler",
    L3: "Operator",
    L4: "Professional",
    L5: "Executive",
  },
  "my-content-creator": {
    L1: "Explorer",
    L2: "Maker",
    L3: "Publisher",
    L4: "Brand",
    L5: "Studio",
  },
  "my-capital": {
    L1: "Learner",
    L2: "Builder",
    L3: "Operator",
    L4: "Allocator",
    L5: "Principal",
  },
  "my-shop": {
    L1: "Scout",
    L2: "Flipper",
    L3: "Operator",
    L4: "Wholesaler",
    L5: "Desk Lead",
  },
  "my-vital": {
    L1: "Starter",
    L2: "Tracker",
    L3: "Optimizer",
    L4: "Athlete",
    L5: "Longevity",
  },
  "my-family": {
    L1: "Member",
    L2: "Helper",
    L3: "Coordinator",
    L4: "Steward",
    L5: "Elder",
  },
  "claw-cafe": {
    L1: "Visitor",
    L2: "Regular",
    L3: "Host",
    L4: "Patron",
    L5: "Founder",
  },
  "robotaxi-fleet-manager": {
    L1: "Observer",
    L2: "Dispatcher",
    L3: "Coordinator",
    L4: "Fleet Lead",
    L5: "Commander",
  },
};

/** Map legacy 3-tier UI to nearest growth level (migration bridge) */
export function growthLevelFromExperience(level: ExperienceLevel): GrowthLevel {
  if (level === "beginner") return "L1";
  if (level === "standard") return "L3";
  return "L5";
}

/** Collapse growth level to legacy gate for components not yet migrated */
/** Maps claw growth L1–L5 to desk depth — not global appearance.experienceLevel. */
export function experienceLevelFromGrowth(growth: GrowthLevel): ExperienceLevel {
  if (growth === "L1" || growth === "L2") return "beginner";
  if (growth === "L3" || growth === "L4") return "standard";
  return "expert";
}

export function meetsGrowthLevel(user: GrowthLevel, required: GrowthLevel): boolean {
  return GROWTH_LEVEL_ORDER[user] >= GROWTH_LEVEL_ORDER[required];
}

export function growthLabel(appId: OotbAppId, level: GrowthLevel): string {
  return GROWTH_LABELS[appId][level];
}

export function isGrowthLevel(v: unknown): v is GrowthLevel {
  return v === "L1" || v === "L2" || v === "L3" || v === "L4" || v === "L5";
}

/** FRE / settings persona intents — Work Claw first consumer */
export type WorkGrowthIntent =
  | "student_hobbies"
  | "side_hustle"
  | "nonprofit_advocacy"
  | "solo_business"
  | "executive_team";

export const WORK_INTENT_TO_GROWTH: Record<WorkGrowthIntent, GrowthLevel> = {
  student_hobbies: "L1",
  side_hustle: "L2",
  nonprofit_advocacy: "L3",
  solo_business: "L4",
  executive_team: "L5",
};

export const WORK_GROWTH_INTENT_LABELS: Record<WorkGrowthIntent, string> = {
  student_hobbies: "Student, gamer, or hobby projects",
  side_hustle: "Etsy, eBay, freelance, or creator side income",
  nonprofit_advocacy: "Nonprofit, advocacy, or community operations",
  solo_business: "Solo business or client acquisition",
  executive_team: "Founder or executive team lead",
};

/** FRE / settings persona intents — Creator Claw */
export type CreatorGrowthIntent =
  | "hobby_learning"
  | "side_income"
  | "recurring_publisher"
  | "brand_marketing"
  | "creator_studio";

export const CREATOR_INTENT_TO_GROWTH: Record<CreatorGrowthIntent, GrowthLevel> = {
  hobby_learning: "L1",
  side_income: "L2",
  recurring_publisher: "L3",
  brand_marketing: "L4",
  creator_studio: "L5",
};

export const CREATOR_GROWTH_INTENT_LABELS: Record<CreatorGrowthIntent, string> = {
  hobby_learning: "Hobbyist or learning to post online",
  side_income: "Side income — Etsy, freelance, aspiring creator",
  recurring_publisher: "Publishing on a schedule for a brand or community",
  brand_marketing: "Brand marketing — multi-channel content ops",
  creator_studio: "Studio or team — delegate publish and review",
};

/** FRE / settings persona intents — Capital Claw */
export type CapitalGrowthIntent =
  | "learning_investing"
  | "building_wealth"
  | "operating_rules"
  | "allocating_portfolio"
  | "principal_governance";

export const CAPITAL_INTENT_TO_GROWTH: Record<CapitalGrowthIntent, GrowthLevel> = {
  learning_investing: "L1",
  building_wealth: "L2",
  operating_rules: "L3",
  allocating_portfolio: "L4",
  principal_governance: "L5",
};

export const CAPITAL_GROWTH_INTENT_LABELS: Record<CapitalGrowthIntent, string> = {
  learning_investing: "Learning — first watchlist and practice trades",
  building_wealth: "Building — simple rules and pilots on paper",
  operating_rules: "Operating — daily desk, auto-approval, PFM",
  allocating_portfolio: "Allocating — multi-broker, agents, analytics",
  principal_governance: "Principal — live capital policy and delegation",
};

/** FRE / settings persona intents — Vital Claw */
export type VitalGrowthIntent =
  | "wellness_basics"
  | "daily_tracking"
  | "optimize_protocol"
  | "athletic_performance"
  | "longevity_mastery";

export const VITAL_INTENT_TO_GROWTH: Record<VitalGrowthIntent, GrowthLevel> = {
  wellness_basics: "L1",
  daily_tracking: "L2",
  optimize_protocol: "L3",
  athletic_performance: "L4",
  longevity_mastery: "L5",
};

export const VITAL_GROWTH_INTENT_LABELS: Record<VitalGrowthIntent, string> = {
  wellness_basics: "Starter — learn vitals and a simple protocol",
  daily_tracking: "Tracker — wearables and health app bridges",
  optimize_protocol: "Optimizer — reports, diet sync, mesh publish",
  athletic_performance: "Athlete — trends, recovery, performance analytics",
  longevity_mastery: "Longevity — full desk, labs vault, CCP governance",
};

/** Optional FRE follow-up — sets default watchlist / rule pack */
export type CapitalFreFocus = "learn_tickers" | "simple_rules" | "copy_pilots" | "research_heavy" | "automation_heavy";

export const CAPITAL_FOCUS_SEED_PACK: Record<CapitalFreFocus, string> = {
  learn_tickers: "learner_watchlist",
  simple_rules: "builder_dip_spy",
  copy_pilots: "operator_multi",
  research_heavy: "allocator_growth",
  automation_heavy: "principal_policy",
};

/** FRE / settings persona intents — The Forge */
export type ForgeGrowthIntent =
  | "first_claw"
  | "side_projects"
  | "custom_stacks"
  | "templates_import"
  | "fleet_operator";

export const FORGE_INTENT_TO_GROWTH: Record<ForgeGrowthIntent, GrowthLevel> = {
  first_claw: "L1",
  side_projects: "L2",
  custom_stacks: "L3",
  templates_import: "L4",
  fleet_operator: "L5",
};

export const FORGE_GROWTH_INTENT_LABELS: Record<ForgeGrowthIntent, string> = {
  first_claw: "First claw — learning the factory",
  side_projects: "Side projects — a few bots for hobbies or income",
  custom_stacks: "Custom stacks — tuning models and multimodal",
  templates_import: "Templates & import — power mint and bundles",
  fleet_operator: "Fleet operator — governance and ops",
};

/** FRE / settings persona intents — Swarm Claw */
export type SwarmGrowthIntent =
  | "learning_grid"
  | "first_dispatch"
  | "daily_coordination"
  | "multi_depot_ops"
  | "fleet_governance";

export const SWARM_INTENT_TO_GROWTH: Record<SwarmGrowthIntent, GrowthLevel> = {
  learning_grid: "L1",
  first_dispatch: "L2",
  daily_coordination: "L3",
  multi_depot_ops: "L4",
  fleet_governance: "L5",
};

export const SWARM_GROWTH_INTENT_LABELS: Record<SwarmGrowthIntent, string> = {
  learning_grid: "Learning — explore the dispatch grid",
  first_dispatch: "Dispatching — route a few Claws",
  daily_coordination: "Coordinating — daily fleet ops",
  multi_depot_ops: "Fleet lead — mesh, policies, audit",
  fleet_governance: "Commander — governance at scale",
};

/** FRE / settings persona intents — Arbitrage Claw */
export type ShopGrowthIntent =
  | "learning_arbitrage"
  | "side_hustle_flips"
  | "daily_fulfillment"
  | "multi_channel_ops"
  | "desk_governance";

export const SHOP_INTENT_TO_GROWTH: Record<ShopGrowthIntent, GrowthLevel> = {
  learning_arbitrage: "L1",
  side_hustle_flips: "L2",
  daily_fulfillment: "L3",
  multi_channel_ops: "L4",
  desk_governance: "L5",
};

export const SHOP_GROWTH_INTENT_LABELS: Record<ShopGrowthIntent, string> = {
  learning_arbitrage: "Learning — watch spreads and try demo ingest",
  side_hustle_flips: "Side hustle — Etsy, eBay, or retail arbitrage",
  daily_fulfillment: "Operating — daily pick/pack/ship on the desk",
  multi_channel_ops: "Wholesale — multi-channel margin and lanes",
  desk_governance: "Desk lead — policy, audit, and delegation",
};

/** FRE / settings persona intents — Kin */
export type KinGrowthIntent =
  | "solo_member"
  | "helper_roommate"
  | "household_coordinator"
  | "family_steward"
  | "multigen_elder";

export const KIN_INTENT_TO_GROWTH: Record<KinGrowthIntent, GrowthLevel> = {
  solo_member: "L1",
  helper_roommate: "L2",
  household_coordinator: "L3",
  family_steward: "L4",
  multigen_elder: "L5",
};

export const KIN_GROWTH_INTENT_LABELS: Record<KinGrowthIntent, string> = {
  solo_member: "Just me — personal context on the box",
  helper_roommate: "Partner or roommate — shared basics",
  household_coordinator: "Parent or coordinator — schedules and devices",
  family_steward: "Household admin — scopes and guests",
  multigen_elder: "Multigenerational — elder care and delegation",
};
