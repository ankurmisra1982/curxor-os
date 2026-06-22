import "server-only";

import { listWorkXpEvents } from "./work-xp-events";

export interface ClawCafeBonus {
  eligible: boolean;
  reason: string;
  bonusXp: number;
}

export async function evaluateCrossClawWeeklyBonus(): Promise<ClawCafeBonus> {
  const events = await listWorkXpEvents(50);
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = events.filter((e) => Date.parse(e.at) >= weekAgo);
  const hasPublish = recent.some((e) => e.kind === "sequence_activated");
  const hasFollowUp = recent.some((e) => e.kind === "draft_reply" || e.kind === "handoff_received");
  if (hasPublish && hasFollowUp) {
    return { eligible: true, reason: "Publish + follow-up same week", bonusXp: 25 };
  }
  return { eligible: false, reason: "Complete publish + follow-up in same week", bonusXp: 0 };
}
