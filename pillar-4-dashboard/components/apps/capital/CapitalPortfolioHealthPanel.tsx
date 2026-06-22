"use client";

import type { PortfolioHealthReport } from "@/lib/capital-queue-types";

interface CapitalPortfolioHealthPanelProps {
  health: PortfolioHealthReport;
  onCreateRebalanceRule?: (symbol: string, targetWeightPct: number) => void;
}

export function CapitalPortfolioHealthPanel({ health, onCreateRebalanceRule }: CapitalPortfolioHealthPanelProps) {
  const labelColor =
    health.label === "healthy"
      ? "text-cursor-glow"
      : health.label === "watch"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border border-line p-2">
        <span className="text-[10px] uppercase text-muted">Health score</span>
        <span className={`text-lg ${labelColor}`}>
          {health.score} · {health.label}
        </span>
      </div>

      {health.topHoldings.length > 0 ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Top holdings</p>
          {health.topHoldings.map((h) => (
            <div key={h.symbol} className="flex justify-between border-b border-line/40 py-1">
              <span className="text-stark">{h.symbol}</span>
              <span>
                {h.weightPct}% ·{" "}
                <span className={h.unrealizedPlPct >= 0 ? "text-cursor-glow" : "text-red-400"}>
                  {h.unrealizedPlPct > 0 ? "+" : ""}
                  {h.unrealizedPlPct.toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
          <p className="mt-1 text-[10px] text-muted">
            Largest position: {health.concentrationPct}% concentration
          </p>
        </div>
      ) : null}

      {health.rebalanceHints && health.rebalanceHints.length > 0 ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Rebalance actions</p>
          {health.rebalanceHints.map((hint) => (
            <div key={hint.symbol} className="mb-2 flex flex-wrap items-center gap-2 border border-line/40 px-2 py-1.5">
              <span className="text-stark">
                {hint.symbol} · {hint.currentWeightPct}% → target {hint.targetWeightPct}%
              </span>
              {onCreateRebalanceRule ? (
                <button
                  type="button"
                  onClick={() => onCreateRebalanceRule(hint.symbol, hint.targetWeightPct)}
                  className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
                >
                  Create rebalance rule
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Sector mix</p>
        {health.sectorNotes.map((n) => (
          <p key={n} className="text-muted">
            {n}
          </p>
        ))}
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Suggestions</p>
        {health.suggestions.map((s) => (
          <p key={s} className="border-l-2 border-cursor-glow/40 pl-2 text-stark">
            {s}
          </p>
        ))}
      </div>

      {health.costBasisBeta && health.costBasisBeta.length > 0 ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Cost basis (beta)</p>
          {health.costBasisBeta.slice(0, 5).map((lot) => (
            <div key={lot.symbol} className="flex justify-between border-b border-line/40 py-1 text-[10px]">
              <span className="text-stark">
                {lot.symbol} · {lot.qty} sh
              </span>
              <span className="text-muted">
                {lot.costBasisUsd != null ? `$${lot.costBasisUsd.toFixed(0)} basis` : "—"}
                {lot.unrealizedPlUsd != null ? (
                  <span className={lot.unrealizedPlUsd >= 0 ? " text-cursor-glow" : " text-red-400"}>
                    {" "}
                    · {lot.unrealizedPlUsd >= 0 ? "+" : ""}
                    {lot.unrealizedPlUsd.toFixed(0)} uP&L
                  </span>
                ) : null}
                <span className="text-muted"> · {lot.source}</span>
              </span>
              {lot.washSaleHint ? <p className="text-[9px] text-amber-300">{lot.washSaleHint}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
