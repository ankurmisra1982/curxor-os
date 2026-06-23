import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { publishClawContext } from "./claw-context-store";
import { listFamilyProfiles } from "./family-profiles";
import type {
  HouseRule,
  HumanoidHubFile,
  HumanoidHubStatus,
  HumanoidReadinessReport,
  HumanoidRelationship,
  HumanoidRoutine,
  HumanoidUnit,
  KinRobotPolicy,
  KinRobotTone,
  RobotKind,
  SetupStepId,
} from "./humanoid-hub-types";
import { FLEET_UNIT_LIMIT, ROBOT_KIND_META } from "./humanoid-fleet-meta";
import {
  kinPolicyViews,
  loadFamilyMembersForPolicies,
  mergeKinPolicies,
  isKinRobotTone,
} from "./humanoid-kin-policy";
import { syncFamilyContextToMesh } from "./claw-context-service";

const DEFAULT_ROUTINES: Omit<HumanoidRoutine, "enabled">[] = [
  {
    id: "morning-welcome",
    label: "Morning welcome",
    description: "Greet household members by name with today's Vital snapshot when shared.",
    trigger: "First motion after 6am",
    previewOnly: true,
  },
  {
    id: "guest-arrival",
    label: "Guest arrival",
    description: "Switch to guest tone from Kin profiles — offer coat rack and beverage preference.",
    trigger: "Door signal or Kin guest profile",
    previewOnly: true,
  },
  {
    id: "quiet-hours",
    label: "Quiet hours",
    description: "Lower voice, dim status lights, defer non-urgent Claw alerts.",
    trigger: "10pm – 7am local",
    previewOnly: true,
  },
  {
    id: "help-handoff",
    label: "Help handoff",
    description: "When unsure, ask the operator before physical action — safety first.",
    trigger: "Low confidence gesture",
    previewOnly: true,
  },
];

function hubPath(): string {
  return process.env.CURXOR_HUMANOID_HUB_PATH ?? "/etc/curxor/humanoid-hub.json";
}

function defaultRelationship(): HumanoidRelationship {
  return {
    callName: "Operator",
    tone: "warm",
    guestModeEnabled: true,
    introScript: "I'm your home humanoid — I learn from Kin, Vital, and your house rules on this appliance.",
  };
}

function defaultUnit(
  config?: { unitId?: string; safetyProfile?: string; kind?: RobotKind },
  overrides?: Partial<HumanoidUnit>,
): HumanoidUnit {
  const kind = config?.kind ?? overrides?.kind ?? "humanoid";
  const meta = ROBOT_KIND_META[kind];
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    kind,
    displayName: config?.unitId?.trim() || overrides?.displayName || meta.defaultName,
    vendorLabel: overrides?.vendorLabel ?? meta.vendorLabel,
    status: overrides?.status ?? "learning",
    safetyProfile: config?.safetyProfile ?? overrides?.safetyProfile ?? "standard",
    pairedAt: overrides?.pairedAt ?? null,
    meshNodeId: overrides?.meshNodeId ?? null,
    discoverName: overrides?.discoverName ?? null,
    createdAt: now,
  };
}

