import "server-only";

import type { PilotHolding } from "./capital-queue-types";

export interface QuiverCongressTrade {
  ticker: string;
  tradedAt: string;
  filedAt: string;
  lagDays: number;
  politician: string;
  transaction: string;
}

export interface QuiverCongressFeed {
  holdings: PilotHolding[];
  trades: QuiverCongressTrade[];
  avgDisclosureLagDays: number;
  source: "quiver" | "unavailable";
  note: string;
}

function parseQuiverRow(raw: Record<string, unknown>): QuiverCongressTrade | null {
  const ticker = String(raw.Ticker ?? raw.ticker ?? "")
    .trim()
    .toUpperCase();
  if (!ticker || ticker.length > 5) return null;

  const tradedRaw = String(raw.TransactionDate ?? raw.Traded ?? raw.traded ?? "");
  const filedRaw = String(raw.ReportDate ?? raw.Filed ?? raw.filed ?? raw.DisclosureDate ?? "");
  const tradedAt = tradedRaw ? new Date(tradedRaw).toISOString() : new Date().toISOString();
  const filedAt = filedRaw ? new Date(filedRaw).toISOString() : tradedAt;
  const lagMs = Math.max(0, Date.parse(filedAt) - Date.parse(tradedAt));
  const lagDays = Math.round(lagMs / 86_400_000);

  return {
    ticker,
    tradedAt,
    filedAt,
    lagDays,
    politician: String(raw.Representative ?? raw.Senator ?? raw.Name ?? raw.name ?? "Congress"),
    transaction: String(raw.Transaction ?? raw.transaction ?? "unknown"),
  };
}

function holdingsFromTrades(trades: QuiverCongressTrade[], max = 8): PilotHolding[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    counts.set(t.ticker, (counts.get(t.ticker) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
  const total = sorted.reduce((s, [, c]) => s + c, 0) || 1;
  const holdings = sorted.map(([symbol, c]) => ({
    symbol,
    weightPct: Math.round((c / total) * 100),
  }));
  const sum = holdings.reduce((s, h) => s + h.weightPct, 0);
  if (holdings.length && sum !== 100) holdings[0]!.weightPct += 100 - sum;
  return holdings.length ? holdings : [{ symbol: "SPY", weightPct: 100 }];
}

export function isQuiverConfigured(): boolean {
  return Boolean(process.env.QUIVER_API_KEY?.trim());
}

export async function fetchQuiverCongressFeed(): Promise<QuiverCongressFeed> {
  const key = process.env.QUIVER_API_KEY?.trim();
  if (!key) {
    return {
      holdings: [{ symbol: "SPY", weightPct: 100 }],
      trades: [],
      avgDisclosureLagDays: 0,
      source: "unavailable",
      note: "Set QUIVER_API_KEY in digital.env for live congressional trades",
    };
  }

  const endpoints = [
    "https://api.quiverquant.com/beta/live/congresstrading",
    "https://api.quiverquant.com/beta/bulk/congress/trades",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;

      const body = (await res.json()) as unknown;
      const rows = Array.isArray(body)
        ? body
        : typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown }).data)
          ? ((body as { data: Record<string, unknown>[] }).data ?? [])
          : [];

      const trades = rows
        .slice(0, 120)
        .map((r) => parseQuiverRow(r as Record<string, unknown>))
        .filter((t): t is QuiverCongressTrade => t != null);

      if (trades.length === 0) continue;

      const avgDisclosureLagDays =
        Math.round((trades.reduce((s, t) => s + t.lagDays, 0) / trades.length) * 10) / 10;
      const holdings = holdingsFromTrades(trades);

      return {
        holdings,
        trades: trades.slice(0, 12),
        avgDisclosureLagDays,
        source: "quiver",
        note: `Quiver live · ${trades.length} recent disclosures · avg ${avgDisclosureLagDays}d lag (filed vs traded)`,
      };
    } catch {
      /* try next endpoint */
    }
  }

  return {
    holdings: [{ symbol: "SPY", weightPct: 100 }],
    trades: [],
    avgDisclosureLagDays: 0,
    source: "unavailable",
    note: "Quiver API unreachable — check QUIVER_API_KEY and network",
  };
}
