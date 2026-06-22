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
  /** Day-one ready without broker keys — rule, arm, simulated fill */
  demoReady: boolean;
  /** Paper bridge configured and non-demo execution path proven */
  paperReady: boolean;
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
      : "Demo mode OK — set Alpaca paper keys when ready for bridge fills",
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
    detail: hasRule ? `${file.rules.length} rule(s)` : "Create a WHEN/THEN rule or run Setup Wizard",
  });

  const armed = file.rules.filter((r) => r.state === "ARMED");
  steps.push({
    id: "armed",
    label: "Rule armed",
    status: armed.length > 0 ? "complete" : hasRule ? "warning" : "pending",
    detail: armed.length > 0 ? `${armed.length} armed` : "Arm a rule before Execute Trade",
  });

  const todayStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const filledToday = file.trades.filter(
    (t) =>
      (t.status === "filled" || t.status === "simulated") &&
      t.filledAt &&
      Date.parse(t.filledAt) >= todayStart,
  ).length;
  const hasBridgeFill = file.trades.some((t) => t.status === "filled" || t.status === "submitted");
  const hasAnyFill = filledToday > 0 || file.trades.some((t) => t.status === "simulated" || t.status === "filled");

  steps.push({
    id: "first_fill",
    label: "First execution",
    status: hasAnyFill ? "complete" : armed.length > 0 ? "warning" : "pending",
    detail: hasAnyFill
      ? bridgeConfigured && hasBridgeFill
        ? `${filledToday} today · bridge path proven`
        : `${filledToday} today · simulated OK in demo mode`
      : "Run demo tour, Setup Wizard, or Execute now",
  });

  const demoReady = fre.initialized && hasRule && armed.length > 0 && hasAnyFill;

  const paperReady =
    bridgeConfigured &&
    demoReady &&
    steps.find((s) => s.id === "alpaca")?.status === "complete" &&
    hasBridgeFill;

  const complete = steps.filter((s) => s.status === "complete").length;
  const ready = bridgeConfigured
    ? steps.filter((s) => s.status !== "optional").every((s) => s.status === "complete")
    : demoReady;

  return {
    ready,
    demoReady,
    paperReady,
    partiallyReady: complete >= 4,
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
