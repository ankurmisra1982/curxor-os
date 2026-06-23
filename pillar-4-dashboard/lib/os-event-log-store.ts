import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { curxorDataPath } from "./curxor-data-dir";
import type { OsEventKind, OsEventRecord } from "./os-event-bus-types";

const MAX_EVENTS = 200;

export function getOsEventLogPath(): string {
  return process.env.CURXOR_OS_EVENT_LOG_PATH ?? curxorDataPath("os-event-log.json");
}

async function readLogFile(): Promise<OsEventRecord[]> {
  try {
    const raw = await readFile(getOsEventLogPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: OsEventRecord[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function appendOsEventRecord(record: OsEventRecord): Promise<void> {
  const events = await readLogFile();
  const next = [...events, record].slice(-MAX_EVENTS);
  const filePath = getOsEventLogPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: next }, null, 2)}\n`, { mode: 0o640 });
}

export async function readOsEventLog(limit = 32): Promise<OsEventRecord[]> {
  const events = await readLogFile();
  return events.slice(-Math.min(Math.max(1, limit), MAX_EVENTS));
}

export async function hasRecentOsEvent(
  event: OsEventKind,
  dedupeKey: string,
  withinMs: number,
): Promise<boolean> {
  const events = await readLogFile();
  const cutoff = Date.now() - withinMs;
  return events.some((e) => {
    if (e.event !== event) return false;
    const key = typeof e.payload.dedupeKey === "string" ? e.payload.dedupeKey : "";
    if (key !== dedupeKey) return false;
    return new Date(e.timestamp).getTime() >= cutoff;
  });
}
