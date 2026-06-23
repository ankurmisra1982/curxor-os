import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAscensionState,
  type AscensionAffinities,
  type AscensionMilestones,
  type CafeTitleStyle,
} from "./claw-cafe-ascension";
import type { CafeCharacter, CafeCharacterState } from "./claw-cafe-spatial";
import { APP_STATION, stateForEventKind, stationForApp } from "./claw-cafe-spatial";
import { readClawProfiles } from "./claw-profiles";
import { OOTB_APPS, type OotbAppId } from "./ootb-apps";
import { readUserSettings } from "./user-settings";

export type CafeEventKind =
  | "app.tour_complete"
  | "app.go_live"
  | "work.sequence_step"
  | "work.handoff"
  | "creator.publish"
  | "capital.rule_fired"
  | "forge.claw_minted"
  | "forge.framework_provisioned"
  | "forge.import_completed"
  | "forge.claw_archived"
  | "swarm.dispatch"
  | "swarm.handoff"
  | "swarm.rebalance"
  | "streak.day"
  | "cross_claw.handshake";

export interface CafeEventXp {
  ascension: number;
  knowledge?: number;
  wealth?: number;
}

export interface CafeEvent {
  id: string;
  kind: CafeEventKind;
  appId: string;
  at: string;
  xp: CafeEventXp;
  bubble?: string;
  sourceRef?: string;
}

interface CafeStateFile {
  events: CafeEvent[];
  ascensionXp: number;
  affinities: AscensionAffinities;
  milestones: AscensionMilestones;
  characters: CafeCharacter[];
  lastRoomPulseAt: string | null;
}

function storePath(): string {
  const base = process.env.CURXOR_DEV_QA_DIR ?? path.join(process.cwd(), "scripts", "dev-qa");
  return path.join(base, "cafe-state.json");
}

const DEFAULT_MILESTONES: AscensionMilestones = {
  knowledgeEvent: false,
  wealthEvent: false,
  crossClawHandshake: false,
  forgeMint: false,
};

function emptyState(): CafeStateFile {
  return {
    events: [],
    ascensionXp: 0,
    affinities: { knowledge: 0, wealth: 0 },
    milestones: { ...DEFAULT_MILESTONES },
    characters: [],
    lastRoomPulseAt: null,
  };
}

async function readState(): Promise<CafeStateFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CafeStateFile>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      ascensionXp: typeof parsed.ascensionXp === "number" ? parsed.ascensionXp : 0,
      affinities: parsed.affinities ?? { knowledge: 0, wealth: 0 },
      milestones: parsed.milestones ?? { ...DEFAULT_MILESTONES },
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      lastRoomPulseAt: typeof parsed.lastRoomPulseAt === "string" ? parsed.lastRoomPulseAt : null,
    };
  } catch {
    return emptyState();
  }
}

