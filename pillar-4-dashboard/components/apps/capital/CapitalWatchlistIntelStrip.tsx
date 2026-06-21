"use client";

import { useEffect, useState } from "react";

import type { TickerIntel } from "@/lib/capital-intel-types";

interface CapitalWatchlistIntelStripProps {
  watchlist: string[];
  onTickerClick: (symbol: string) => void;
}

function sentimentDot(label: string | undefined): string {
  if (label === "bullish") return "bg-cursor-glow";
  if (label === "bearish") return "bg-red-400";
  return "bg-muted";
}

export function CapitalWatchlistIntelStrip({ watchlist, onTickerClick }: CapitalWatchlistIntelStripProps) {
  const [rows, setRows] = useState<Array<{ symbol: string; intel: TickerIntel | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const symbols = watchlist.slice(0, 6);
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const res = await fetch(`/api/capital/intel?ticker=${encodeURIComponent(symbol)}`, {
              cache: "no-store",
            });
            const json = (await res.json()) as { intel?: TickerIntel };
            return { symbol, intel: json.intel ?? null };
          } catch {
            return { symbol, intel: null };
          }
        }),
      );
      if (!cancelled) setRows(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  if (watchlist.length === 0) return null;

  return (
    <div className="border border-line bg-panel/30 px-3 py-2 font-mono text-[10px]">
      <p className="mb-2 text-[9px] uppercase tracking-widest text-muted">Watchlist pulse · cached intel</p>
      <div className="flex flex-wrap gap-2">
        {rows.map(({ symbol, intel }) => {
          const pct = intel?.fundamentals.changePct1d;
          const price = intel?.fundamentals.price;
          return (
            <button
              key={symbol}
              type="button"
              onClick={() => onTickerClick(symbol)}
              className="flex items-center gap-2 border border-line/60 px-2 py-1 hover:border-cursor-glow/60"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sentimentDot(intel?.sentiment.label)}`} />
              <span className="text-stark">{symbol}</span>
              <span className={pct != null && pct >= 0 ? "text-cursor-glow" : "text-red-400"}>
                {pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}
              </span>
              {price != null ? <span className="text-muted">${price.toFixed(0)}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
