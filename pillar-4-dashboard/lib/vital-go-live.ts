import "server-only";

import { readAppFreState } from "./app-fre-state";
import { buildVitalGrowthProfile } from "./vital-growth";
import { fetchVitalStatus } from "./vital-health-store";
import { readUserSettings } from "./user-settings";

export type VitalGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface VitalGoLiveStep {
  id: string;
  label: string;
  status: VitalGoLiveStepStatus;
  detail: string;
}

export interface VitalGoLiveTodaySummary {
  vitalsCount: number;
  protocolSteps: number;
  reportsCount: number;
  meshPublished: boolean;
}

export interface VitalGoLiveReport {
  ready: boolean;
  demoReady: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: VitalGoLiveStep[];
  today: VitalGoLiveTodaySummary;
}

export async function buildVitalGoLiveReport(): Promise<VitalGoLiveReport> {
  const [fre, state, settings] = await Promise.all([
    readAppFreState("my-vital"),
    fetchVitalStatus(),
    readUserSettings(),
  ]);

  const growthProfile = buildVitalGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.vitalGrowthLevel ?? null,
  );
  const growth = growthProfile.growthLevel;
  const focus = typeof fre.config.longevityFocus === "string" ? fre.config.longevityFocus : "metabolic";

  const step = (id: string, label: string, status: VitalGoLiveStepStatus, detail: string): VitalGoLiveStep => ({
    id,
    label,
    status,
    detail,
  });

  const steps: VitalGoLiveStep[] = [];

  steps.push(
    step(
      "fre",
      growth === "L1" ? "Health profile" : "Longevity profile",
      fre.initialized ? "complete" : "pending",
      fre.initialized ? `${focus} focus · preview desk` : "Complete Vital Claw setup in FRE",
    ),
  );

  const hasVitals = state.vitals.length > 0;
  const syncedRecently = Boolean(state.meta?.lastWearableSyncAt);
  steps.push(
    step(
      "vitals",
      "Live vitals on-box",
      hasVitals ? "complete" : "pending",
      hasVitals
        ? syncedRecently
          ? `${state.vitals.length} readings · synced ${new Date(state.meta!.lastWearableSyncAt!).toLocaleString()}`
          : `${state.vitals.length} demo readings — run Sync Wearables or demo tour`
        : "Run Sync Wearables or demo tour",
    ),
  );

  const labUsed = Boolean(state.meta?.lastLabAt);
  steps.push(
    step(
      "lab",
      "Longevity Lab Q&A",
      labUsed ? "complete" : fre.initialized ? "warning" : "pending",
      labUsed
        ? `Last ask ${new Date(state.meta!.lastLabAt!).toLocaleString()}`
        : "Ask one personalized question in Lab (local RAG)",
    ),
  );

  const meshPublished = Boolean(state.meta?.lastMeshPublishedAt);
  steps.push(
    step(
      "mesh",
      "Claw Context mesh",
      meshPublished ? "complete" : fre.initialized ? "warning" : "pending",
      meshPublished
        ? `Published ${new Date(state.meta!.lastMeshPublishedAt!).toLocaleString()}`
        : "Publish vitals + protocol for Kin / Optimus",
    ),
  );

  steps.push(
    step(
      "bridges",
      "Wearable bridges (eno2)",
      "optional",
      "Preview until MS-S1 eno2 validation — Connect marks local state only; no live pull yet",
    ),
  );

  const complete = steps.filter((s) => s.status === "complete").length;
  const demoReady = fre.initialized && hasVitals && labUsed && meshPublished;
  const partiallyReady = complete >= 3;

  return {
    ready: demoReady,
    demoReady,
    partiallyReady,
    progress: { complete, total: steps.filter((s) => s.status !== "optional").length },
    steps,
    today: {
      vitalsCount: state.vitals.length,
      protocolSteps: state.protocol.length,
      reportsCount: state.reports.length,
      meshPublished,
    },
  };
}
