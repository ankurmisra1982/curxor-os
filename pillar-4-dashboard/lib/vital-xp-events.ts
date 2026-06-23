import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type VitalXpEventKind =
  | "wearable_sync"
  | "report_ingested"
  | "protocol_updated"
  | "context_published";

export interface VitalXpEvent {
  id: string;
  kind: VitalXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

import { curxorDataPath } from "./curxor-data-dir";

function xpPath(): string {
  return curxorDataPath("vital-xp-events.json");
}

async function readEvents(): Promise<VitalXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: VitalXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitVitalXpEvent(
  kind: VitalXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<VitalXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: VitalXpEvent = {
    id: `VXP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromVital } = await import("./claw-cafe-events");
  void ingestCafeEventFromVital(kind, payload);

  return row;
}

export async function listVitalXpEvents(limit = 25): Promise<VitalXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
