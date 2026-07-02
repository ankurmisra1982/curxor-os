import "server-only";

import { ingestCafeEvent, syncCafeEventSources } from "./claw-cafe-events";
import { readAppFreState } from "./app-fre-state";
import { CAFE_DEFAULT_KIOSK_NAME } from "./ol1-layer";
import { readUserSettings } from "./user-settings";

export interface CafeDemoTourResult {
  ok: boolean;
  steps: string[];
  error?: string;
}

export async function runCafeDemoTour(): Promise<CafeDemoTourResult> {
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) {
    return { ok: false, steps: [], error: "Gamification is off — enable in Settings → Appearance" };
  }

  const fre = await readAppFreState("claw-cafe");
  const steps: string[] = [];
  const kiosk =
    typeof fre.config.kioskName === "string" ? fre.config.kioskName : CAFE_DEFAULT_KIOSK_NAME;
  steps.push(fre.initialized ? `Kiosk · ${kiosk}` : "Cafe desk · default kiosk");

  const { ingested } = await syncCafeEventSources();
  steps.push(`Synced ${ingested} cross-Claw event(s)`);

  await ingestCafeEvent({
    kind: "work.sequence_step",
    appId: "my-work",
    xp: { ascension: 15, wealth: 10 },
    bubble: "Demo tour · Outreach ping",
  });
  steps.push("Work stub · sequence step at mailbox");

  await ingestCafeEvent({
    kind: "forge.framework_provisioned",
    appId: "claw-forge",
    xp: { ascension: 20, knowledge: 12 },
    bubble: "Demo tour · Forge desk minted",
  });
  steps.push("Forge stub · framework provisioned at anvil");

  await ingestCafeEvent({
    kind: "app.tour_complete",
    appId: "claw-cafe",
    xp: { ascension: 25, knowledge: 8, wealth: 8 },
    bubble: "Cafe demo tour complete",
  });
  steps.push("Celebrate · ascension pulse across the room");

  return { ok: true, steps };
}
