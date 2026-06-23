import "server-only";

import type { AscensionTierId } from "./claw-cafe-ascension";
import { ASCENSION_TIER_INDEX } from "./claw-cafe-ascension";
import { MASTER_CHAMBER_GRID } from "./claw-cafe-spatial";
import type { PatronState } from "./cafe-pixel-engine";

export type PatronBriefMode = "locked" | "whisper" | "daily" | "orchestration" | "full";

/** G4+ daily · G5+ orchestration · G6 full panel */
export function patronBriefMode(tier: AscensionTierId): PatronBriefMode {
  const idx = ASCENSION_TIER_INDEX[tier];
  if (idx < ASCENSION_TIER_INDEX.goddess_of_wealth) return "locked";
  if (idx === ASCENSION_TIER_INDEX.goddess_of_wealth) return "daily";
  if (idx === ASCENSION_TIER_INDEX.consciousness) return "orchestration";
  return "full";
}

export function patronInMasterChamber(patron: PatronState): boolean {
  return patron.col === MASTER_CHAMBER_GRID.col && patron.row === MASTER_CHAMBER_GRID.row;
}

/** G4+ (Goddess of Wealth) unlocks responsive Master AI chamber. */
export function masterChamberUnlocked(tier: AscensionTierId): boolean {
  return ASCENSION_TIER_INDEX[tier] >= ASCENSION_TIER_INDEX.goddess_of_wealth;
}

export function masterChamberWhisper(tier: AscensionTierId): string | null {
  if (masterChamberUnlocked(tier)) return null;
  return "Something stirs beyond the yard wall… not yet.";
}
