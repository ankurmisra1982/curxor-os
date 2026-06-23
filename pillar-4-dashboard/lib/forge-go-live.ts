import "server-only";

import { readAppFreState } from "./app-fre-state";
import { readClawProfiles } from "./claw-profiles";
import { buildForgeGrowthProfile } from "./forge-growth";
import { collectComputeMetrics } from "./metrics";
import { readForgedApps } from "./forged-apps-store";
import { readUserSettings } from "./user-settings";

export type ForgeGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface ForgeGoLiveStep {
  id: string;
  label: string;
  status: ForgeGoLiveStepStatus;
  detail: string;
}

export interface ForgeGoLiveReport {
  ready: boolean;
  demoReady: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: ForgeGoLiveStep[];
  fleetTotal: number;
  forgedCount: number;
  inferenceBackend: string;
}

export async function buildForgeGoLiveReport(): Promise<ForgeGoLiveReport> {
  const [fre, profiles, forgedState, metrics, settings] = await Promise.all([
    readAppFreState("claw-forge"),
    readClawProfiles(),
    readForgedApps(),
    collectComputeMetrics().catch(() => ({
      backend: "unknown" as const,
      modelLoaded: null,
    })),
    readUserSettings(),
  ]);

  const growthProfile = buildForgeGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.forgeGrowthLevel ?? null,
  );
  const growth = growthProfile.growthLevel;
  const isSketcher = growth === "L1";

  const fleetTotal = profiles.claws.length;
  const forgedCount = forgedState.apps.length;
  const hasFleet = fleetTotal > 0 || forgedCount > 0;
  const inferenceUp = metrics.backend !== "unknown";

  const steps: ForgeGoLiveStep[] = [];

  steps.push({
    id: "fre",
    label: isSketcher ? "Forge configured" : "Forge FRE complete",
    status: fre.initialized ? "complete" : "pending",
    detail: fre.initialized
      ? `${growthProfile.growthLabel} (${growth})`
      : "Complete Forge setup wizard in Settings or FRE overlay",
  });

  steps.push({
    id: "inference",
    label: "Local inference reachable",
    status: inferenceUp ? "complete" : "warning",
    detail: inferenceUp
      ? `${metrics.backend}${metrics.modelLoaded ? ` · ${metrics.modelLoaded}` : ""}`
      : "Ollama/vLLM offline — agent chat uses fallback or plan skills only",
  });

  steps.push({
    id: "fleet",
    label: isSketcher ? "First claw minted" : "Fleet has entries",
    status: hasFleet ? "complete" : "pending",
    detail: hasFleet
      ? `${fleetTotal} profile(s) · ${forgedCount} forged desk(s)`
      : "Mint via wizard — island, framework, or import",
  });

  steps.push({
    id: "framework_desk",
    label: "Framework desk (optional)",
    status: forgedCount > 0 ? "complete" : isSketcher ? "optional" : "warning",
    detail:
      forgedCount > 0
        ? `${forgedCount} desk(s) in nav — open from Fleet tab`
        : "Framework mint adds /my-claw/{slug} — recommended for GTM demos",
  });

  steps.push({
    id: "demo_tour",
    label: "Demo tour ready",
    status: fre.initialized && hasFleet ? "complete" : fre.initialized ? "warning" : "pending",
    detail:
      fre.initialized && hasFleet
        ? "Run demo tour from Go Live or agent skill"
        : "Complete FRE and mint at least one claw",
  });

  const complete = steps.filter((s) => s.status === "complete").length;
  const total = steps.length;
  const demoReady = fre.initialized && hasFleet;
  const ready = demoReady && inferenceUp && forgedCount > 0;
  const partiallyReady = complete >= 2;

  return {
    ready,
    demoReady,
    partiallyReady,
    progress: { complete, total },
    steps,
    fleetTotal,
    forgedCount,
    inferenceBackend: metrics.backend,
  };
}
