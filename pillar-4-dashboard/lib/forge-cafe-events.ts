import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ForgeProvisioningMode } from "./forge-provisioning";

export type ForgeCafeEventKind =
  | "forge.claw_minted"
  | "forge.framework_provisioned"
  | "forge.import_completed"
  | "forge.claw_archived";

export interface ForgeCafeEvent {
  id: string;
  kind: ForgeCafeEventKind;
  mode: ForgeProvisioningMode;
  name: string;
  appId: string | null;
  forgedSlug: string | null;
  templateId: string | null;
  at: string;
}

export function getForgeCafeEventsPath(): string {
  return process.env.CURXOR_FORGE_CAFE_EVENTS_PATH ?? "/etc/curxor/forge-cafe-events.json";
}

function devQaEventsPath(): string {
  return path.join(process.cwd(), "scripts", "dev-qa", "forge-cafe-events.json");
}

async function readEventsFile(filePath: string): Promise<ForgeCafeEvent[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as { events?: ForgeCafeEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

async function appendEvent(event: ForgeCafeEvent): Promise<void> {
  const primary = getForgeCafeEventsPath();
  const paths = [primary, devQaEventsPath()];

  for (const filePath of paths) {
    try {
      const events = await readEventsFile(filePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(
        filePath,
        `${JSON.stringify({ events: [...events, event] }, null, 2)}\n`,
        { mode: 0o640 },
      );
    } catch {
      /* dev path may be read-only in prod — best effort */
    }
  }
}

function eventKindForMode(mode: ForgeProvisioningMode): ForgeCafeEventKind {
  if (mode === "framework") return "forge.framework_provisioned";
  if (mode === "imported") return "forge.import_completed";
  return "forge.claw_minted";
}

export interface EmitForgeCafeEventInput {
  mode: ForgeProvisioningMode;
  name: string;
  appId?: string | null;
  forgedSlug?: string | null;
  templateId?: string | null;
}

export async function emitForgeCafeEvent(input: EmitForgeCafeEventInput): Promise<ForgeCafeEvent> {
  const event: ForgeCafeEvent = {
    id: `forge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: eventKindForMode(input.mode),
    mode: input.mode,
    name: input.name,
    appId: input.appId ?? null,
    forgedSlug: input.forgedSlug ?? null,
    templateId: input.templateId ?? null,
    at: new Date().toISOString(),
  };
  await appendEvent(event);

  const cafeAppId = input.appId?.trim() || "claw-forge";
  const { ingestCafeEvent } = await import("./claw-cafe-events");
  await ingestCafeEvent({
    kind: event.kind,
    appId: cafeAppId,
    xp: { ascension: 25, knowledge: 15 },
    bubble: `${event.name} entered the room`,
    sourceRef: `forge:${event.id}`,
    label: event.name,
  });

  return event;
}

export async function emitForgeCafeArchivedEvent(input: {
  name: string;
  appId: string;
  forgedSlug?: string | null;
}): Promise<ForgeCafeEvent> {
  const event: ForgeCafeEvent = {
    id: `forge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "forge.claw_archived",
    mode: "island",
    name: input.name,
    appId: input.appId,
    forgedSlug: input.forgedSlug ?? null,
    templateId: null,
    at: new Date().toISOString(),
  };
  await appendEvent(event);

  const { ingestCafeEvent } = await import("./claw-cafe-events");
  await ingestCafeEvent({
    kind: "forge.claw_archived",
    appId: input.appId,
    xp: { ascension: 5 },
    bubble: `${input.name} left the room`,
    sourceRef: `forge:${event.id}`,
    label: input.name,
  });

  return event;
}

export async function readForgeCafeEvents(limit = 50): Promise<ForgeCafeEvent[]> {
  const primary = await readEventsFile(getForgeCafeEventsPath());
  if (primary.length > 0) return primary.slice(-limit);
  return (await readEventsFile(devQaEventsPath())).slice(-limit);
}
