"use client";

import type { TaxLotSummary } from "@/lib/capital-queue-types";

interface CapitalTaxLotsPanelProps {
  lots: TaxLotSummary[];
  onExport?: () => void;
}

export function CapitalTaxLotsPanel({ lots, onExport }: CapitalTaxLotsPanelProps) {
  if (lots.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No cost basis lots yet — execute trades to build FIFO history.
      </p>
    );
  }

  const totalBasis = lots.reduce((s, l) => s + (l.costBasisUsd ?? 0), 0);
  const totalUpnl = lots.reduce((s, l) => s + (l.unrealizedPlUsd ?? 0), 0);

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted">Tax lots (FIFO beta)</span>
        {onExport ? (
          <button type="button" onClick={onExport} className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark">
            Copy summary
          </button>
        ) : null}
      </div>
      <div className="flex gap-4 text-[10px]">
        <span className="text-muted">
          Total basis <span className="text-stark">${totalBasis.toFixed(0)}</span>
        </span>
        <span className="text-muted">
          Unrealized{" "}
          <span className={totalUpnl >= 0 ? "text-cursor-glow" : "text-red-400"}>
            {totalUpnl >= 0 ? "+" : ""}${totalUpnl.toFixed(0)}
          </span>
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase text-muted">
            <th className="py-1 text-left">Symbol</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Basis</th>
            <th className="py-1 text-right">uP&L</th>
            <th className="py-1 text-right">Source</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr key={lot.symbol} className="border-b border-line/40">
              <td className="py-1.5 text-stark">{lot.symbol}</td>
              <td className="py-1.5 text-right">{lot.qty}</td>
              <td className="py-1.5 text-right">{lot.costBasisUsd != null ? `$${lot.costBasisUsd.toFixed(0)}` : "—"}</td>
              <td className={`py-1.5 text-right ${(lot.unrealizedPlUsd ?? 0) >= 0 ? "text-cursor-glow" : "text-red-400"}`}>
                {lot.unrealizedPlUsd != null ? `${lot.unrealizedPlUsd >= 0 ? "+" : ""}$${lot.unrealizedPlUsd.toFixed(0)}` : "—"}
              </td>
              <td className="py-1.5 text-right text-[10px] text-muted">{lot.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lots.some((l) => l.washSaleHint) ? (
        <p className="text-[10px] text-amber-400">
          {lots.find((l) => l.washSaleHint)?.washSaleHint}
        </p>
      ) : null}
    </div>
  );
}
