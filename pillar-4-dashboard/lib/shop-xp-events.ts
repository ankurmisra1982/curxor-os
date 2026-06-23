import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ShopXpEventKind = "order_ingested" | "channel_sync" | "desk_activated";

export interface ShopXpEvent {
  id: string;
  kind: ShopXpEventKind;
  at: string;
  payload: Record<string, unknown>;
}

import { curxorDataPath } from "./curxor-data-dir";

function xpPath(): string {
  return curxorDataPath("shop-xp-events.json");
}

async function readEvents(): Promise<ShopXpEvent[]> {
  try {
    const raw = await readFile(xpPath(), "utf8");
    const parsed = JSON.parse(raw) as { events?: ShopXpEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function emitShopXpEvent(
  kind: ShopXpEventKind,
  payload: Record<string, unknown> = {},
): Promise<ShopXpEvent | null> {
  const { readUserSettings } = await import("./user-settings");
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const events = await readEvents();
  const row: ShopXpEvent = {
    id: `SHP-${String(events.length + 1).padStart(4, "0")}`,
    kind,
    at: new Date().toISOString(),
    payload,
  };
  events.unshift(row);
  const filePath = xpPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ events: events.slice(0, 200) }, null, 2)}\n`, "utf8");

  const { ingestCafeEventFromShop } = await import("./claw-cafe-events");
  void ingestCafeEventFromShop(kind, payload);

  return row;
}

export async function listShopXpEvents(limit = 25): Promise<ShopXpEvent[]> {
  return (await readEvents()).slice(0, limit);
}
