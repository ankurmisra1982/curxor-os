import "server-only";

import type { CapitalRule, RuleBacktestSummary } from "./capital-queue-types";
import { evaluateCondition, fetchQuotesForSymbols, type QuoteBar } from "./capital-quotes";
import { fetchAlpacaBars, loadAlpacaCreds } from "./capital-alpaca-client";

const START_EQUITY = 10_000;

export interface WalkForwardWindow {
  label: string;
  trainFires: number;
  testFires: number;
  trainReturnPct: number;
  testReturnPct: number;
  overfitWarning: boolean;
}

export interface WalkForwardSummary extends RuleBacktestSummary {
  windows: WalkForwardWindow[];
  oosReturnPct: number | null;
  overfitRisk: "low" | "medium" | "high";
}

export async function walkForwardBacktest(rule: CapitalRule): Promise<WalkForwardSummary> {
  const creds = await loadAlpacaCreds();
  const symbol = rule.asset.replace("-", "");
  const qty = rule.qty ?? 1;
  const windows: WalkForwardWindow[] = [];

  if (
    !creds ||
    rule.conditionType === "manual_trigger" ||
    rule.conditionType === "tradingview_webhook"
  ) {
    const quotes = await fetchQuotesForSymbols([rule.asset]);
    const q = quotes[0];
    const fires = q && evaluateCondition(rule.conditionType, rule.conditionParams, q) ? 1 : 0;
    return {
      fires90d: fires,
      lastRunAt: new Date().toISOString(),
      note:
        "Demo estimate — set ALPACA_* keys for multi-window walk-forward on historical bars. Manual/webhook rules use current quote only.",
      strategyReturnPct: 0,
      benchmarkReturnPct: 0,
      windows: [],
      oosReturnPct: null,
      overfitRisk: "low",
    };
  }

  const bars = await fetchAlpacaBars(creds, symbol, 90);
  if (bars.length < 40) {
    return {
      fires90d: 0,
      lastRunAt: new Date().toISOString(),
      note: "Insufficient bar history for walk-forward",
      windows: [],
      oosReturnPct: null,
      overfitRisk: "low",
    };
  }

  const splits = [
    { trainEnd: Math.floor(bars.length * 0.5), testEnd: Math.floor(bars.length * 0.75) },
    { trainEnd: Math.floor(bars.length * 0.65), testEnd: bars.length - 1 },
  ];

  let totalTestReturn = 0;
  let testWindows = 0;

  for (let wi = 0; wi < splits.length; wi++) {
    const { trainEnd, testEnd } = splits[wi]!;
    let trainFires = 0;
    let testFires = 0;
    let trainEquity = START_EQUITY;
    let testEquity = START_EQUITY;

    for (let i = 20; i <= trainEnd; i++) {
      const slice = bars.slice(0, i + 1);
      const quote = barToQuote(symbol, slice);
      if (evaluateCondition(rule.conditionType, rule.conditionParams, quote)) {
        trainFires += 1;
        trainEquity += rule.action === "buy" ? -quote.close * qty : quote.close * qty;
      }
    }

    for (let i = trainEnd + 1; i <= testEnd; i++) {
      const slice = bars.slice(0, i + 1);
      const quote = barToQuote(symbol, slice);
      if (evaluateCondition(rule.conditionType, rule.conditionParams, quote)) {
        testFires += 1;
        testEquity += rule.action === "buy" ? -quote.close * qty : quote.close * qty;
      }
    }

    const trainReturnPct = Math.round(((trainEquity - START_EQUITY) / START_EQUITY) * 1000) / 10;
    const testReturnPct = Math.round(((testEquity - START_EQUITY) / START_EQUITY) * 1000) / 10;
    const overfitWarning = trainReturnPct > 5 && testReturnPct < trainReturnPct / 2;

    windows.push({
      label: `Window ${wi + 1}`,
      trainFires,
      testFires,
      trainReturnPct,
      testReturnPct,
      overfitWarning,
    });
    totalTestReturn += testReturnPct;
    testWindows += 1;
  }

  const oosReturnPct = testWindows > 0 ? Math.round((totalTestReturn / testWindows) * 10) / 10 : null;
  const overfitCount = windows.filter((w) => w.overfitWarning).length;
  const overfitRisk: WalkForwardSummary["overfitRisk"] =
    overfitCount >= 2 ? "high" : overfitCount === 1 ? "medium" : "low";

  return {
    fires90d: windows.reduce((s, w) => s + w.trainFires + w.testFires, 0),
    lastRunAt: new Date().toISOString(),
    note: `Walk-forward ${windows.length} window(s) · OOS ~${oosReturnPct ?? 0}%`,
    strategyReturnPct: oosReturnPct ?? undefined,
    oosReturnPct,
    windows,
    overfitRisk,
  };
}

function barToQuote(symbol: string, slice: Array<{ t: string; c: number; h: number }>): QuoteBar {
  const bar = slice[slice.length - 1]!;
  const prevClose = slice[slice.length - 2]!.c;
  const fiveAgo = slice[Math.max(0, slice.length - 6)]!.c;
  const highs = slice.slice(-20).map((b) => b.h);
  return {
    symbol,
    close: bar.c,
    prevClose,
    high20: Math.max(...highs),
    rsi14: 50,
    changePct1d: ((bar.c - prevClose) / prevClose) * 100,
    changePct5d: fiveAgo ? ((bar.c - fiveAgo) / fiveAgo) * 100 : 0,
  };
}
