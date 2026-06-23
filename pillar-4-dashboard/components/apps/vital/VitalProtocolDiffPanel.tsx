"use client";

import type { VitalProtocolDiffReport } from "@/lib/vital-lab-types";

interface VitalProtocolDiffPanelProps {
  diff: VitalProtocolDiffReport | null;
  loading?: boolean;
}

function RowList({ title, rows, tone }: { title: string; rows: VitalProtocolDiffReport["aligned"]; tone: string }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className={`font-mono text-[10px] uppercase tracking-widest ${tone}`}>{title}</p>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="border border-line px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-sans text-sm text-stark">{row.title}</span>
              <span className="font-mono text-[9px] uppercase text-muted">{row.frequency}</span>
            </div>
            <p className="mt-1 font-sans text-xs text-muted">{row.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VitalProtocolDiffPanel({ diff, loading }: VitalProtocolDiffPanelProps) {
  if (loading) {
    return <p className="font-sans text-sm text-muted">Computing protocol diff…</p>;
  }
  if (!diff) {
    return (
      <p className="font-sans text-xs text-muted">
        Select an expert lens and run diff to see aligned, missing, and extra protocol steps.
      </p>
    );
  }

  return (
    <div className="space-y-4 border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-sans text-sm font-semibold text-stark">{diff.expertLabel}</p>
          <p className="mt-1 font-sans text-xs text-muted">{diff.summary}</p>
        </div>
        <p className="font-mono text-2xl font-semibold text-cursor-glow">{diff.alignmentScore}%</p>
      </div>
      <RowList title="Aligned" rows={diff.aligned} tone="text-green-400" />
      <RowList title="Missing from your protocol" rows={diff.missing} tone="text-amber-300" />
      <RowList title="Extra (your additions)" rows={diff.extra} tone="text-muted" />
    </div>
  );
}
