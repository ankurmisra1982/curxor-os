export type WearableSource =
  | "apple_health"
  | "garmin"
  | "oura"
  | "whoop"
  | "fitbit"
  | "samsung_health"
  | "manual";

export interface VitalReading {
  metric: string;
  value: number;
  unit: string;
  recordedAt: string;
  source: WearableSource;
}

export interface MedicalReport {
  id: string;
  title: string;
  provider: string;
  receivedAt: string;
  summary: string;
  tags: string[];
}

export interface DietSync {
  app: string;
  lastSyncAt: string | null;
  caloriesTarget: number | null;
  macros: { protein: number; carbs: number; fat: number } | null;
}

export interface HealthAppSync {
  app: string;
  lastSyncAt: string | null;
  connected: boolean;
}

export interface LongevityProtocolStep {
  id: string;
  category: "sleep" | "nutrition" | "movement" | "labs" | "mindfulness" | "supplements";
  title: string;
  detail: string;
  frequency: string;
  priority: "core" | "optional";
}

export interface VitalHealthMeta {
  lastMeshPublishedAt?: string | null;
  lastLabAt?: string | null;
  lastWearableSyncAt?: string | null;
}

export interface VitalHealthState {
  version: 1;
  updatedAt: string;
  vitals: VitalReading[];
  reports: MedicalReport[];
  dietSync: DietSync[];
  healthAppSync: HealthAppSync[];
  protocol: LongevityProtocolStep[];
  meta?: VitalHealthMeta;
}
