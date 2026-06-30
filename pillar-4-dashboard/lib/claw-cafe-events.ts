import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAscensionState,
  type AscensionAffinities,
  type AscensionMilestones,
  type CafeTitleStyle,
} from "./claw-cafe-ascension";
import { buildCafeEpithet } from "./cafe-epithet";
import { buildCafeGoLiveReport } from "./cafe-go-live";
import { applyCafeApprovalOverlay } from "./cafe-approval-overlay";
import type { CafeCharacter, CafeCharacterState } from "./claw-cafe-spatial";
import { APP_STATION, stateForEventKind, stationForApp } from "./claw-cafe-spatial";
import { isPreviewApp } from "./claw-preview-apps";
import { readClawProfiles } from "./claw-profiles";
import { OOTB_APPS, type OotbAppId } from "./ootb-apps";
import { readUserSettings } from "./user-settings";

export type CafeEventKind =
  | "app.tour_complete"
  | "app.go_live"
  | "work.sequence_step"
  | "work.handoff"
  | "work.approval_pending"
  | "creator.publish"
  | "creator.approval_pending"
  | "capital.rule_armed"
  | "capital.rule_fired"
  | "capital.approval_pending"
  | "forge.claw_minted"
  | "forge.framework_provisioned"
  | "forge.import_completed"
  | "forge.claw_archived"
  | "forge.desk_activity"
  | "swarm.dispatch"
  | "swarm.handoff"
  | "swarm.rebalance"
  | "vital.wearable_sync"
  | "vital.report_ingested"
  | "vital.protocol_updated"
  | "vital.context_published"
  | "kin.profile_updated"
  | "kin.handoff"
  | "shop.order_ingested"
  | "shop.channel_sync"
  | "signal.knowledge_pushed"
  | "signal.context_synced"
  | "streak.day"
  | "cross_claw.handshake"
  | "os.go_live_failed"
  | "os.ota_available"
  | "os.eno2_down";

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

import { curxorDataPath } from "./curxor-data-dir";

