import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { publishClawContext } from "./claw-context-store";

import type {
  DietSync,
  HealthAppSync,
  LongevityProtocolStep,
  MedicalReport,
  VitalHealthState,
  VitalReading,
  WearableSource,
} from "./vital-health-types";

function vitalPath(): string {
  return process.env.CURXOR_VITAL_STATE_PATH ?? "/etc/curxor/vital-health.json";
}

const DEMO_VITALS: VitalReading[] = [
  { metric: "resting_hr", value: 58, unit: "bpm", recordedAt: new Date().toISOString(), source: "oura" },
  { metric: "hrv", value: 42, unit: "ms", recordedAt: new Date().toISOString(), source: "oura" },
  { metric: "sleep_score", value: 82, unit: "score", recordedAt: new Date().toISOString(), source: "oura" },
  { metric: "steps", value: 8420, unit: "count", recordedAt: new Date().toISOString(), source: "apple_health" },
];

const DEMO_REPORTS: MedicalReport[] = [
  {
    id: "RPT-DEMO-01",
    title: "Comprehensive metabolic panel",
    provider: "LabCorp",
    receivedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    summary: "A1c 5.4%, fasting glucose 92 mg/dL, LDL 98 — within target range for metabolic focus.",
    tags: ["metabolic", "labs", "quarterly"],
  },
  {
    id: "RPT-DEMO-02",
    title: "Annual physical summary",
    provider: "Primary care",
    receivedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    summary: "BP 118/72, resting HR 58 — continue Zone 2 protocol and sleep window.",
    tags: ["cardio", "annual"],
  },
];

const DEMO_PROTOCOL: LongevityProtocolStep[] = [
  {
    id: "sleep-01",
    category: "sleep",
    title: "Consistent sleep window",
    detail: "In bed 22:30–06:30; dim lights 60 min before bed.",
    frequency: "Daily",
    priority: "core",
  },
  {
    id: "move-01",
    category: "movement",
    title: "Zone 2 cardio",
    detail: "45 min brisk walk or cycle — conversational pace.",
    frequency: "4× / week",
    priority: "core",
  },
  {
    id: "nutrition-01",
    category: "nutrition",
    title: "Protein-forward meals",
    detail: "≥30g protein at breakfast and lunch from whole foods.",
    frequency: "Daily",
    priority: "core",
  },
  {
    id: "labs-01",
    category: "labs",
    title: "Quarterly metabolic panel",
    detail: "Sync PDF reports from your provider portal into Vital Claw.",
    frequency: "Quarterly",
    priority: "optional",
  },
];

async function readVitalState(): Promise<VitalHealthState> {
  try {
    const raw = await readFile(vitalPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<VitalHealthState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.protocol)) {
      throw new Error("invalid vital state");
    }
    const state = parsed as VitalHealthState;
    if (!state.meta) state.meta = {};
    return state;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      vitals: DEMO_VITALS,
      reports: DEMO_REPORTS,
      dietSync: [
        { app: "Cronometer", lastSyncAt: null, caloriesTarget: 2200, macros: { protein: 140, carbs: 200, fat: 70 } },
        { app: "MyFitnessPal", lastSyncAt: null, caloriesTarget: null, macros: null },
      ],
      healthAppSync: [
        { app: "Apple Health", lastSyncAt: null, connected: false },
        { app: "Samsung Health", lastSyncAt: null, connected: false },
        { app: "Garmin Connect", lastSyncAt: null, connected: false },
        { app: "Oura", lastSyncAt: null, connected: false },
      ],
      protocol: DEMO_PROTOCOL,
      meta: {},
    };
  }
}

function ensureMeta(state: VitalHealthState): VitalHealthState {
  if (!state.meta) state.meta = {};
  return state;
}

const APP_FOR_SOURCE: Record<WearableSource, string> = {
  apple_health: "Apple Health",
  garmin: "Garmin Connect",
  oura: "Oura",
  whoop: "Whoop",
  fitbit: "Fitbit",
  samsung_health: "Samsung Health",
  manual: "Manual",
};

const FOCUS_PROTOCOL: Record<string, LongevityProtocolStep[]> = {
  metabolic: DEMO_PROTOCOL,
  cardio: [
    {
      id: "cardio-sleep",
      category: "sleep",
      title: "Sleep consistency",
      detail: "7–8h window; track resting HR trend weekly.",
      frequency: "Daily",
      priority: "core",
    },
    {
      id: "cardio-z2",
      category: "movement",
      title: "Zone 2 base",
      detail: "150+ min/week conversational cardio.",
      frequency: "4× / week",
      priority: "core",
    },
    {
      id: "cardio-labs",
      category: "labs",
      title: "Lipid panel",
      detail: "ApoB + Lp(a) annually; share PDF in Reports vault.",
      frequency: "Annual",
      priority: "optional",
    },
  ],
  recovery: [
    {
      id: "rec-sleep",
      category: "sleep",
      title: "HRV-guided recovery",
      detail: "Back off intensity when HRV drops >10% vs baseline.",
      frequency: "Daily",
      priority: "core",
    },
    {
      id: "rec-move",
      category: "movement",
      title: "Mobility + walk",
      detail: "20 min walk + 10 min mobility on low-readiness days.",
      frequency: "Daily",
      priority: "core",
    },
  ],
};

