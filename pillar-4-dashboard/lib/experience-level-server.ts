import "server-only";

import { readUserSettings } from "./user-settings";
import { resolveExperienceLevel, type ExperienceLevel } from "./experience-level";

export async function readExperienceLevel(): Promise<ExperienceLevel> {
  const settings = await readUserSettings();
  return resolveExperienceLevel(
    settings.appearance.uiMode,
    settings.appearance.experienceLevel,
  );
}