function storePath(): string {
  return curxorDataPath("cafe-state.json");
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
    kind === "forge.framework_provisioned" ||
    kind.includes("vital") ||
    kind.includes("kin") ||
    kind.includes("signal")
  ) {
    next.knowledgeEvent = true;
  }
  if (
    kind === "capital.rule_fired" ||
    kind === "capital.rule_armed" ||
    kind === "work.sequence_step" ||
    kind === "swarm.dispatch" ||
    kind === "app.go_live" ||
    kind.includes("shop")
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
    const preview =
      isPreviewApp(app.id) &&
      app.id !== "robotaxi-fleet-manager";
    chars.push({
      id: `char-${app.id}`,
      label: app.short,
      appId: app.id,
      station: preview ? "couch" : stationForApp(app.id),
      state: "idle",
      bubble: preview ? "Preview" : null,
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

export async function readCafeStateMetrics(): Promise<{
  eventCount: number;
  ascensionXp: number;
  characterCount: number;
}> {
  const state = await readState();
  return {
    eventCount: state.events.length,
    ascensionXp: state.ascensionXp,
    characterCount: state.characters.length,
  };
}

export async function buildCafeAscensionBootstrap(options?: { autoSync?: boolean }) {
  if (options?.autoSync !== false) {
    await syncCafeEventSources();
  }

  const settings = await readUserSettings();
  const state = await readState();
  const titleStyle: CafeTitleStyle = settings.appearance.cafeTitleStyle ?? "mythic";
  const optOut = Boolean(settings.appearance.workGamificationOptOut);

  let characters = state.characters;
  if (characters.length === 0) {
    characters = await defaultCharacters();
  }
  if (!optOut) {
    try {
      characters = await applyCafeApprovalOverlay(characters);
    } catch {
      // overlay is optional — keep base characters
    }
  }

  const ascension = buildAscensionState({
    ascensionXp: state.ascensionXp,
    affinities: state.affinities,
    milestones: state.milestones,
    titleStyle,
  });

  const epithet = buildCafeEpithet({
    experienceLevel: settings.appearance.experienceLevel ?? "beginner",
    workGrowthLevel: settings.appearance.workGrowthLevel,
    creatorGrowthLevel: settings.appearance.creatorGrowthLevel,
    capitalGrowthLevel: settings.appearance.capitalGrowthLevel,
  });

  const goLive = await buildCafeGoLiveReport();
  const bridgeLinked = settings.buildPlane?.linkStatus === "linked";
  const builderBridgeLinked = bridgeLinked;

  return {
    ok: true as const,
    optOut,
    ascension,
    epithet,
    bridgeLinked,
    builderBridgeLinked,
    goLive,
    demoReady: goLive.demoReady,
    events: optOut ? [] : state.events.slice(0, 15),
    characters: optOut ? [] : characters,
    lastRoomPulseAt: optOut ? null : state.lastRoomPulseAt,
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
  if (kind === "approval_pending") {
    return {
      kind: "work.approval_pending",
      appId: "my-work",
      xp: { ascension: 4, wealth: 2 },
      bubble: "Needs OK · send",
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

function mapCreatorXpToCafe(
  kind: string,
  payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  const appId = typeof payload.appId === "string" ? payload.appId : "my-content-creator";
  const channel = typeof payload.channel === "string" ? payload.channel : "channel";
  const platform = typeof payload.platform === "string" ? payload.platform : "";

  if (kind === "post_published") {
    return {
      kind: "creator.publish",
      appId,
      xp: { ascension: 18, knowledge: 12 },
      bubble: platform ? `Published · ${platform}` : "Published to bridge",
    };
  }
  if (kind === "post_scheduled") {
    return {
      kind: "creator.publish",
      appId,
      xp: { ascension: 10, knowledge: 8 },
      bubble: `Scheduled · ${channel}`,
    };
  }
  if (kind === "go_live_demo_ready") {
    return {
      kind: "app.go_live",
      appId,
      xp: { ascension: 28, knowledge: 15 },
      bubble: "Creator Go Live milestone",
    };
  }
  if (kind === "demo_tour_complete") {
    return {
      kind: "app.tour_complete",
      appId,
      xp: { ascension: 22, knowledge: 12 },
      bubble: "Creator demo tour complete",
    };
  }
  if (kind === "post_approval_pending" || kind === "reply_approval_pending") {
    return {
      kind: "creator.approval_pending",
      appId,
      xp: { ascension: 4, knowledge: 2 },
      bubble: kind === "reply_approval_pending" ? "Needs OK · reply" : "Needs OK · post",
    };
  }
  return null;
}

function mapCapitalXpToCafe(
  kind: string,
  payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  const appId = typeof payload.appId === "string" ? payload.appId : "my-capital";
  const asset = typeof payload.asset === "string" ? payload.asset : "ticker";
  const ruleId = typeof payload.ruleId === "string" ? payload.ruleId : "";

  if (kind === "rule_armed") {
    return {
      kind: "capital.rule_armed",
      appId,
      xp: { ascension: 12, wealth: 8 },
      bubble: ruleId ? `Rule armed · ${asset}` : `Rule armed · ${asset}`,
    };
  }
  if (kind === "rule_fired") {
    return {
      kind: "capital.rule_fired",
      appId,
      xp: { ascension: 20, wealth: 15 },
      bubble: `Rule fired · ${asset}`,
    };
  }
  if (kind === "go_live_demo_ready") {
    return {
      kind: "app.go_live",
      appId,
      xp: { ascension: 30, wealth: 18 },
      bubble: "Capital Go Live milestone",
    };
  }
  if (kind === "demo_tour_complete") {
    return {
      kind: "app.tour_complete",
      appId,
      xp: { ascension: 25, wealth: 12 },
      bubble: "Capital demo tour complete",
    };
  }
  if (kind === "trade_pending_approval") {
    return {
      kind: "capital.approval_pending",
      appId,
      xp: { ascension: 4, wealth: 2 },
      bubble: `Needs OK · ${asset}`,
    };
  }
  return null;
}

function mapVitalXpToCafe(
  kind: string,
  _payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  if (kind === "wearable_sync") {
    return { kind: "vital.wearable_sync", appId: "my-vital", xp: { ascension: 8, knowledge: 5 }, bubble: "Wearables synced" };
  }
  if (kind === "report_ingested") {
    return { kind: "vital.report_ingested", appId: "my-vital", xp: { ascension: 10, knowledge: 8 }, bubble: "Report in vault" };
  }
  if (kind === "protocol_updated") {
    return { kind: "vital.protocol_updated", appId: "my-vital", xp: { ascension: 12, knowledge: 10 }, bubble: "Protocol updated" };
  }
  if (kind === "context_published") {
    return { kind: "vital.context_published", appId: "my-vital", xp: { ascension: 6, knowledge: 4 }, bubble: "Health context pushed" };
  }
  return null;
}

function mapKinXpToCafe(
  kind: string,
  payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  const name = typeof payload.displayName === "string" ? payload.displayName : "member";
  if (kind === "profile_updated") {
    return { kind: "kin.profile_updated", appId: "my-family", xp: { ascension: 8, knowledge: 6 }, bubble: `Kin · ${name}` };
  }
  if (kind === "handoff" || kind === "context_synced") {
    return {
      kind: "kin.handoff",
      appId: "my-family",
      xp: { ascension: 10, knowledge: 8 },
      bubble: kind === "handoff" ? "Family handoff" : "Kin context synced",
    };
  }
  return null;
}

function mapShopXpToCafe(
  kind: string,
  payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  const channel = typeof payload.channel === "string" ? payload.channel : "channel";
  if (kind === "order_ingested") {
    return { kind: "shop.order_ingested", appId: "my-shop", xp: { ascension: 10, wealth: 8 }, bubble: "Order ingested" };
  }
  if (kind === "channel_sync" || kind === "desk_activated") {
    return {
      kind: "shop.channel_sync",
      appId: "my-shop",
      xp: { ascension: 8, wealth: 5 },
      bubble: kind === "desk_activated" ? "Desk activated" : `Sync · ${channel}`,
    };
  }
  return null;
}

function mapSignalXpToCafe(
  kind: string,
  _payload: Record<string, unknown>,
): Omit<Parameters<typeof ingestCafeEvent>[0], "sourceRef"> | null {
  if (kind === "knowledge_pushed") {
    return { kind: "signal.knowledge_pushed", appId: "tesla-optimus-engine", xp: { ascension: 10, knowledge: 8 }, bubble: "Knowledge pushed" };
  }
  if (kind === "context_synced") {
    return { kind: "signal.context_synced", appId: "tesla-optimus-engine", xp: { ascension: 6, knowledge: 4 }, bubble: "Context synced" };
  }
  if (kind === "routine_armed") {
    return { kind: "signal.knowledge_pushed", appId: "tesla-optimus-engine", xp: { ascension: 8, knowledge: 6 }, bubble: "Routine armed" };
  }
  return null;
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

  const { listCreatorXpEvents } = await import("./creator-xp-events");
  for (const row of await listCreatorXpEvents(50)) {
    const mapped = mapCreatorXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `creator:${row.id}` });
  }

  const { listCapitalXpEvents } = await import("./capital-xp-events");
  for (const row of await listCapitalXpEvents(50)) {
    const mapped = mapCapitalXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `capital:${row.id}` });
  }

  const { listVitalXpEvents } = await import("./vital-xp-events");
  for (const row of await listVitalXpEvents(50)) {
    const mapped = mapVitalXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `vital:${row.id}` });
  }

  const { listKinXpEvents } = await import("./kin-xp-events");
  for (const row of await listKinXpEvents(50)) {
    const mapped = mapKinXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `kin:${row.id}` });
  }

  const { listShopXpEvents } = await import("./shop-xp-events");
  for (const row of await listShopXpEvents(50)) {
    const mapped = mapShopXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `shop:${row.id}` });
  }

  const { listSignalXpEvents } = await import("./signal-xp-events");
  for (const row of await listSignalXpEvents(50)) {
    const mapped = mapSignalXpToCafe(row.kind, row.payload);
    if (!mapped) continue;
    await append({ ...mapped, sourceRef: `signal:${row.id}` });
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

export async function ingestCafeEventFromCreator(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapCreatorXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `creator-live:${kind}:${Date.now()}` });
}