async function writeVitalState(state: VitalHealthState): Promise<void> {
  const filePath = vitalPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function fetchVitalStatus(profileId?: string | null): Promise<VitalHealthState> {
  return readVitalState();
}

export async function syncVitalContextToMesh(profileId?: string | null): Promise<void> {
  const state = ensureMeta(await readVitalState());
  await publishClawContext("my-vital", {
    scope: "health",
    key: "vitals.latest",
    payload: { readings: state.vitals },
    profileId,
    ttlSeconds: 3600,
  });
  await publishClawContext("my-vital", {
    scope: "health",
    key: "protocol.active",
    payload: { steps: state.protocol },
    profileId,
    ttlSeconds: 86400,
  });
  state.meta!.lastMeshPublishedAt = new Date().toISOString();
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
}

export async function addMedicalReport(
  report: Omit<MedicalReport, "id">,
): Promise<MedicalReport> {
  const state = await readVitalState();
  const entry: MedicalReport = { ...report, id: `RPT-${Date.now()}` };
  state.reports.unshift(entry);
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  await publishClawContext("my-vital", {
    scope: "health",
    key: `reports.${entry.id}`,
    payload: entry as unknown as Record<string, unknown>,
    ttlSeconds: null,
  });
  return entry;
}

export async function markHealthAppConnected(app: string): Promise<VitalHealthState> {
  const state = await readVitalState();
  state.healthAppSync = state.healthAppSync.map((s) =>
    s.app === app ? { ...s, connected: true, lastSyncAt: new Date().toISOString() } : s,
  );
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  return state;
}

export async function ingestVitalReadings(readings: VitalReading[]): Promise<VitalHealthState> {
  const state = ensureMeta(await readVitalState());
  for (const r of readings) {
    state.vitals = state.vitals.filter((v) => v.metric !== r.metric);
    state.vitals.push(r);
  }
  state.vitals = state.vitals.slice(-32);
  state.meta!.lastWearableSyncAt = new Date().toISOString();
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  await syncVitalContextToMesh(null);
  return state;
}

export async function markVitalLabUsed(): Promise<VitalHealthState> {
  const state = ensureMeta(await readVitalState());
  state.meta!.lastLabAt = new Date().toISOString();
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  return state;
}

export async function syncWearablesDemo(sources?: WearableSource[]): Promise<VitalHealthState> {
  const state = ensureMeta(await readVitalState());
  const active = sources?.length ? sources : (["oura", "apple_health"] as WearableSource[]);
  const now = new Date().toISOString();
  const jitter = () => Math.round((Math.random() - 0.5) * 6);

  const readings: VitalReading[] = [
    {
      metric: "resting_hr",
      value: 58 + jitter(),
      unit: "bpm",
      recordedAt: now,
      source: active.includes("oura") ? "oura" : active[0],
    },
    {
      metric: "hrv",
      value: 42 + jitter(),
      unit: "ms",
      recordedAt: now,
      source: active.includes("oura") ? "oura" : active[0],
    },
    {
      metric: "sleep_score",
      value: Math.min(99, 82 + jitter()),
      unit: "score",
      recordedAt: now,
      source: active.includes("oura") ? "oura" : active[0],
    },
    {
      metric: "steps",
      value: 8420 + jitter() * 100,
      unit: "count",
      recordedAt: now,
      source: active.includes("apple_health") ? "apple_health" : active[0],
    },
  ];

  for (const r of readings) {
    state.vitals = state.vitals.filter((v) => v.metric !== r.metric);
    state.vitals.push(r);
  }

  for (const source of active) {
    const app = APP_FOR_SOURCE[source];
    if (!app) continue;
    state.healthAppSync = state.healthAppSync.map((s) =>
      s.app === app ? { ...s, connected: true, lastSyncAt: now } : s,
    );
  }

  state.meta!.lastWearableSyncAt = now;
  state.updatedAt = now;
  await writeVitalState(state);
  return state;
}

export async function ingestDemoReport(input?: {
  title?: string;
  summary?: string;
  provider?: string;
}): Promise<MedicalReport> {
  const state = ensureMeta(await readVitalState());
  const entry: MedicalReport = {
    id: `RPT-${Date.now()}`,
    title: input?.title?.trim() || "Operator-ingested lab summary",
    provider: input?.provider?.trim() || "Local vault",
    receivedAt: new Date().toISOString(),
    summary:
      input?.summary?.trim() ||
      "Manual summary added on-box — PDF OCR ships with eno2 bridge validation.",
    tags: ["ingested", "local"],
  };
  state.reports.unshift(entry);
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  await publishClawContext("my-vital", {
    scope: "health",
    key: `reports.${entry.id}`,
    payload: entry as unknown as Record<string, unknown>,
    ttlSeconds: null,
  });
  return entry;
}

export async function refreshProtocolForFocus(focus: string): Promise<VitalHealthState> {
  const state = ensureMeta(await readVitalState());
  const key = focus.trim().toLowerCase() || "metabolic";
  state.protocol = FOCUS_PROTOCOL[key] ?? DEMO_PROTOCOL;
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  return state;
}

export async function runVitalDemoTour(profileId?: string | null): Promise<{
  ok: boolean;
  vitals: number;
  labAsked: boolean;
  meshPublished: boolean;
}> {
  const { askVitalLongevityLab } = await import("./vital-longevity-lab");
  const { readAppFreState } = await import("./app-fre-state");

  await syncWearablesDemo();
  const [state, fre] = await Promise.all([readVitalState(), readAppFreState("my-vital")]);
  await askVitalLongevityLab(
    "What should I prioritize for longevity given my vitals?",
    fre.config ?? {},
    state,
  );
  await markVitalLabUsed();
  await syncVitalContextToMesh(profileId);
  const after = await readVitalState();
  return {
    ok: true,
    vitals: after.vitals.length,
    labAsked: true,
    meshPublished: Boolean(after.meta?.lastMeshPublishedAt),
  };
}
