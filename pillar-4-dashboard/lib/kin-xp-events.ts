import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type KinXpEventKind = "profile_updated" | "handoff" | "context_synced";

export interface KinXpEvent {
  id: string;
  kind: KinXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

import { curxorDataPath } from "./curxor-data-dir";

function xpPath(): string {
  return curxorDataPath("kin-xp-events.json");
}

async function readEvents(): Promise<KinXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: KinXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitKinXpEvent(
  kind: KinXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<KinXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: KinXpEvent = {
    id: `KXP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromKin } = await import("./claw-cafe-events");
  void ingestCafeEventFromKin(kind, payload);

  return row;
}

export async function listKinXpEvents(limit = 25): Promise<KinXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
