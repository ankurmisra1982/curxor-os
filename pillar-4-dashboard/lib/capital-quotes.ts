import "server-only";

import type { ConditionType, WatchlistMover } from "./capital-queue-types";
import type { AlpacaCreds } from "./capital-alpaca-client";
import { fetchAlpacaBars, loadAlpacaCreds } from "./capital-alpaca-client";

export interface QuoteBar {
  symbol: string;
  close: number;
  prevClose: number;
  high20: number;
  rsi14: number;
  changePct1d: number;
  changePct5d: number;
}

export async function fetchQuotesForSymbols(symbols: string[]): Promise<QuoteBar[]> {
  const creds = await loadAlpacaCreds();
  const unique = [...new Set(symbols.map((s) => s.replace("-", "").toUpperCase()))].filter(Boolean);
  if (!creds || unique.length === 0) {
    return unique.map((symbol) => demoQuote(symbol));
  }

  const out: QuoteBar[] = [];
  for (const symbol of unique.slice(0, 12)) {
    try {
      const bars = await fetchAlpacaBars(creds, symbol, 30);
      if (bars.length < 2) {
        out.push(demoQuote(symbol));
        continue;
      }
      const close = bars[bars.length - 1]!.c;
      const prevClose = bars[bars.length - 2]!.c;
      const fiveAgo = bars[Math.max(0, bars.length - 6)]!.c;
      const highs = bars.slice(-20).map((b) => b.h);
      const high20 = Math.max(...highs);
      const rsi14 = computeRsi(bars.map((b) => b.c));
      out.push({
        symbol,
        close,
        prevClose,
        high20,
        rsi14,
        changePct1d: ((close - prevClose) / prevClose) * 100,
        changePct5d: fiveAgo ? ((close - fiveAgo) / fiveAgo) * 100 : 0,
      });
    } catch {
      out.push(demoQuote(symbol));
    }
  }
  return out;
}

export function quotesToMovers(quotes: QuoteBar[]): WatchlistMover[] {
  return quotes.map((q) => ({
    symbol: q.symbol,
    price: q.close,
    changePct1d: Math.round(q.changePct1d * 100) / 100,
    changePct5d: Math.round(q.changePct5d * 100) / 100,
    rsi14: Math.round(q.rsi14 * 10) / 10,
  }));
}

function demoQuote(symbol: string): QuoteBar {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const close = 50 + (seed % 400);
  const prev = close * (1 - (seed % 7) / 100);
  return {
    symbol,
    close,
    prevClose: prev,
    high20: close * 1.02,
    rsi14: 30 + (seed % 40),
    changePct1d: ((close - prev) / prev) * 100,
    changePct5d: (seed % 10) - 3,
  };
}

function computeRsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function evaluateCondition(
  conditionType: ConditionType,
  params: Record<string, number | string>,
  quote: QuoteBar | null,
): boolean {
  const p = normalizeConditionParams(conditionType, params);
  if (conditionType === "manual_trigger" || conditionType === "tradingview_webhook") return true;
  if (!quote) return false;

  switch (conditionType) {
    case "price_drop_pct": {
      const threshold = Number(p.thresholdPct ?? 5);
      return quote.changePct1d <= -Math.abs(threshold);
    }
    case "pct_change_1d": {
      const min = Number(p.minPct ?? 2);
      return quote.changePct1d >= min;
    }
    case "price_above_ma": {
      const ma = quote.prevClose;
      return quote.close > ma;
    }
    case "rsi_oversold": {
      const max = Number(p.maxRsi ?? 30);
      return quote.rsi14 <= max;
    }
    case "breakout_20d_high": {
      return quote.close >= quote.high20 * 0.998;
    }
    case "crypto_wallet_signal": {
      const minPct = Number(params.minPct ?? 1);
      return quote.symbol.includes("-") && Math.abs(quote.changePct1d) >= minPct;
    }
    case "options_iv_rank": {
      const maxIv = Number(params.maxIv ?? params.threshold ?? 80);
      return quote.rsi14 >= maxIv * 0.5;
    }
    default:
      return false;
  }
}

/** Normalize visual rule builder / legacy param names. */
export function normalizeConditionParams(
  conditionType: ConditionType,
  params: Record<string, number | string>,
): Record<string, number | string> {
  const out = { ...params };
  if (conditionType === "price_drop_pct" && out.pct != null && out.thresholdPct == null) {
    out.thresholdPct = out.pct;
  }
  if (conditionType === "rsi_oversold" && out.threshold != null && out.maxRsi == null) {
    out.maxRsi = out.threshold;
  }
  if (conditionType === "pct_change_1d" && out.pct != null && out.minPct == null) {
    out.minPct = out.pct;
  }
  return out;
}
