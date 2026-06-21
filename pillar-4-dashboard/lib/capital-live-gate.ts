import "server-only";

import { readAppFreState } from "./app-fre-state";
import { ensureCapitalQueue, writeCapitalFilePartial, isAlpacaBridgeConfigured } from "./capital-store";
import { isCapitalLiveEnvEnabled } from "./capital-live-env";

export { isCapitalLiveEnvEnabled } from "./capital-live-env";

export async function isLiveMoneyConfirmed(): Promise<boolean> {
  const file = await ensureCapitalQueue();
  return Boolean(file.permissions.liveMoneyConfirmedAt);
}

export async function canExecuteLiveTrades(): Promise<{ allowed: boolean; reason?: string }> {
  const fre = await readAppFreState("my-capital");
  const tradingMode = typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper";
  if (tradingMode !== "live") return { allowed: true };

  if (!(await isCapitalLiveEnvEnabled())) {
    return {
      allowed: false,
      reason: "Live trading disabled — set CURXOR_CAPITAL_LIVE_ENABLED=1 in digital.env",
    };
  }

  if (!(await isLiveMoneyConfirmed())) {
    return {
      allowed: false,
      reason: "Live money not confirmed — complete go-live checklist and confirm in desk",
    };
  }

  return { allowed: true };
}

export async function confirmLiveMoney(): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCapitalLiveEnvEnabled())) {
    return { ok: false, error: "CURXOR_CAPITAL_LIVE_ENABLED is not set in digital.env" };
  }

  const [fre, file, bridgeConfigured] = await Promise.all([
    readAppFreState("my-capital"),
    ensureCapitalQueue(),
    isAlpacaBridgeConfigured(),
  ]);
  const tradingMode = typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper";
  const armed = file.rules.filter((r) => r.state === "ARMED").length;
  const paperReady =
    fre.initialized &&
    bridgeConfigured &&
    file.rules.length > 0 &&
    armed > 0 &&
    (tradingMode === "paper" || tradingMode === "dry_run");
  if (!paperReady) {
    return { ok: false, error: "Complete paper go-live checklist before enabling live money" };
  }

  file.permissions = {
    ...file.permissions,
    liveMoneyConfirmedAt: new Date().toISOString(),
  };
  await writeCapitalFilePartial(file);
  return { ok: true };
}
