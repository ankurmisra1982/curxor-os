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
    return parsed as VitalHealthState;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      vitals: DEMO_VITALS,
      reports: [],
      dietSync: [
        { app: "Cronometer", lastSyncAt: null, caloriesTarget: 2200, macros: { protein: 140, carbs: 200, fat: 70 } },
        { app: "MyFitnessPal", lastSyncAt: null, caloriesTarget: null, macros: null },
      ],
      healthAppSync: [
        { app: "Apple Health", lastSyncAt: null, connected: false },
        { app: "Garmin Connect", lastSyncAt: null, connected: false },
        { app: "Oura", lastSyncAt: null, connected: false },
      ],
      protocol: DEMO_PROTOCOL,
    };
  }
}

async function writeVitalState(state: VitalHealthState): Promise<void> {
  const filePath = vitalPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function fetchVitalStatus(profileId?: string | null): Promise<VitalHealthState> {
  return readVitalState();
}

export async function syncVitalContextToMesh(profileId?: string | null): Promise<void> {
  const state = await readVitalState();
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
  const state = await readVitalState();
  for (const r of readings) {
    state.vitals = state.vitals.filter((v) => v.metric !== r.metric);
    state.vitals.push(r);
  }
  state.vitals = state.vitals.slice(-32);
  state.updatedAt = new Date().toISOString();
  await writeVitalState(state);
  await syncVitalContextToMesh(null);
  return state;
}
