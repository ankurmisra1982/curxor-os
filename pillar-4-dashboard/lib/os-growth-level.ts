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
  | "my-vital"
  | "my-family"
  | "claw-cafe";

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
};

/** Map legacy 3-tier UI to nearest growth level (migration bridge) */
export function growthLevelFromExperience(level: ExperienceLevel): GrowthLevel {
  if (level === "beginner") return "L1";
  if (level === "standard") return "L3";
  return "L5";
}

/** Collapse growth level to legacy gate for components not yet migrated */
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
