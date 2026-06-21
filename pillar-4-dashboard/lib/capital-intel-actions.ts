import "server-only";

import { runRuleBacktest } from "./capital-rule-engine";
import { createRule } from "./capital-store";
import type { CapitalRule } from "./capital-queue-types";
import type { TickerIntel } from "./capital-intel-types";

export async function createDipRuleFromIntel(
  intel: TickerIntel,
  dropPct = 5,
  qty = 1,
): Promise<CapitalRule> {
  const rule = await createRule({
    name: `${intel.symbol} dip ${dropPct}%`,
    asset: intel.symbol,
    conditionType: "price_drop_pct",
    conditionParams: { pct: dropPct },
    action: "buy",
    qty,
    note: `Auto from intel · smart take: ${(intel.smartTake ?? "").slice(0, 120)}`,
  });
  return (await runRuleBacktest(rule.id)) ?? rule;
}

export async function createSentimentAlertFromIntel(intel: TickerIntel): Promise<{ ruleId: string }> {
  const { upsertIntelAlertRule } = await import("./capital-intel-store");
  const alert = await upsertIntelAlertRule({
    symbol: intel.symbol,
    kind: intel.sentiment.bearishPct > intel.sentiment.bullishPct ? "sentiment_bearish" : "sentiment_bullish",
    enabled: true,
  });
  return { ruleId: alert.id };
}

export async function createRuleFromIntelThesis(intel: TickerIntel): Promise<CapitalRule> {
  const sym = intel.symbol;
  const text = `${intel.smartTake ?? ""} ${intel.sentiment.label}`.toLowerCase();
  const bearish =
    text.includes("bear") ||
    text.includes("dip") ||
    text.includes("pullback") ||
    text.includes("downside") ||
    intel.sentiment.label === "bearish";
  const bullish =
    text.includes("bull") ||
    text.includes("breakout") ||
    text.includes("momentum") ||
    intel.sentiment.label === "bullish";

  if (bearish && !bullish) {
    const dropPct =
      intel.fundamentals.changePct1d != null && intel.fundamentals.changePct1d < -3 ? 3 : 5;
    return createDipRuleFromIntel(intel, dropPct);
  }

  if (bullish && !bearish) {
    const rule = await createRule({
      name: `${sym} thesis buy`,
      asset: sym,
      conditionType: "manual_trigger",
      action: "buy",
      qty: 1,
      note: `From thesis: ${(intel.smartTake ?? "").slice(0, 120)}`,
    });
    return (await runRuleBacktest(rule.id)) ?? rule;
  }

  return createDipRuleFromIntel(intel, 5);
}
