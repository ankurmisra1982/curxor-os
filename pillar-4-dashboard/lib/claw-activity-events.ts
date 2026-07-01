import "server-only";

import { emitOsEvent } from "./os-event-bus";
import { hasRecentOsEvent } from "./os-event-log-store";

export type ClawActivityAppId = "my-capital" | "my-work" | "my-content-creator" | "claw-forge";

const DEDUPE_WINDOW_MS = 86_400_000;

export async function emitClawSkillCompleted(input: {
  appId: ClawActivityAppId;
  summary: string;
  skillId?: string;
  evidence?: string;
  dedupeKey?: string;
}): Promise<void> {
  if (
    input.dedupeKey &&
    (await hasRecentOsEvent("claw.skill_completed", input.dedupeKey, DEDUPE_WINDOW_MS))
  ) {
    return;
  }
  void emitOsEvent(
    "claw.skill_completed",
    {
      appId: input.appId,
      summary: input.summary,
      skillId: input.skillId,
      evidence: input.evidence,
      dedupeKey: input.dedupeKey,
    },
    { skipWebhook: true },
  );
}
