import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkXpEventKind =
  | "create_lead"
  | "draft_reply"
  | "go_live_demo_ready"
  | "connector_linked"
  | "handoff_received"
  | "sequence_activated"
  | "approval_pending";

export interface WorkXpEvent {
  id: string;
  kind: WorkXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

function xpPath(): string {
  const base = process.env.CURXOR_DEV_QA_DIR ?? path.join(process.cwd(), "scripts", "dev-qa");
  return path.join(base, "work-xp-events.json");
}

async function readEvents(): Promise<WorkXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: WorkXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitWorkXpEvent(
  kind: WorkXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<WorkXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: WorkXpEvent = {
    id: `WXP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromWork } = await import("./claw-cafe-events");
  void ingestCafeEventFromWork(kind, payload);

  return row;
}

export async function listWorkXpEvents(limit = 25): Promise<WorkXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