export async function ingestCafeEventFromCapital(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapCapitalXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `capital-live:${kind}:${Date.now()}` });
}

export async function ingestCafeEventFromVital(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapVitalXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `vital-live:${kind}:${Date.now()}` });
}

export async function ingestCafeEventFromKin(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapKinXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `kin-live:${kind}:${Date.now()}` });
}

export async function ingestCafeEventFromShop(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapShopXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `shop-live:${kind}:${Date.now()}` });
}

export async function ingestCafeEventFromSignal(
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const mapped = mapSignalXpToCafe(kind, payload);
  if (!mapped) return;
  await ingestCafeEvent({ ...mapped, sourceRef: `signal-live:${kind}:${Date.now()}` });
}

/** Forged desk actions → cafe room (work / creator / capital templates). */
export async function ingestForgedDeskCafeEvent(input: {
  forgedAppId: string;
  deskLabel: string;
  action: "send_sequence_step" | "schedule_post" | "arm_rule";
  detail?: string;
  asset?: string;
}): Promise<void> {
  const label = input.deskLabel.slice(0, 16);
  if (input.action === "send_sequence_step") {
    await ingestCafeEvent({
      kind: "work.sequence_step",
      appId: input.forgedAppId,
      xp: { ascension: 10, wealth: 6 },
      bubble: input.detail ?? "Forged desk · sequence step",
      sourceRef: `forged-live:work:${input.forgedAppId}:${Date.now()}`,
      label,
    });
    return;
  }
  if (input.action === "schedule_post") {
    await ingestCafeEvent({
      kind: "creator.publish",
      appId: input.forgedAppId,
      xp: { ascension: 10, knowledge: 8 },
      bubble: input.detail ?? "Forged desk · post scheduled",
      sourceRef: `forged-live:creator:${input.forgedAppId}:${Date.now()}`,
      label,
    });
    return;
  }
  await ingestCafeEvent({
    kind: "capital.rule_armed",
    appId: input.forgedAppId,
    xp: { ascension: 12, wealth: 8 },
    bubble: input.detail ?? `Forged desk · rule armed${input.asset ? ` · ${input.asset}` : ""}`,
    sourceRef: `forged-live:capital:${input.forgedAppId}:${Date.now()}`,
    label,
  });
}

/** Daily forged-app use → ascension (not only mint/archive). */
export async function ingestForgedDeskActivity(input: {
  forgedAppId: string;
  deskLabel: string;
  detail?: string;
}): Promise<void> {
  await ingestCafeEvent({
    kind: "forge.desk_activity",
    appId: input.forgedAppId,
    xp: { ascension: 6, knowledge: 3 },
    bubble: input.detail ?? "Forged desk activity",
    sourceRef: `forged-activity:${input.forgedAppId}:${Date.now()}`,
    label: input.deskLabel.slice(0, 16),
  });
}
