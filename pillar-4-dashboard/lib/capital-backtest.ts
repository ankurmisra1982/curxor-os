import "server-only";

import type { CapitalRule, RuleBacktestSummary } from "./capital-queue-types";
import { evaluateCondition, fetchQuotesForSymbols, type QuoteBar } from "./capital-quotes";
import { fetchAlpacaBars, loadAlpacaCreds } from "./capital-alpaca-client";

const START_EQUITY = 10_000;

function simulateBuyHold(bars: Array<{ t: string; c: number }>, qty: number): {
  curve: Array<{ t: string; value: number }>;
  returnPct: number;
} {
  if (bars.length < 2) return { curve: [], returnPct: 0 };
  const entry = bars[0]!.c;
  const curve = bars.map((b) => ({
    t: b.t,
    value: Math.round((START_EQUITY + (b.c - entry) * qty) * 100) / 100,
  }));
  const end = curve[curve.length - 1]!.value;
  const returnPct = Math.round(((end - START_EQUITY) / START_EQUITY) * 1000) / 10;
  return { curve, returnPct };
}

export async function backtestRule(rule: CapitalRule): Promise<RuleBacktestSummary> {
  const creds = await loadAlpacaCreds();
  const symbol = rule.asset.replace("-", "");
  let fires = 0;
  const equityCurve: Array<{ t: string; value: number }> = [];
  let equity = START_EQUITY;
  const qty = rule.qty ?? 1;
  let benchmarkCurve: Array<{ t: string; value: number }> = [];
  let benchmarkReturnPct = 0;

  if (creds && rule.conditionType !== "manual_trigger" && rule.conditionType !== "tradingview_webhook") {
    const [bars, spyBars] = await Promise.all([
      fetchAlpacaBars(creds, symbol, 90),
      fetchAlpacaBars(creds, "SPY", 90),
    ]);

    if (spyBars.length >= 2) {
      const bh = simulateBuyHold(spyBars, 1);
      benchmarkCurve = bh.curve;
      benchmarkReturnPct = bh.returnPct;
    }

    for (let i = 20; i < bars.length; i++) {
      const slice = bars.slice(0, i + 1);
      const bar = slice[slice.length - 1]!;
      const close = bar.c;
      const prevClose = slice[slice.length - 2]!.c;
      const fiveAgo = slice[Math.max(0, slice.length - 6)]!.c;
      const highs = slice.slice(-20).map((b) => b.h);
      const quote: QuoteBar = {
        symbol,
        close,
        prevClose,
        high20: Math.max(...highs),
        rsi14: 50,
        changePct1d: ((close - prevClose) / prevClose) * 100,
        changePct5d: fiveAgo ? ((close - fiveAgo) / fiveAgo) * 100 : 0,
      };
      if (evaluateCondition(rule.conditionType, rule.conditionParams, quote)) {
        fires += 1;
        if (rule.action === "buy") {
          equity -= close * qty;
        } else {
          equity += close * qty;
        }
      }
      equityCurve.push({ t: bar.t, value: Math.round(equity * 100) / 100 });
    }
  } else {
    const quotes = await fetchQuotesForSymbols([rule.asset]);
    const q = quotes[0];
    if (q && evaluateCondition(rule.conditionType, rule.conditionParams, q)) {
      fires = 1;
      const px = q.close ?? 100;
      equity += rule.action === "buy" ? -px * qty : px * qty;
      equityCurve.push({ t: new Date().toISOString(), value: Math.round(equity * 100) / 100 });
    }
  }

  const startVal = equityCurve[0]?.value ?? START_EQUITY;
  const endVal = equityCurve[equityCurve.length - 1]?.value ?? equity;
  const strategyReturnPct = startVal > 0 ? Math.round(((endVal - startVal) / startVal) * 1000) / 10 : 0;

  return {
    fires90d: fires,
    lastRunAt: new Date().toISOString(),
    note: fires > 0 ? `Would have fired ${fires} time(s) in lookback` : "No fires in lookback window",
    equityCurve: equityCurve.length > 0 ? equityCurve : undefined,
    benchmarkCurve: benchmarkCurve.length > 0 ? benchmarkCurve : undefined,
    benchmarkReturnPct,
    strategyReturnPct,
  };
}
