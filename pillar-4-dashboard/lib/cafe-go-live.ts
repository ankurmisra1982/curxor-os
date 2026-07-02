import "server-only";

import { readAppFreState } from "./app-fre-state";
import { readCafeStateMetrics } from "./claw-cafe-events";
import { collectComputeMetrics } from "./metrics";
import { CAFE_DEFAULT_KIOSK_NAME } from "./ol1-layer";
import { readUserSettings } from "./user-settings";

export type CafeGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface CafeGoLiveStep {
  id: string;
  label: string;
  status: CafeGoLiveStepStatus;
  detail: string;
}

export interface CafeGoLiveReport {
  ready: boolean;
  demoReady: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: CafeGoLiveStep[];
  inferenceBackend: string;
  optOut: boolean;
}

export async function buildCafeGoLiveReport(): Promise<CafeGoLiveReport> {
  const [fre, metrics, settings, cafe] = await Promise.all([
    readAppFreState("claw-cafe"),
    collectComputeMetrics().catch(() => ({ backend: "unknown" as const, modelLoaded: null })),
    readUserSettings(),
    readCafeStateMetrics(),
  ]);

  const optOut = Boolean(settings.appearance.workGamificationOptOut);
  const inferenceUp = metrics.backend !== "unknown";
  const kioskName =
    typeof fre.config.kioskName === "string" && fre.config.kioskName.trim()
      ? fre.config.kioskName.trim()
      : CAFE_DEFAULT_KIOSK_NAME;

  const steps: CafeGoLiveStep[] = [
    {
      id: "kiosk",
      label: "Cafe kiosk configured",
      status: fre.initialized ? "complete" : "warning",
      detail: fre.initialized ? kioskName : "Using defaults — open Host tab to name your desk",
    },
    {
      id: "ascension",
      label: "Ascension profile active",
      status: optOut ? "optional" : cafe.ascensionXp > 0 ? "complete" : "pending",
      detail: optOut
        ? "Gamification off — enable in Settings to track tiers"
        : cafe.ascensionXp > 0
          ? `${cafe.ascensionXp} ascension XP`
          : "Sync Claws or run demo tour to seed XP",
    },
    {
      id: "cross_claw",
      label: "Cross-Claw feed",
      status: optOut ? "optional" : cafe.eventCount >= 1 ? "complete" : "pending",
      detail:
        cafe.eventCount >= 1
          ? `${cafe.eventCount} event(s) in ledger`
          : "Work, Creator, Capital, Forge, or Swarm activity",
    },
    {
      id: "inference",
      label: "Local inference (optional)",
      status: inferenceUp ? "complete" : "optional",
      detail: inferenceUp
        ? `${metrics.backend}${metrics.modelLoaded ? ` · ${metrics.modelLoaded}` : ""}`
        : "Ollama offline — Cafe still runs in demo mode",
    },
    {
      id: "demo_tour",
      label: "Demo tour ready",
      status: optOut ? "optional" : cafe.eventCount >= 1 && cafe.ascensionXp > 0 ? "complete" : "warning",
      detail: optOut
        ? "Re-enable gamification to celebrate tours"
        : "Run demo tour from Go Live or agent skill",
    },
  ];

  const complete = steps.filter((s) => s.status === "complete").length;
  const total = steps.length;
  const demoReady = !optOut && cafe.eventCount >= 1 && cafe.ascensionXp > 0;
  const ready = demoReady && inferenceUp && fre.initialized;
  const partiallyReady = complete >= 2;

  return {
    ready,
    demoReady,
    partiallyReady,
    progress: { complete, total },
    steps,
    inferenceBackend: metrics.backend,
    optOut,
  };
}
