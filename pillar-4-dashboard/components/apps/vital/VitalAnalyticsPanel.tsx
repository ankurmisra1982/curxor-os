"use client";

import { AppMetric } from "@/components/app-shared/AppLayout";
import type { DietSync, VitalReading } from "@/lib/vital-health-types";

interface VitalAnalyticsPanelProps {
  vitals: VitalReading[];
  dietSync: DietSync[];
  protocolStepCount: number;
  analyticsLite: boolean;
}

function metricValue(vitals: VitalReading[], metric: string): number | null {
  const row = vitals.find((v) => v.metric === metric);
  return row?.value ?? null;
}

export function VitalAnalyticsPanel({ vitals, dietSync, protocolStepCount, analyticsLite }: VitalAnalyticsPanelProps) {
  const sleep = metricValue(vitals, "sleep_score");
  const hrv = metricValue(vitals, "hrv");
  const steps = metricValue(vitals, "steps");
  const hr = metricValue(vitals, "resting_hr");

  const recoveryScore =
    sleep !== null && hrv !== null ? Math.round((sleep + Math.min(hrv, 60)) / 1.6) : null;

  const syncedDiet = dietSync.filter((d) => d.lastSyncAt !== null).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-sans text-sm font-semibold text-stark">
          {analyticsLite ? "Trend snapshot" : "Longevity analytics"}
        </h3>
        <p className="mt-1 font-sans text-xs text-muted">
          {analyticsLite
            ? "Weekly snapshot from on-box vitals — full analytics unlock at Athlete level."
            : "Recovery, movement, and nutrition signals computed locally from your vault."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AppMetric label="Recovery index" value={recoveryScore !== null ? String(recoveryScore) : "—"} unit="score · demo" />
        <AppMetric label="Sleep score" value={sleep !== null ? String(sleep) : "—"} unit="7d avg · demo" />
        <AppMetric label="Resting HR" value={hr !== null ? String(hr) : "—"} unit="bpm · trend flat" />
        <AppMetric label="Daily steps" value={steps !== null ? String(steps) : "—"} unit="today" />
      </div>

      {!analyticsLite ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-line bg-void p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Protocol adherence</p>
            <p className="mt-2 font-sans text-2xl font-semibold text-stark">{protocolStepCount}</p>
            <p className="font-sans text-xs text-muted">active steps tracked locally</p>
          </div>
          <div className="border border-line bg-void p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Diet bridges synced</p>
            <p className="mt-2 font-sans text-2xl font-semibold text-stark">{syncedDiet}</p>
            <p className="font-sans text-xs text-muted">of {dietSync.length} configured apps</p>
          </div>
        </div>
      ) : null}

      <p className="font-sans text-xs text-muted">
        Analytics never egress — Optimus and Kin Claw only see what you publish to Claw Context mesh.
      </p>
    </div>
  );
}
