import "server-only";

import type { AscensionTierId } from "./claw-cafe-ascension";
import type { CafeEvent } from "./claw-cafe-events";
import { listCafeEvents } from "./claw-cafe-events";
import { patronBriefMode, type PatronBriefMode } from "./cafe-master-chamber";
import { OOTB_APPS } from "./ootb-apps";

export type { PatronBriefMode };

function labelForApp(appId: string): string {
  return OOTB_APPS.find((a) => a.id === appId)?.short ?? appId.slice(0, 10);
}

function todayCutoff(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function summarizeEvents(events: CafeEvent[], mode: PatronBriefMode): string[] {
  const since = todayCutoff();
  const today = events.filter((e) => Date.parse(e.at) >= since);
  if (today.length === 0) {
    return ["Your Claws were quiet today — the ledger is listening."];
  }

  const byApp = new Map<string, number>();
  for (const e of today) {
    byApp.set(e.appId, (byApp.get(e.appId) ?? 0) + 1);
  }

  const lines: string[] = [];
  lines.push(`Today: ${today.length} event${today.length === 1 ? "" : "s"} across your box.`);

  const sorted = [...byApp.entries()].sort((a, b) => b[1] - a[1]).slice(0, mode === "daily" ? 3 : 6);
  for (const [appId, count] of sorted) {
    const latest = today.find((e) => e.appId === appId);
    const bubble = latest?.bubble ? ` — ${latest.bubble}` : "";
    lines.push(`· ${labelForApp(appId)}: ${count}${bubble}`);
  }

  if (mode === "orchestration" || mode === "full") {
    const handshakes = today.filter((e) => e.kind.includes("handshake") || e.kind.includes("handoff"));
    if (handshakes.length > 0) {
      lines.push(`Cross-Claw: ${handshakes.length} handshake${handshakes.length === 1 ? "" : "s"} today.`);
    }
    const pending = today.filter((e) => e.kind.includes("approval"));
    if (pending.length > 0) {
      lines.push(`${pending.length} item${pending.length === 1 ? "" : "s"} needed your OK today.`);
    }
  }

  if (mode === "full") {
    const xp = today.reduce((sum, e) => sum + (e.xp?.ascension ?? 0), 0);
    lines.push(`Ascension earned today: ${xp} XP — your box remembers.`);
  }

  if (mode === "orchestration" || mode === "full") {
    lines.push("Builder overlay: Master AI may suggest Cursor Bridge tasks — confirm in Settings → Build Plane.");
  } else if (mode === "daily") {
    lines.push("Builder overlay available in Settings when you are ready to extend the box.");
  }

  return lines;
}

export async function buildPatronBrief(tier: AscensionTierId): Promise<{
  mode: PatronBriefMode;
  lines: string[];
  eventCountToday: number;
}> {
  const mode = patronBriefMode(tier);
  if (mode === "locked") {
    return { mode, lines: [], eventCountToday: 0 };
  }

  const events = await listCafeEvents(80);
  const since = todayCutoff();
  const todayCount = events.filter((e) => Date.parse(e.at) >= since).length;
  const lines = summarizeEvents(events, mode);

  return { mode, lines, eventCountToday: todayCount };
}
