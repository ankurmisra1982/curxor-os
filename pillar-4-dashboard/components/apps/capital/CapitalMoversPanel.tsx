"use client";

import type { CapitalPosition, WatchlistMover } from "@/lib/capital-queue-types";

interface CapitalMoversPanelProps {
  movers: WatchlistMover[];
  positions: CapitalPosition[];
  onSymbolClick?: (symbol: string) => void;
}

export function CapitalMoversPanel({ movers, positions, onSymbolClick }: CapitalMoversPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 font-mono text-xs">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Watchlist movers</p>
        {movers.length === 0 ? (
          <p className="text-muted">No quotes yet — heartbeat refreshes hourly.</p>
        ) : (
          movers.map((m) => (
            <button
              key={m.symbol}
              type="button"
              onClick={() => onSymbolClick?.(m.symbol)}
              className="flex w-full justify-between border-b border-line/40 py-1 text-left hover:text-cursor-glow"
            >
              <span className="text-stark">{m.symbol}</span>
              <span>
                {m.changePct1d != null ? `${m.changePct1d > 0 ? "+" : ""}${m.changePct1d}%` : "—"}
                {m.rsi14 != null ? ` · RSI ${m.rsi14}` : ""}
              </span>
            </button>
          ))
        )}
      </div>
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Positions</p>
        {positions.length === 0 ? (
          <p className="text-muted">No open positions (paper).</p>
        ) : (
          positions.map((p) => (
            <div key={p.symbol} className="flex justify-between border-b border-line/40 py-1">
              <span className="text-stark">
                {p.symbol} × {p.qty}
              </span>
              <span className={p.unrealizedPl >= 0 ? "text-cursor-glow" : "text-red-400"}>
                {p.unrealizedPlPct.toFixed(1)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