async function readHubFile(): Promise<HumanoidHubFile> {
  try {
    const raw = await readFile(hubPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<HumanoidHubFile>;
    return normalizeHub(parsed);
  } catch {
    return normalizeHub({});
  }
}

function normalizeHub(parsed: Partial<HumanoidHubFile>): HumanoidHubFile {
  const routines =
    Array.isArray(parsed.routines) && parsed.routines.length > 0
      ? parsed.routines
      : DEFAULT_ROUTINES.map((r) => ({ ...r, enabled: r.id === "help-handoff", source: "template" as const }));

  return {
    version: 1,
    primaryUnitId: typeof parsed.primaryUnitId === "string" ? parsed.primaryUnitId : null,
    units: Array.isArray(parsed.units)
      ? parsed.units.map((raw) => {
          const u = raw as Partial<HumanoidUnit>;
          const kind = (u.kind ?? "humanoid") as RobotKind;
          return {
            id: String(u.id ?? randomUUID()),
            kind,
            displayName: String(u.displayName ?? ROBOT_KIND_META[kind].defaultName),
            vendorLabel: String(u.vendorLabel ?? ROBOT_KIND_META[kind].vendorLabel),
            status: (u.status ?? "awaiting_pair") as HumanoidUnit["status"],
            safetyProfile: String(u.safetyProfile ?? "standard"),
            pairedAt: typeof u.pairedAt === "string" ? u.pairedAt : null,
            meshNodeId: typeof u.meshNodeId === "string" ? u.meshNodeId : null,
            discoverName: typeof u.discoverName === "string" ? u.discoverName : null,
            createdAt: typeof u.createdAt === "string" ? u.createdAt : new Date().toISOString(),
          };
        })
      : [],
    relationship: { ...defaultRelationship(), ...(parsed.relationship ?? {}) },
    houseRules: Array.isArray(parsed.houseRules) ? parsed.houseRules : [],
    kinPolicies: Array.isArray(parsed.kinPolicies) ? parsed.kinPolicies : [],
    routines,
    setupCompleted: Array.isArray(parsed.setupCompleted) ? parsed.setupCompleted : [],
    lastKnowledgeSyncAt: typeof parsed.lastKnowledgeSyncAt === "string" ? parsed.lastKnowledgeSyncAt : null,
    notifyWhenLive: parsed.notifyWhenLive === true,
    pairWizard: parsed.pairWizard ?? null,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
  };
}

async function writeHubFile(data: HumanoidHubFile): Promise<void> {
  const filePath = hubPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

async function ensurePrimaryUnit(
  hub: HumanoidHubFile,
  freConfig?: { unitId?: string; safetyProfile?: string },
): Promise<HumanoidHubFile> {
  if (hub.units.length === 0) {
    const unit = defaultUnit(freConfig);
    hub.units = [unit];
    hub.primaryUnitId = unit.id;
    await writeHubFile(hub);
    return hub;
  }
  if (!hub.primaryUnitId) {
    hub.primaryUnitId = hub.units[0]!.id;
    await writeHubFile(hub);
  }
  return hub;
}

async function ensureKinPolicies(hub: HumanoidHubFile): Promise<HumanoidHubFile> {
  const members = await loadFamilyMembersForPolicies();
  const merged = mergeKinPolicies(hub.kinPolicies, members);
  if (JSON.stringify(merged) !== JSON.stringify(hub.kinPolicies)) {
    hub.kinPolicies = merged;
    await writeHubFile(hub);
  }
  return hub;
}

function computeReadiness(hub: HumanoidHubFile, kinCount: number, vitalLinked: boolean): HumanoidReadinessReport {
  const steps: HumanoidReadinessReport["steps"] = [
    {
      id: "name_robot",
      label: "Name your humanoid",
      done: hub.units.some((u) => u.displayName.trim().length > 0 && u.displayName !== "Home Humanoid") ||
        hub.setupCompleted.includes("name_robot"),
      hint: "Give your future unit a name it will recognize at home.",
    },
    {
      id: "link_kin",
      label: "Link Kin profiles",
      done:
        (kinCount > 0 && hub.kinPolicies.length > 0) ||
        hub.setupCompleted.includes("link_kin"),
      hint: "Kin Claw teaches who lives here — tune per-member robot policy below.",
    },
    {
      id: "teach_rules",
      label: "Teach house rules",
      done: hub.houseRules.length > 0 || hub.setupCompleted.includes("teach_rules"),
      hint: "Essentials like shoes off, pet boundaries, quiet zones.",
    },
    {
      id: "sync_knowledge",
      label: "Push knowledge to mesh",
      done: Boolean(hub.lastKnowledgeSyncAt) || hub.setupCompleted.includes("sync_knowledge"),
      hint: "One tap packages rules + relationship for your robot memory.",
    },
    {
      id: "pair_hardware",
      label: "Pair home hardware",
      done:
        hub.units.some((u) => u.pairedAt) ||
        hub.setupCompleted.includes("pair_hardware"),
      hint: "Fleet tab · run pair-day wizard (preview handshake on appliance).",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const score = Math.round((doneCount / steps.length) * 100);

  let label = "Getting started";
  if (score >= 80) label = "Almost ready";
  else if (score >= 50) label = "Learning your home";
  else if (score >= 25) label = "Neural link forming";

  const ccpScopes: HumanoidReadinessReport["ccpScopes"] = [
    {
      scope: "family",
      label: "Kin · household",
      linked: kinCount > 0,
      detail: kinCount > 0 ? `${kinCount} member${kinCount === 1 ? "" : "s"} on mesh` : "Add profiles in Kin Claw",
    },
    {
      scope: "health",
      label: "Vital · wellness",
      linked: vitalLinked,
      detail: vitalLinked ? "Sleep & protocol shared" : "Optional — richer morning routines",
    },
    {
      scope: "hardware",
      label: "Robot · memory",
      linked: Boolean(hub.lastKnowledgeSyncAt),
      detail: hub.lastKnowledgeSyncAt
        ? `Synced ${new Date(hub.lastKnowledgeSyncAt).toLocaleString()}`
        : "Push knowledge when rules are ready",
    },
    {
      scope: "personal",
      label: "Relationship",
      linked: hub.relationship.callName.trim().length > 0,
      detail: `Calls you ${hub.relationship.callName} · ${hub.relationship.tone} tone`,
    },
  ];

  return {
    score,
    label,
    detail: "Preview neural link — your humanoid will inherit this package on pair day.",
    steps,
    ccpScopes,
  };
}

function fleetSummary(units: HumanoidUnit[]): HumanoidHubStatus["fleetSummary"] {
  const byKind: Record<RobotKind, number> = { humanoid: 0, mobile: 0, arm: 0, custom: 0 };
  for (const u of units) byKind[u.kind] += 1;
  return {
    total: units.length,
    paired: units.filter((u) => u.pairedAt).length,
    byKind,
  };
}

export async function fetchHumanoidHubStatus(freConfig?: Record<string, unknown>): Promise<HumanoidHubStatus> {
  let hub = await readHubFile();
  hub = await ensurePrimaryUnit(hub, {
    unitId: typeof freConfig?.unitId === "string" ? freConfig.unitId : undefined,
    safetyProfile: typeof freConfig?.safetyProfile === "string" ? freConfig.safetyProfile : undefined,
  });
  hub = await ensureKinPolicies(hub);

  const family = await listFamilyProfiles();
  const kinMemberCount = family.members.length;

  let vitalLinked = false;
  try {
    const { queryClawContext } = await import("./claw-context-store");
    const health = await queryClawContext({ appId: "my-vital", scopes: ["health"], limit: 1 });
    vitalLinked = health.length > 0;
  } catch {
    vitalLinked = false;
  }

  const primaryUnit = hub.units.find((u) => u.id === hub.primaryUnitId) ?? hub.units[0] ?? null;
  if (primaryUnit && typeof freConfig?.unitId === "string" && freConfig.unitId.trim()) {
    primaryUnit.displayName = freConfig.unitId.trim();
  }
  if (primaryUnit && typeof freConfig?.safetyProfile === "string") {
    primaryUnit.safetyProfile = freConfig.safetyProfile;
  }

  return {
    hub,
    primaryUnit,
    readiness: computeReadiness(hub, kinMemberCount, vitalLinked),
    kinMemberCount,
    vitalLinked,
    kinPolicies: kinPolicyViews(hub.kinPolicies, family.members),
    fleetSummary: fleetSummary(hub.units),
  };
}

export async function updateHumanoidUnit(input: {
  unitId?: string;
  displayName?: string;
  kind?: RobotKind;
  safetyProfile?: string;
  vendorLabel?: string;
}): Promise<HumanoidHubStatus> {
  const hub = await ensurePrimaryUnit(await readHubFile());
  const unit = input.unitId
    ? hub.units.find((u) => u.id === input.unitId)
    : hub.units.find((u) => u.id === hub.primaryUnitId) ?? hub.units[0];
  if (!unit) throw new Error("No unit");

  if (input.displayName?.trim()) unit.displayName = input.displayName.trim().slice(0, 48);
  if (input.kind) unit.kind = input.kind;
  if (input.safetyProfile) unit.safetyProfile = input.safetyProfile;
  if (input.vendorLabel?.trim()) unit.vendorLabel = input.vendorLabel.trim().slice(0, 64);
  unit.status = "learning";

  if (!hub.setupCompleted.includes("name_robot") && unit.displayName !== "Home Humanoid") {
    hub.setupCompleted.push("name_robot");
  }

  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function updateHumanoidRelationship(input: Partial<HumanoidRelationship>): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  hub.relationship = { ...hub.relationship, ...input };
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function addHouseRule(text: string, priority: HouseRule["priority"] = "essential"): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  const rule: HouseRule = {
    id: randomUUID(),
    text: text.trim().slice(0, 240),
    priority,
    syncedAt: null,
    createdAt: new Date().toISOString(),
  };
  hub.houseRules.unshift(rule);
  if (hub.houseRules.length > 32) hub.houseRules = hub.houseRules.slice(0, 32);
  if (!hub.setupCompleted.includes("teach_rules")) hub.setupCompleted.push("teach_rules");
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function removeHouseRule(ruleId: string): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  hub.houseRules = hub.houseRules.filter((r) => r.id !== ruleId);
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function toggleHumanoidRoutine(routineId: string, enabled: boolean): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  hub.routines = hub.routines.map((r) => (r.id === routineId ? { ...r, enabled } : r));
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function setNotifyWhenLive(notify: boolean): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  hub.notifyWhenLive = notify;
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function syncHumanoidKnowledgeToMesh(): Promise<HumanoidHubStatus> {
  const status = await fetchHumanoidHubStatus();
  const hub = status.hub;
  const unit = status.primaryUnit;
  if (!unit) throw new Error("No unit");

  await syncFamilyContextToMesh();

  const now = new Date().toISOString();
  hub.lastKnowledgeSyncAt = now;
  hub.houseRules = hub.houseRules.map((r) => ({ ...r, syncedAt: now }));
  if (!hub.setupCompleted.includes("sync_knowledge")) hub.setupCompleted.push("sync_knowledge");
  unit.status = "standby";
  await writeHubFile(hub);

  await publishClawContext("tesla-optimus-engine", {
    scope: "hardware",
    key: "humanoid.knowledge",
    payload: {
      primaryUnitId: unit.id,
      units: hub.units.map((u) => ({
        id: u.id,
        kind: u.kind,
        displayName: u.displayName,
        paired: Boolean(u.pairedAt),
        meshNodeId: u.meshNodeId,
      })),
      relationship: hub.relationship,
      houseRules: hub.houseRules.map((r) => ({ text: r.text, priority: r.priority })),
      kinPolicies: hub.kinPolicies.map((p) => ({
        memberId: p.memberId,
        tone: p.tone,
        greetByName: p.greetByName,
        allowKitchenTasks: p.allowKitchenTasks,
        allowBedroomEntry: p.allowBedroomEntry,
        requireAskBefore: p.requireAskBefore,
        notes: p.notes,
      })),
      routines: hub.routines.filter((r) => r.enabled).map((r) => ({ id: r.id, label: r.label, trigger: r.trigger })),
      syncedAt: now,
    },
    ttlSeconds: null,
  });

  await publishClawContext("tesla-optimus-engine", {
    scope: "family",
    key: "humanoid.policies",
    payload: {
      policies: status.kinPolicies.map((p) => ({
        memberId: p.memberId,
        displayName: p.displayName,
        role: p.role,
        tone: p.tone,
        greetByName: p.greetByName,
        allowKitchenTasks: p.allowKitchenTasks,
        allowBedroomEntry: p.allowBedroomEntry,
        requireAskBefore: p.requireAskBefore,
        notes: p.notes,
      })),
      syncedAt: now,
    },
    ttlSeconds: null,
  });

  await publishClawContext("tesla-optimus-engine", {
    scope: "hardware",
    key: "optimus.status",
    payload: {
      unitId: unit.displayName,
      kind: unit.kind,
      mode: "standby",
      safetyProfile: unit.safetyProfile,
      neuralLinkScore: status.readiness.score,
    },
    ttlSeconds: 3600,
  });

  return fetchHumanoidHubStatus();
}

export async function completeSetupStep(stepId: SetupStepId): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  if (!hub.setupCompleted.includes(stepId)) hub.setupCompleted.push(stepId);
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

function findUnit(hub: HumanoidHubFile, unitId: string): HumanoidUnit {
  const unit = hub.units.find((u) => u.id === unitId);
  if (!unit) throw new Error("Unit not found");
  return unit;
}

export async function addFleetUnit(input: {
  kind: RobotKind;
  displayName?: string;
  safetyProfile?: string;
}): Promise<HumanoidHubStatus> {
  const hub = await ensurePrimaryUnit(await readHubFile());
  if (hub.units.length >= FLEET_UNIT_LIMIT) throw new Error(`Fleet limit ${FLEET_UNIT_LIMIT} units`);

  const meta = ROBOT_KIND_META[input.kind];
  const unit = defaultUnit(undefined, {
    kind: input.kind,
    displayName: input.displayName?.trim() || meta.defaultName,
    vendorLabel: meta.vendorLabel,
    safetyProfile: input.safetyProfile ?? "standard",
    status: "awaiting_pair",
  });
  hub.units.push(unit);
  if (!hub.primaryUnitId) hub.primaryUnitId = unit.id;
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function removeFleetUnit(unitId: string): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  if (hub.units.length <= 1) throw new Error("Keep at least one robot slot");
  const removing = findUnit(hub, unitId);
  hub.units = hub.units.filter((u) => u.id !== unitId);
  if (hub.primaryUnitId === unitId) hub.primaryUnitId = hub.units[0]?.id ?? null;
  if (hub.pairWizard?.unitId === unitId) hub.pairWizard = null;
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function setPrimaryFleetUnit(unitId: string): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  findUnit(hub, unitId);
  hub.primaryUnitId = unitId;
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function startPairWizard(unitId: string): Promise<HumanoidHubStatus & { message: string }> {
  const hub = await readHubFile();
  const unit = findUnit(hub, unitId);
  const slug = unit.displayName.replace(/[^a-z0-9]+/gi, "-").toUpperCase().slice(0, 12);
  const discoveredNodeId = `mesh://curxor/${slug}-${unit.id.slice(0, 6).toUpperCase()}`;

  hub.pairWizard = {
    unitId,
    phase: "discover",
    stepIndex: 0,
    startedAt: new Date().toISOString(),
    discoveredNodeId,
    previewOnly: true,
  };
  unit.discoverName = `CURXOR-${slug}`;
  unit.status = "learning";
  await writeHubFile(hub);

  const status = await fetchHumanoidHubStatus();
  return { ...status, message: `Discovering ${unit.displayName} on local mesh…` };
}

export async function advancePairWizard(unitId: string): Promise<HumanoidHubStatus & { message: string }> {
  const hub = await readHubFile();
  const unit = findUnit(hub, unitId);
  if (!hub.pairWizard || hub.pairWizard.unitId !== unitId) {
    throw new Error("Start pair wizard first");
  }

  const { nextPairPhase } = await import("./humanoid-fleet-meta");
  const next = nextPairPhase(hub.pairWizard.phase);
  hub.pairWizard.phase = next;
  hub.pairWizard.stepIndex = Math.min(hub.pairWizard.stepIndex + 1, 4);

  let message = "Step complete";
  if (next === "verify_safety") message = `Safety profile ${unit.safetyProfile} confirmed locally`;
  if (next === "load_knowledge") {
    message = hub.lastKnowledgeSyncAt
      ? "Knowledge package loaded from CCP"
      : "Loading defaults — push knowledge from Home for full package";
  }
  if (next === "mesh_handshake") {
    unit.meshNodeId = hub.pairWizard.discoveredNodeId;
    message = `Motor mesh linked · ${unit.meshNodeId}`;
  }
  if (next === "complete") {
    message = "Handshake complete — confirm to finish preview pair";
  }

  await writeHubFile(hub);
  return { ...(await fetchHumanoidHubStatus()), message };
}

export async function completePairPreview(unitId: string): Promise<HumanoidHubStatus & { message: string }> {
  const hub = await readHubFile();
  const unit = findUnit(hub, unitId);
  if (!hub.pairWizard || hub.pairWizard.unitId !== unitId) {
    throw new Error("Run pair wizard through mesh handshake first");
  }
  if (hub.pairWizard.phase !== "complete" && hub.pairWizard.phase !== "mesh_handshake") {
    throw new Error("Complete wizard steps first");
  }

  const now = new Date().toISOString();
  unit.pairedAt = now;
  unit.status = "paired_preview";
  unit.meshNodeId = unit.meshNodeId ?? hub.pairWizard.discoveredNodeId;
  hub.pairWizard.phase = "complete";
  if (!hub.setupCompleted.includes("pair_hardware")) hub.setupCompleted.push("pair_hardware");
  hub.pairWizard = null;

  await publishClawContext("tesla-optimus-engine", {
    scope: "hardware",
    key: `units.${unit.id}`,
    payload: {
      displayName: unit.displayName,
      kind: unit.kind,
      meshNodeId: unit.meshNodeId,
      pairedAt: now,
      mode: "paired_preview",
      safetyProfile: unit.safetyProfile,
    },
    ttlSeconds: null,
  });

  await writeHubFile(hub);
  return {
    ...(await fetchHumanoidHubStatus()),
    message: `${unit.displayName} paired · preview mode — live motion ships with hardware validation`,
  };
}

export async function cancelPairWizard(): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  hub.pairWizard = null;
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function updateKinRobotPolicy(input: {
  memberId: string;
  tone?: KinRobotTone;
  greetByName?: boolean;
  allowKitchenTasks?: boolean;
  allowBedroomEntry?: boolean;
  requireAskBefore?: string;
  notes?: string;
}): Promise<HumanoidHubStatus> {
  let hub = await ensureKinPolicies(await readHubFile());
  const idx = hub.kinPolicies.findIndex((p) => p.memberId === input.memberId);
  if (idx < 0) throw new Error("Kin member not found");

  const current = hub.kinPolicies[idx]!;
  hub.kinPolicies[idx] = {
    ...current,
    tone: input.tone && isKinRobotTone(input.tone) ? input.tone : current.tone,
    greetByName: typeof input.greetByName === "boolean" ? input.greetByName : current.greetByName,
    allowKitchenTasks:
      typeof input.allowKitchenTasks === "boolean" ? input.allowKitchenTasks : current.allowKitchenTasks,
    allowBedroomEntry:
      typeof input.allowBedroomEntry === "boolean" ? input.allowBedroomEntry : current.allowBedroomEntry,
    requireAskBefore:
      typeof input.requireAskBefore === "string" ? input.requireAskBefore.slice(0, 160) : current.requireAskBefore,
    notes: typeof input.notes === "string" ? input.notes.slice(0, 240) : current.notes,
  };

  if (!hub.setupCompleted.includes("link_kin")) hub.setupCompleted.push("link_kin");
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}

export async function addComposedRoutine(routine: HumanoidRoutine): Promise<HumanoidHubStatus> {
  const hub = await readHubFile();
  hub.routines.unshift(routine);
  if (hub.routines.length > 24) hub.routines = hub.routines.slice(0, 24);
  await writeHubFile(hub);
  return fetchHumanoidHubStatus();
}
