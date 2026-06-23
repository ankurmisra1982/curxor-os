import type { ExperienceLevel } from "./experience-level";
import {
  type GrowthLevel,
  type OotbAppId,
  GROWTH_LEVEL_ORDER,
  growthLabel,
  growthLevelFromExperience,
} from "./os-growth-level";

const EPITHET_DESKS: { appId: OotbAppId; desk: string }[] = [
  { appId: "my-work", desk: "Outreach" },
  { appId: "my-content-creator", desk: "Creator" },
  { appId: "my-capital", desk: "Capital" },
];

export function buildCafeEpithet(input: {
  experienceLevel: ExperienceLevel;
  workGrowthLevel?: GrowthLevel | null;
  creatorGrowthLevel?: GrowthLevel | null;
  capitalGrowthLevel?: GrowthLevel | null;
}): string {
  const fallback = growthLevelFromExperience(input.experienceLevel);
  const rows = EPITHET_DESKS.map(({ appId, desk }) => ({
    appId,
    desk,
    level:
      appId === "my-work"
        ? input.workGrowthLevel ?? fallback
        : appId === "my-content-creator"
          ? input.creatorGrowthLevel ?? fallback
          : input.capitalGrowthLevel ?? fallback,
  }));

  let best = rows[0]!;
  for (const row of rows) {
    if (GROWTH_LEVEL_ORDER[row.level] > GROWTH_LEVEL_ORDER[best.level]) best = row;
  }

  return `${growthLabel(best.appId, best.level)} of ${best.desk}`;
}

export function formatCafeProfileLine(ascensionTitle: string, epithet: string): string {
  if (!epithet) return ascensionTitle;
  return `${ascensionTitle} · ${epithet}`;
}
