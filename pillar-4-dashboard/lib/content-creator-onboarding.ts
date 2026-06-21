import "server-only";

import { readUserSettings, updateUserSettings } from "./user-settings";

/**
 * First Creator Claw FRE completion — nudge operators into Beginner mode
 * unless they already chose Expert in Settings (both uiMode and experienceLevel).
 */
export async function ensureBeginnerExperienceAfterCreatorFre(): Promise<void> {
  const settings = await readUserSettings();
  const explicitExpert =
    settings.appearance.experienceLevel === "expert" && settings.appearance.uiMode === "expert";

  if (explicitExpert) return;

  if (settings.appearance.experienceLevel === "beginner" && settings.appearance.uiMode === "simple") {
    return;
  }

  await updateUserSettings({
    appearance: {
      experienceLevel: "beginner",
      uiMode: "simple",
    },
  });
}
