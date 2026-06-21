import "server-only";

import { readAppFreState } from "./app-fre-state";
import { ensureCapitalQueue, isAlpacaBridgeConfigured, seedRulesFromWatchlistIfEmpty } from "./capital-store";
import { isCapitalLiveEnvEnabled } from "./capital-live-env";

export type CapitalGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface CapitalGoLiveStep {
  id: string;
  label: string;
  status: CapitalGoLiveStepStatus;
  detail: string;
}

export interface CapitalGoLiveTodaySummary {
  armedRules: number;
  failedTrades: number;
  filledToday: number;
  tradingPaused: boolean;
}

export interface CapitalGoLiveReport {
  ready: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: CapitalGoLiveStep[];
  today: CapitalGoLiveTodaySummary;
}

export async function buildCapitalGoLiveReport(): Promise<CapitalGoLiveReport> {
  const [fre, file, bridgeConfigured] = await Promise.all([
    readAppFreState("my-capital"),
    ensureCapitalQueue(),
    isAlpacaBridgeConfigured(),
  ]);

  const tradingMode = typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper";
  const steps: CapitalGoLiveStep[] = [];

  steps.push({
    id: "fre",
    label: "Risk profile configured",
    status: fre.initialized ? "complete" : "pending",
    detail: fre.initialized ? `${tradingMode} · ${fre.config.riskProfile ?? "balanced"}` : "Complete Capital Claw setup",
  });

  steps.push({
    id: "alpaca",
    label: "Alpaca paper bridge",
    status: bridgeConfigured ? "complete" : "warning",
    detail: bridgeConfigured
      ? "ALPACA_API_KEY_ID configured in digital.env"
      : "Set Alpaca paper keys — demo portfolio until configured",
  });

  steps.push({
    id: "paper",
    label: "Paper mode confirmed",
    status: tradingMode === "paper" || tradingMode === "dry_run" ? "complete" : "warning",
    detail: `Trading mode: ${tradingMode}`,
  });

  const liveEnabled = await isCapitalLiveEnvEnabled();
  const liveConfirmed = Boolean(file.permissions.liveMoneyConfirmedAt);
  steps.push({
    id: "live_money",
    label: "Live money gate",
    status:
      tradingMode !== "live"
        ? liveEnabled
          ? "optional"
          : "complete"
        : !liveEnabled
          ? "pending"
          : liveConfirmed
            ? "complete"
            : "pending",
    detail: !liveEnabled
      ? "CURXOR_CAPITAL_LIVE_ENABLED not set — paper remains default"
      : tradingMode !== "live"
        ? "Live env enabled · confirm in desk when ready for real money"
        : liveConfirmed
          ? `Live confirmed · ${file.permissions.liveMoneyConfirmedAt?.slice(0, 10)}`
          : "Confirm live money in Risk & permissions before executing",
  });

  const hasRule = file.rules.length > 0;
  steps.push({
    id: "rule",
    label: "First rule created",
    status: hasRule ? "complete" : "pending",
    detail: hasRule ? `${file.rules.length} rule(s)` : "Create a WHEN/THEN rule",
  });

  const armed = file.rules.filter((r) => r.state === "ARMED");
  steps.push({
    id: "armed",
    label: "Rule armed",
    status: armed.length > 0 ? "complete" : hasRule ? "warning" : "pending",
    detail: armed.length > 0 ? `${armed.length} armed` : "Arm a rule before Execute Trade",
  });

  const complete = steps.filter((s) => s.status === "complete").length;
  const ready = steps.filter((s) => s.status !== "optional").every((s) => s.status === "complete");

  const todayStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const filledToday = file.trades.filter(
    (t) => t.status === "filled" && t.filledAt && Date.parse(t.filledAt) >= todayStart,
  ).length;

  return {
    ready,
    partiallyReady: complete >= 3,
    progress: { complete, total: steps.length },
    steps,
    today: {
      armedRules: armed.length,
      failedTrades: file.trades.filter((t) => t.status === "failed").length,
      filledToday,
      tradingPaused: file.tradingPaused,
    },
  };
}

export async function runCapitalBootstrap(): Promise<{ rulesSeeded: number }> {
  const rulesSeeded = await seedRulesFromWatchlistIfEmpty();
  return { rulesSeeded };
}
