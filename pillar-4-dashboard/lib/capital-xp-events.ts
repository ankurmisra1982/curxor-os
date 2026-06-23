import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CapitalXpEventKind =
  | "rule_armed"
  | "rule_fired"
  | "go_live_demo_ready"
  | "demo_tour_complete";

export interface CapitalXpEvent {
  id: string;
  kind: CapitalXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

function xpPath(): string {
  const base = process.env.CURXOR_DEV_QA_DIR ?? path.join(process.cwd(), "scripts", "dev-qa");
  return path.join(base, "capital-xp-events.json");
}

async function readEvents(): Promise<CapitalXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: CapitalXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitCapitalXpEvent(
  kind: CapitalXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<CapitalXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: CapitalXpEvent = {
    id: `KXP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromCapital } = await import("./claw-cafe-events");
  void ingestCafeEventFromCapital(kind, payload);

  return row;
}

export async function listCapitalXpEvents(limit = 25): Promise<CapitalXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
