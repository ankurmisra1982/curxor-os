import "server-only";

import { readAppFreState } from "./app-fre-state";
import { executeCapitalTrade } from "./capital-trade-executor";
import { createRule, ensureCapitalQueue, getCapitalRule, writeCapitalFilePartial } from "./capital-store";

export interface DemoTourResult {
  ok: boolean;
  steps: Array<{ id: string; label: string; done: boolean; detail: string }>;
  ruleId?: string;
  tradeId?: string;
  error?: string;
}

export async function runCapitalDemoTour(): Promise<DemoTourResult> {
  const steps: DemoTourResult["steps"] = [];
  const fre = await readAppFreState("my-capital");
  const watchlist = Array.isArray(fre.config.seedWatchlist)
    ? (fre.config.seedWatchlist as string[])
    : ["SPY"];
  const asset = watchlist[0] ?? "SPY";

  steps.push({
    id: "fre",
    label: "Paper mode",
    done: true,
    detail: typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper",
  });

  let file = await ensureCapitalQueue();
  let rule = file.rules.find((r) => r.name.startsWith("Demo tour"));
  if (!rule) {
    rule = await createRule({
      name: "Demo tour · manual buy",
      asset,
      conditionType: "manual_trigger",
      conditionParams: {},
      action: "buy",
      qty: 1,
    });
  }
  steps.push({ id: "rule", label: "Demo rule", done: true, detail: `${rule.id} · ${rule.asset}` });

  file = await ensureCapitalQueue();
  const idx = file.rules.findIndex((r) => r.id === rule!.id);
  if (idx >= 0 && file.rules[idx]!.state !== "ARMED") {
    file.rules[idx] = { ...file.rules[idx]!, state: "ARMED" };
    await writeCapitalFilePartial(file);
  }
  const armedRule = await getCapitalRule(rule.id);
  if (!armedRule) {
    return { ok: false, steps, error: "Demo rule missing after arm" };
  }
  rule = armedRule;
  steps.push({ id: "arm", label: "Rule armed", done: true, detail: rule.id });

  const exec = await executeCapitalTrade({
    ruleId: rule.id,
    source: "manual",
    skipAutonomousGate: true,
  });

  const simulated = exec.trade?.status === "simulated";
  const filled = exec.trade?.status === "filled" || exec.trade?.status === "submitted";
  steps.push({
    id: "execute",
    label: simulated ? "Simulated fill" : filled ? "Bridge submit" : "Execute",
    done: exec.ok,
    detail: exec.trade
      ? `${exec.trade.status}${exec.trade.filledPrice != null ? ` @ $${exec.trade.filledPrice.toFixed(2)}` : ""}`
      : exec.error ?? "failed",
  });

  if (exec.ok) {
    const { emitCapitalXpEvent } = await import("./capital-xp-events");
    void emitCapitalXpEvent("demo_tour_complete", { ruleId: rule.id, asset: rule.asset });
  }

  return {
    ok: exec.ok,
    steps,
    ruleId: rule.id,
    tradeId: exec.trade?.id,
    error: exec.ok ? undefined : exec.error,
  };
}
