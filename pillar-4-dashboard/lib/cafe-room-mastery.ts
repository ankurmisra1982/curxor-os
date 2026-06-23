import "server-only";

import { listCafeEvents } from "./claw-cafe-events";
import type { OotbAppId } from "./ootb-apps";
import { OOTB_APPS } from "./ootb-apps";

export interface DeskMasteryRow {
  appId: string;
  label: string;
  count: number;
  stars: number;
  summary: string;
}

const DESK_LABELS: Partial<Record<OotbAppId, string>> = {
  "my-work": "Outreach",
  "my-content-creator": "Creator",
  "my-capital": "Capital",
  "my-vital": "Vital",
  "my-family": "Kin",
  "my-shop": "Arbitrage",
  "tesla-optimus-engine": "Signal",
  "robotaxi-fleet-manager": "Swarm",
  "claw-forge": "Forge",
};

function starsFromCount(count: number): number {
  if (count >= 24) return 5;
  if (count >= 12) return 4;
  if (count >= 6) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
}

function weekCutoff(): number {
  return Date.now() - 7 * 86400000;
}

export async function buildDeskMastery(appId?: string): Promise<DeskMasteryRow | DeskMasteryRow[]> {
  const cutoff = weekCutoff();
  const counts = new Map<string, number>();

  for (const e of await listCafeEvents(200)) {
    if (Date.parse(e.at) < cutoff) continue;
    counts.set(e.appId, (counts.get(e.appId) ?? 0) + 1);
  }

  const rows: DeskMasteryRow[] = [];
  for (const [id, count] of counts) {
    const ootb = OOTB_APPS.find((a) => a.id === id);
    const label = DESK_LABELS[id as OotbAppId] ?? ootb?.short ?? id.slice(0, 12);
    const stars = starsFromCount(count);
    rows.push({
      appId: id,
      label,
      count,
      stars,
      summary: stars > 0 ? `${label}: ${count} events this week` : `${label}: quiet this week`,
    });
  }

  rows.sort((a, b) => b.count - a.count);

  if (appId) {
    const hit = rows.find((r) => r.appId === appId);
    if (hit) return hit;
    const ootb = OOTB_APPS.find((a) => a.id === appId);
    return {
      appId,
      label: DESK_LABELS[appId as OotbAppId] ?? ootb?.short ?? appId.slice(0, 12),
      count: 0,
      stars: 0,
      summary: "No activity this week",
    };
  }

  return rows;
}

export function formatMasteryStars(stars: number): string {
  if (stars <= 0) return "—";
  return "★".repeat(stars) + "☆".repeat(Math.max(0, 5 - stars));
}