async function writeState(state: CafeStateFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function applyMilestone(kind: CafeEventKind, milestones: AscensionMilestones): AscensionMilestones {
  const next = { ...milestones };
  if (
    kind === "creator.publish" ||
    kind === "app.tour_complete" ||
    kind === "forge.framework_provisioned"
  ) {
    next.knowledgeEvent = true;
  }
  if (
    kind === "capital.rule_fired" ||
    kind === "work.sequence_step" ||
    kind === "swarm.dispatch" ||
    kind === "app.go_live"
  ) {
    next.wealthEvent = true;
  }
  if (kind === "cross_claw.handshake" || kind === "swarm.handoff" || kind === "work.handoff") {
    next.crossClawHandshake = true;
  }
  if (
    kind === "forge.claw_minted" ||
    kind === "forge.import_completed" ||
    kind === "forge.framework_provisioned"
  ) {
    next.forgeMint = true;
  }
  return next;
}

function updateCharacter(
  characters: CafeCharacter[],
  appId: string,
  label: string,
  kind: CafeEventKind,
  bubble?: string,
): CafeCharacter[] {
  const station = stationForApp(appId);
  const state: CafeCharacterState = stateForEventKind(kind);
  const at = new Date().toISOString();
  const existing = characters.find((c) => c.appId === appId);
  const row: CafeCharacter = {
    id: existing?.id ?? `char-${appId}`,
    label,
    appId,
    station,
    state,
    bubble: bubble ?? existing?.bubble ?? null,
    lastEventAt: at,
  };
  const rest = characters.filter((c) => c.appId !== appId);
  return [...rest, row];
}

async function defaultCharacters(): Promise<CafeCharacter[]> {
  const settings = await readUserSettings();
  const profiles = await readClawProfiles();
  const chars: CafeCharacter[] = [];

  for (const app of OOTB_APPS) {
    if (!settings.selectedApps.includes(app.id as OotbAppId)) continue;
    if (app.id === "claw-cafe") continue;
    chars.push({
      id: `char-${app.id}`,
      label: app.short,
      appId: app.id,
      station: stationForApp(app.id),
      state: "idle",
      bubble: null,
      lastEventAt: null,
    });
  }

  for (const profile of profiles.claws.slice(0, 4)) {
    chars.push({
      id: `char-${profile.id}`,
      label: profile.name.slice(0, 16),
      appId: profile.id,
      station: APP_STATION["claw-forge"],
      state: "idle",
      bubble: null,
      lastEventAt: null,
    });
  }

  return chars;
}

export async function ingestCafeEvent(input: {
  kind: CafeEventKind;
  appId: string;
  xp: CafeEventXp;
  bubble?: string;
  sourceRef?: string;
  label?: string;
}): Promise<CafeEvent | null> {
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return null;

  const state = await readState();
  const event: CafeEvent = {
    id: `CAFE-${String(state.events.length + 1).padStart(5, "0")}`,
    kind: input.kind,
    appId: input.appId,
    at: new Date().toISOString(),
    xp: input.xp,
    bubble: input.bubble,
    sourceRef: input.sourceRef,
  };

  state.events.unshift(event);
  state.events = state.events.slice(0, 300);
  state.ascensionXp += input.xp.ascension;
  state.affinities = {
    knowledge: state.affinities.knowledge + (input.xp.knowledge ?? 0),
    wealth: state.affinities.wealth + (input.xp.wealth ?? 0),
  };
  state.milestones = applyMilestone(input.kind, state.milestones);
  state.lastRoomPulseAt = event.at;

  const label =
    input.label ??
    OOTB_APPS.find((a) => a.id === input.appId)?.short ??
    input.appId.slice(0, 12);
  const baseChars = state.characters.length > 0 ? state.characters : await defaultCharacters();
  state.characters = updateCharacter(baseChars, input.appId, label, input.kind, input.bubble);

  await writeState(state);
  return event;
}

export async function listCafeEvents(limit = 25): Promise<CafeEvent[]> {
  return (await readState()).events.slice(0, limit);
}

export async function buildCafeAscensionBootstrap() {
  const settings = await readUserSettings();
  const state = await readState();
  const titleStyle: CafeTitleStyle = settings.appearance.cafeTitleStyle ?? "mythic";
  const optOut = Boolean(settings.appearance.workGamificationOptOut);

  let characters = state.characters;
  if (characters.length === 0) {
    characters = await defaultCharacters();
  }

  const ascension = buildAscensionState({
    ascensionXp: state.ascensionXp,
    affinities: state.affinities,
    milestones: state.milestones,
    titleStyle,
  });

  return {
    ok: true as const,
    optOut,
    ascension,
    events: optOut ? [] : state.events.slice(0, 15),
    characters,
    lastRoomPulseAt: state.lastRoomPulseAt,
    titleStyle,
  };
}

function mapWorkXpToCafe(
  kind: string,
  payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  if (kind === "handoff_received") {
    return {
      kind: "cross_claw.handshake",
      appId: "my-work",
      xp: { ascension: 20, knowledge: 5, wealth: 10 },
      bubble: "Handshake across Claws",
    };
  }
  if (kind === "sequence_activated") {
    return {
      kind: "work.sequence_step",
      appId: "my-work",
      xp: { ascension: 12, wealth: 8 },
      bubble: "Sequence step sent",
    };
  }
  if (kind === "create_lead" || kind === "draft_reply") {
    return {
      kind: "work.sequence_step",
      appId: "my-work",
      xp: { ascension: 8, wealth: 5 },
      bubble: "Pipeline activity",
    };
  }
  if (kind === "go_live_demo_ready") {
    return {
      kind: "app.go_live",
      appId: String(payload.source ?? "my-work"),
      xp: { ascension: 30, wealth: 15 },
      bubble: "Go Live milestone",
    };
  }
  return {
    kind: "work.sequence_step",
    appId: "my-work",
    xp: { ascension: 5 },
    bubble: kind.replace(/_/g, " "),
  };
}

function mapSwarmXpToCafe(
  kind: string,
  payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  if (kind === "handoff_received") {
    return {
      kind: "swarm.handoff",
      appId: "robotaxi-fleet-manager",
      xp: { ascension: 18, wealth: 8 },
      bubble: `Handoff from ${String(payload.source ?? "Claw")}`,
    };
  }
  if (kind === "dispatch_completed" || kind === "workload_assigned") {
    return {
      kind: "swarm.dispatch",
      appId: "robotaxi-fleet-manager",
      xp: { ascension: 15, wealth: 10 },
      bubble: "Fleet dispatch",
    };
  }
  if (kind === "rebalance") {
    return {
      kind: "swarm.rebalance",
      appId: "robotaxi-fleet-manager",
      xp: { ascension: 10, wealth: 5 },
      bubble: "Swarm rebalanced",
    };
  }
  if (kind === "exit_demo_ready" || kind === "fleet_milestone") {
    return {
      kind: "cross_claw.handshake",
      appId: "robotaxi-fleet-manager",
      xp: { ascension: 25, knowledge: 10, wealth: 10 },
      bubble: "Fleet milestone",
    };
  }
  return {
    kind: "swarm.dispatch",
    appId: "robotaxi-fleet-manager",
    xp: { ascension: 6 },
    bubble: kind.replace(/_/g, " "),
  };
}

/** Pull un-synced work / swarm / forge rows into unified cafe ledger (single write). */
export async function syncCafeEventSources(): Promise<{ ingested: number }> {
  const settings = await readUserSettings();
  if (settings.appearance.workGamificationOptOut) return { ingested: 0 };

  const state = await readState();
  const seen = new Set(state.events.map((e) => e.sourceRef).filter(Boolean) as string[]);
  let ingested = 0;
  let nextId = state.events.length + 1;

  const append = async (
    input: Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> & { sourceRef: string },
  ) => {
    if (seen.has(input.sourceRef)) return;
    const event: CafeEvent = {
      id: `CAFE-${String(nextId++).padStart(5, "0")}`,
      kind: input.kind,
      appId: input.appId,
      at: new Date().toISOString(),
      xp: input.xp,
      bubble: input.bubble,
      sourceRef: input.sourceRef,
    };
    state.events.unshift(event);
    state.ascensionXp += input.xp.ascension;
    state.affinities = {
      knowledge: state.affinities.knowledge + (input.xp.knowledge ?? 0),
      wealth: state.affinities.wealth + (input.xp.wealth ?? 0),
    };
    state.milestones = applyMilestone(input.kind, state.milestones);
    state.lastRoomPulseAt = event.at;
    const label =
      input.label ??
      OOTB_APPS.find((a) => a.id === input.appId)?.short ??
      input.appId.slice(0, 12);
    const baseChars = state.characters.length > 0 ? state.characters : await defaultCharacters();
    state.characters = updateCharacter(baseChars, input.appId, label, input.kind, input.bubble);
    seen.add(input.sourceRef);
    ingested++;
  };

  const { listWorkXpEvents } = await import("./work-xp-events");
  for (const row of await listWorkXpEvents(50)) {
    const mapped = mapWorkXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `work:${row.id}` });
  }

  const { listSwarmXpEvents } = await import("./swarm-xp-events");
  for (const row of await listSwarmXpEvents(50)) {
    const mapped = mapSwarmXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `swarm:${row.id}` });
  }

  const { readForgeCafeEvents } = await import("./forge-cafe-events");
  for (const row of await readForgeCafeEvents(50)) {
    const cafeAppId = row.appId?.trim() || "claw-forge";
    await append({
      kind: row.kind,
      appId: cafeAppId,
      xp: row.kind === "forge.claw_archived" ? { ascension: 5 } : { ascension: 25, knowledge: 15 },
      bubble:
        row.kind === "forge.claw_archived"
          ? `${row.name} left the room`
          : `${row.name} entered the room`,
      sourceRef: `forge:${row.id}`,
      label: row.name,
    });
  }

  if (ingested > 0) {
    state.events = state.events.slice(0, 300);
    await writeState(state);
  }

  return { ingested };
}

export async function ingestCafeEventFromWork(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapWorkXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `work-live:${kind}:${Date.now()}` });
}

export async function ingestCafeEventFromSwarm(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapSwarmXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `swarm-live:${kind}:${Date.now()}` });
}
