import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SignalXpEventKind = "knowledge_pushed" | "context_synced" | "routine_armed";

export interface SignalXpEvent {
  id: string;
  kind: SignalXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

import { curxorDataPath } from "./curxor-data-dir";

function xpPath(): string {
  return curxorDataPath("signal-xp-events.json");
}

async function readEvents(): Promise<SignalXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: SignalXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitSignalXpEvent(
  kind: SignalXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<SignalXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: SignalXpEvent = {
    id: `SGN-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromSignal } = await import("./claw-cafe-events");
  void ingestCafeEventFromSignal(kind, payload);

  return row;
}

export async function listSignalXpEvents(limit = 25): Promise<SignalXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
