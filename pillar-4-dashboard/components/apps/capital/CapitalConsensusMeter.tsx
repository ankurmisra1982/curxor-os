"use client";

import type { ConsensusLabel, ConsensusMeter } from "@/lib/capital-consensus";

function labelClass(label: ConsensusLabel): string {
  if (label === "bullish") return "text-cursor-glow";
  if (label === "bearish") return "text-red-400";
  return "text-muted";
}

function barPct(score: number): number {
  return Math.round(((clamp(score) + 1) / 2) * 100);
}

function clamp(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

interface CapitalConsensusMeterProps {
  meter: ConsensusMeter;
}

export function CapitalConsensusMeter({ meter }: CapitalConsensusMeterProps) {
  const needle = barPct(meter.score);

  return (
    <div className="border border-line/50 p-2 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-widest text-muted">Consensus meter</p>
        <p className={`text-[10px] uppercase ${labelClass(meter.label)}`}>{meter.label}</p>
      </div>
      <div className="relative h-2 rounded-sm bg-gradient-to-r from-red-900/60 via-panel to-cursor-glow/40">
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-stark"
          style={{ left: `calc(${needle}% - 1px)` }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between text-[8px] text-muted uppercase">
        <span>Bear</span>
        <span>Bull</span>
      </div>
      <div className="grid gap-1 text-[9px] text-muted md:grid-cols-3">
        <span>
          Pilots · {meter.pilots.signalCount} sig ·{" "}
          <span className="text-stark">{meter.pilots.label}</span>
        </span>
        <span>
          Chatter · <span className="text-stark">{meter.chatter.label}</span>
        </span>
        <span>
          You · <span className="text-stark">{meter.position.label}</span>
        </span>
      </div>
    </div>
  );
}
