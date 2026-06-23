import type { ConditionType, TradeAction } from "./capital-queue-types";

export interface ParsedDescribeRule {
  name: string;
  asset: string;
  conditionType: ConditionType;
  conditionParams: Record<string, number | string>;
  action: TradeAction;
  qty: number;
  takeProfitPct?: number;
  stopLossPct?: number;
  note: string;
}

const TICKER_RE = /\b([A-Z]{1,5}(?:-USD)?)\b/gi;

function extractTicker(text: string, fallback = "SPY"): string {
  const skip = new Set(["BUY", "SELL", "DIP", "ON", "WHEN", "THEN", "AND", "THE", "FOR", "HALF"]);
  const matches = [...text.toUpperCase().matchAll(TICKER_RE)]
    .map((m) => m[1]!.toUpperCase())
    .filter((t) => !skip.has(t.replace(/-USD$/, "")));
  return matches[0] ?? fallback;
}

function extractDropPct(text: string): number {
  const dipFirst = text.match(/(\d+(?:\.\d+)?)\s*%\s*dip/i);
  if (dipFirst) return Number.parseFloat(dipFirst[1]!);
  const dipSecond = text.match(/dip\s*(?:of\s*|at\s*)?(\d+(?:\.\d+)?)\s*%/i);
  if (dipSecond) return Number.parseFloat(dipSecond[1]!);
  const drop = text.match(/drop(?:s|ped|ping)?\s*(?:of\s*|by\s*)?(\d+(?:\.\d+)?)\s*%/i);
  if (drop) return Number.parseFloat(drop[1]!);
  return 5;
}

function extractTakeProfitPct(text: string): number | undefined {
  const m =
    text.match(/(?:sell|take\s*profit|tp)\s+(?:half\s+)?(?:on\s+)?\+?(\d+(?:\.\d+)?)\s*%/i) ??
    text.match(/\+(\d+(?:\.\d+)?)\s*%\s*(?:gain|profit|target)/i);
  return m ? Number.parseFloat(m[1]!) : undefined;
}

function extractStopLossPct(text: string): number | undefined {
  const m = text.match(/(?:stop|sl)\s*(?:at\s*|loss\s*)?(\d+(?:\.\d+)?)\s*%/i);
  return m ? Number.parseFloat(m[1]!) : undefined;
}

function extractAction(text: string): TradeAction {
  return /\bsell\b/i.test(text) && !/\bbuy\b/i.test(text) ? "sell" : "buy";
}

/** Parse one-line strategy descriptions into structured rule inputs (Composer-style NL bar). */
export function parseDescribeRule(description: string, defaultAsset = "SPY"): ParsedDescribeRule | null {
  const text = description.trim();
  if (text.length < 4) return null;

  const asset = extractTicker(text, defaultAsset);
  const dropPct = extractDropPct(text);
  const action = extractAction(text);
  const takeProfitPct = extractTakeProfitPct(text);
  const stopLossPct = extractStopLossPct(text);
  const hasDip = /dip|drop|pullback|decline/i.test(text);

  if (hasDip || /\d+\s*%/.test(text)) {
    return {
      name: `${asset} dip ${dropPct}%`,
      asset,
      conditionType: "price_drop_pct",
      conditionParams: { pct: dropPct },
      action,
      qty: 1,
      takeProfitPct,
      stopLossPct,
      note: `From describe: ${text.slice(0, 160)}`,
    };
  }

  if (/\b(breakout|momentum|above\s+ma)\b/i.test(text)) {
    return {
      name: `${asset} breakout`,
      asset,
      conditionType: "breakout_20d_high",
      conditionParams: {},
      action,
      qty: 1,
      takeProfitPct,
      stopLossPct,
      note: `From describe: ${text.slice(0, 160)}`,
    };
  }

  return {
    name: `${asset} strategy`,
    asset,
    conditionType: "manual_trigger",
    conditionParams: {},
    action,
    qty: 1,
    takeProfitPct,
    stopLossPct,
    note: `From describe: ${text.slice(0, 160)}`,
  };
}
