"use client";

import type { ForgeFleetCounts, ForgeFleetEntry } from "@/lib/forge-fleet";

interface ForgeOpsPanelProps {
  fleet: ForgeFleetEntry[];
  counts: ForgeFleetCounts;
  activeClawId: string | null;
  inferenceBackend: string;
  cafeEventCount: number;
  onRefresh: () => void;
  onExportFleet?: () => void;
}

export function ForgeOpsPanel({
  fleet,
  counts,
  activeClawId,
  inferenceBackend,
  cafeEventCount,
  onRefresh,
  onExportFleet,
}: ForgeOpsPanelProps) {
  const active = fleet.find((r) => r.isActive);

  return (
    <div className="space-y-4 font-mono text-[10px]">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="uppercase tracking-[0.35em] text-cursor-glow">Foundry ops</p>
        <p className="mt-1 text-muted">L5 governance scaffold — fleet health and export hooks</p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-muted">Fleet total</p>
          <p className="mt-1 text-lg text-stark">{counts.total}</p>
        </div>
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-muted">By mode</p>
          <p className="mt-1 text-stark">
            I {counts.island} · F {counts.framework} · Imp {counts.imported}
          </p>
        </div>
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-muted">Inference</p>
          <p className="mt-1 uppercase text-stark">{inferenceBackend}</p>
        </div>
      </div>

      <div className="border border-line bg-panel px-4 py-3">
        <p className="uppercase tracking-widest text-stark">Active engine profile</p>
        <p className="mt-2 text-muted">
          {active ? `${active.name} · ${active.profileId}` : activeClawId ?? "None selected"}
        </p>
        <p className="mt-2 text-muted">Cafe mint events (dev ledger): {cafeEventCount}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="border border-line px-3 py-1.5 uppercase tracking-widest text-muted hover:text-cursor-glow"
        >
          Refresh status
        </button>
        <button
          type="button"
          disabled={!onExportFleet || counts.total === 0}
          onClick={onExportFleet}
          className="border border-cursor-glow px-3 py-1.5 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
        >
          Export fleet bundles
        </button>
        <button
          type="button"
          disabled
          title="Restart active profile — ships with engine supervisor in production"
          className="border border-line/50 px-3 py-1.5 uppercase tracking-widest text-muted opacity-50"
        >
          Restart active (soon)
        </button>
      </div>

      <ul className="space-y-1 border border-line/60 bg-void/30 px-3 py-2 text-muted">
        {fleet.slice(0, 8).map((row) => (
          <li key={row.rowId}>
            {row.isActive ? "▸ " : "  "}
            {row.name} · {row.mode}
            {row.href ? ` · ${row.href}` : ""}
          </li>
        ))}
        {fleet.length > 8 ? <li>… +{fleet.length - 8} more</li> : null}
      </ul>
    </div>
  );
}
