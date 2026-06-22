export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { evaluateCrossClawWeeklyBonus } from "@/lib/claw-cafe-bonus";
import { listWorkXpEvents } from "@/lib/work-xp-events";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const [events, bonus, settings] = await Promise.all([
    listWorkXpEvents(5),
    evaluateCrossClawWeeklyBonus(),
    readUserSettings(),
  ]);
  const optOut = settings.appearance.workGamificationOptOut === true;
  return Response.json({
    ok: true,
    events: optOut ? [] : events,
    optOut,
    bonus,
    streak: events.length >= 3 ? 3 : events.length,
  });
}
