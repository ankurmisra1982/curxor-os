import "server-only";

import { readAppFreState } from "./app-fre-state";
import { envFlag } from "./digital-env";
import { buildWorkGrowthProfile } from "./work-growth";
import { meetsGrowthLevel } from "./os-growth-level";
import { readUserSettings } from "./user-settings";

function parseFreBool(raw: unknown): boolean | null {
  if (raw === true || raw === "true") return true;
  if (raw === false || raw === "false") return false;
  return null;
}

/** Human gate before outbound sends — FRE, env, or L3+ default when unset. */
export async function requireWorkSendApproval(): Promise<boolean> {
  if (envFlag("CURXOR_WORK_REQUIRE_APPROVAL", false)) return true;
  const fre = await readAppFreState("my-work");
  const explicit = parseFreBool(fre.config.requireSendApproval);
  if (explicit !== null) return explicit;
  const settings = await readUserSettings();
  const growth = buildWorkGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.workGrowthLevel ?? null,
  );
  return meetsGrowthLevel(growth.growthLevel, "L3");
}

export async function readRequireSendApprovalFre(): Promise<boolean | null> {
  const fre = await readAppFreState("my-work");
  return parseFreBool(fre.config.requireSendApproval);
}
