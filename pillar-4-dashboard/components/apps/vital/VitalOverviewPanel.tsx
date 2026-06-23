"use client";

import { AppMetric } from "@/components/app-shared/AppLayout";
import type { VitalHealthState, VitalReading } from "@/lib/vital-health-types";

interface VitalOverviewPanelProps {
  state: VitalHealthState;
  syncing: boolean;
  meshPublishVisible: boolean;
  onSyncMesh: () => void;
}

export function VitalOverviewPanel({ state, syncing, meshPublishVisible, onSyncMesh }: VitalOverviewPanelProps) {
  const vitals = state.vitals;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-sans text-sm font-semibold text-stark">Live vitals</h3>
        <p className="mt-1 font-sans text-xs text-muted">
          Latest readings on-box — use Sync Wearables skill or demo tour; live bridge pull is preview until eno2.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {vitals.map((v: VitalReading) => (
          <AppMetric
            key={v.metric}
            label={v.metric.replace(/_/g, " ")}
            value={String(v.value)}
            unit={`${v.unit} · ${v.source}`}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] text-muted">Updated {new Date(state.updatedAt).toLocaleString()}</p>

      {meshPublishVisible ? (
        <button
          type="button"
          disabled={syncing}
          onClick={onSyncMesh}
          className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Publish to Claw Context mesh"}
        </button>
      ) : null}
    </div>
  );
}
