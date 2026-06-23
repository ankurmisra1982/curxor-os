import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SwarmXpEventKind =
  | "dispatch_completed"
  | "rebalance"
  | "ping_mesh"
  | "handoff_received"
  | "workload_assigned"
  | "fleet_milestone"
  | "exit_demo_ready";

export interface SwarmXpEvent {
  id: string;
  kind: SwarmXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

function xpPath(): string {
  const base = process.env.CURXOR_DEV_QA_DIR ?? path.join(process.cwd(), "scripts", "dev-qa");
  return path.join(base, "swarm-xp-events.json");
}

async function readEvents(): Promise<SwarmXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: SwarmXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitSwarmXpEvent(
  kind: SwarmXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<SwarmXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: SwarmXpEvent = {
    id: `SXP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromSwarm } = await import("./claw-cafe-events");
  void ingestCafeEventFromSwarm(kind, payload);

  return row;
}

export async function listSwarmXpEvents(limit = 25): Promise<SwarmXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}

export function swarmXpStreak(events: SwarmXpEvent[]): number {
  if (events.length === 0) return 0;
  let streak = 0;
  const dayKey = (iso: string) => iso.slice(0, 10);
  let cursor = dayKey(events[0].at);
  for (const event of events) {
    const key = dayKey(event.at);
    if (key === cursor) {
      streak++;
    } else if (streak === 0) {
      cursor = key;
      streak = 1;
    } else {
      break;
    }
  }
  return streak;
}

export async function evaluateSwarmCafeBonus(): Promise<{ eligible: boolean; reason: string; bonusXp: number }> {
  const events = await listSwarmXpEvents(50);
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = events.filter((e) => Date.parse(e.at) >= weekAgo);
  const hasDispatch = recent.some((e) => e.kind === "dispatch_completed" || e.kind === "workload_assigned");
  const hasHandoff = recent.some((e) => e.kind === "handoff_received");
  if (hasDispatch && hasHandoff) {
    return { eligible: true, reason: "Cross-claw handoff + fleet dispatch same week", bonusXp: 30 };
  }
  return { eligible: false, reason: "Complete a handoff and dispatch in the same week", bonusXp: 0 };
}
