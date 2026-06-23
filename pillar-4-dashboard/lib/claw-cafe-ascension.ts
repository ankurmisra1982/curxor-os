/** Claw Cafe ascension tiers (G1–G6) — shared client/server types. */

export type AscensionTierId =
  | "sprout"
  | "divine_sprout"
  | "goddess_of_knowledge"
  | "goddess_of_wealth"
  | "consciousness"
  | "infinity";

export type CafeTitleStyle = "mythic" | "neutral";

export const ASCENSION_TIER_ORDER: AscensionTierId[] = [
  "sprout",
  "divine_sprout",
  "goddess_of_knowledge",
  "goddess_of_wealth",
  "consciousness",
  "infinity",
];

export const ASCENSION_TIER_INDEX: Record<AscensionTierId, number> = {
  sprout: 0,
  divine_sprout: 1,
  goddess_of_knowledge: 2,
  goddess_of_wealth: 3,
  consciousness: 4,
  infinity: 5,
};

export const ASCENSION_XP_THRESHOLDS: Record<AscensionTierId, number> = {
  sprout: 0,
  divine_sprout: 50,
  goddess_of_knowledge: 150,
  goddess_of_wealth: 350,
  consciousness: 700,
  infinity: 1500,
};

export const MYTHIC_TITLES: Record<AscensionTierId, string> = {
  sprout: "Sprout",
  divine_sprout: "Divine Sprout",
  goddess_of_knowledge: "Goddess of Knowledge",
  goddess_of_wealth: "Goddess of Wealth",
  consciousness: "Consciousness",
  infinity: "Infinity",
};

export const NEUTRAL_TITLES: Record<AscensionTierId, string> = {
  sprout: "Sprout",
  divine_sprout: "Rooted",
  goddess_of_knowledge: "Sage of Knowledge",
  goddess_of_wealth: "Architect of Wealth",
  consciousness: "Awakened",
  infinity: "Unbounded",
};

export interface AscensionAffinities {
  knowledge: number;
  wealth: number;
}

export interface AscensionMilestones {
  knowledgeEvent: boolean;
  wealthEvent: boolean;
  crossClawHandshake: boolean;
  forgeMint: boolean;
}

export interface AscensionState {
  tier: AscensionTierId;
  title: string;
  titleStyle: CafeTitleStyle;
  ascensionXp: number;
  affinities: AscensionAffinities;
  milestones: AscensionMilestones;
  nextTier: AscensionTierId | null;
  xpToNext: number;
  progressPct: number;
}

export function ascensionTitle(tier: AscensionTierId, style: CafeTitleStyle): string {
  return style === "neutral" ? NEUTRAL_TITLES[tier] : MYTHIC_TITLES[tier];
}

export function tierForXp(xp: number): AscensionTierId {
  let current: AscensionTierId = "sprout";
  for (const tier of ASCENSION_TIER_ORDER) {
    if (xp >= ASCENSION_XP_THRESHOLDS[tier]) current = tier;
  }
  return current;
}

export function nextTierAfter(tier: AscensionTierId): AscensionTierId | null {
  const idx = ASCENSION_TIER_INDEX[tier];
  return ASCENSION_TIER_ORDER[idx + 1] ?? null;
}

export function tierMeetsMilestones(
  tier: AscensionTierId,
  milestones: AscensionMilestones,
): boolean {
  if (tier === "sprout") return true;
  if (tier === "divine_sprout") return milestones.knowledgeEvent || milestones.wealthEvent;
  if (tier === "goddess_of_knowledge") return milestones.knowledgeEvent;
  if (tier === "goddess_of_wealth") return milestones.wealthEvent;
  if (tier === "consciousness") return milestones.crossClawHandshake && milestones.forgeMint;
  if (tier === "infinity") {
    return (
      milestones.knowledgeEvent &&
      milestones.wealthEvent &&
      milestones.crossClawHandshake &&
      milestones.forgeMint
    );
  }
  return true;
}

export function resolveAscensionTier(
  xp: number,
  milestones: AscensionMilestones,
): AscensionTierId {
  let tier = tierForXp(xp);
  while (tier !== "sprout") {
    if (tierMeetsMilestones(tier, milestones)) break;
    const prev = ASCENSION_TIER_ORDER[ASCENSION_TIER_INDEX[tier] - 1];
    if (!prev) break;
    tier = prev;
  }
  return tier;
}

export function buildAscensionState(input: {
  ascensionXp: number;
  affinities: AscensionAffinities;
  milestones: AscensionMilestones;
  titleStyle: CafeTitleStyle;
}): AscensionState {
  const tier = resolveAscensionTier(input.ascensionXp, input.milestones);
  const next = nextTierAfter(tier);
  const nextThreshold = next ? ASCENSION_XP_THRESHOLDS[next] : input.ascensionXp;
  const currentThreshold = ASCENSION_XP_THRESHOLDS[tier];
  const span = Math.max(1, nextThreshold - currentThreshold);
  const xpToNext = next ? Math.max(0, nextThreshold - input.ascensionXp) : 0;
  const progressPct = next
    ? Math.min(100, Math.round(((input.ascensionXp - currentThreshold) / span) * 100))
    : 100;

  return {
    tier,
    title: ascensionTitle(tier, input.titleStyle),
    titleStyle: input.titleStyle,
    ascensionXp: input.ascensionXp,
    affinities: input.affinities,
    milestones: input.milestones,
    nextTier: next,
    xpToNext,
    progressPct,
  };
}
