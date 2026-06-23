import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CreatorXpEventKind =
  | "post_published"
  | "post_scheduled"
  | "go_live_demo_ready"
  | "demo_tour_complete";

export interface CreatorXpEvent {
  id: string;
  kind: CreatorXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

function xpPath(): string {
  const base = process.env.CURXOR_DEV_QA_DIR ?? path.join(process.cwd(), "scripts", "dev-qa");
  return path.join(base, "creator-xp-events.json");
}

async function readEvents(): Promise<CreatorXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: CreatorXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitCreatorXpEvent(
  kind: CreatorXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<CreatorXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: CreatorXpEvent = {
    id: `CXP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromCreator } = await import("./claw-cafe-events");
  void ingestCafeEventFromCreator(kind, payload);

  return row;
}

export async function listCreatorXpEvents(limit = 25): Promise<CreatorXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
