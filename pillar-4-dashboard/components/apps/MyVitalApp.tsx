"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import type { LongevityProtocolStep, VitalHealthState, VitalReading } from "@/lib/vital-health-types";

export function MyVitalApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const [state, setState] = useState<VitalHealthState | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vital/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as VitalHealthState;
      setState(data);
    } catch {
      /* retry on poll */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!state?.vitals[0]) return;
    updateWorkspaceContext({
      latestHr: state.vitals.find((v) => v.metric === "resting_hr")?.value,
      sleepScore: state.vitals.find((v) => v.metric === "sleep_score")?.value,
    });
  }, [state, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId === "sync_wearables" || lastSkillId === "publish_context") {
      void load();
    }
  }, [skillTick, lastSkillId, load]);

  const syncMesh = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/vital/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_mesh" }),
      });
      await load();
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const vitals = state?.vitals ?? [];
  const protocol = state?.protocol ?? [];

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">
          {getOotbApp("my-vital").name}
        </p>
        <h2 className="mt-1 font-sans text-xl font-semibold text-stark">Longevity protocol desk</h2>
        <p className="mt-2 font-sans text-sm text-muted">
          Wearables, medical reports, and diet apps feed Vital Claw — shared with Optimus and Kin Claw via the
          Claw Context mesh.
        </p>
      </header>

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

      <AppSection title="Health app bridges" subtitle="Connect via eno2 when bridges are configured">
        <ul className="space-y-2 font-sans text-sm">
          {(state?.healthAppSync ?? []).map((app) => (
            <li key={app.app} className="flex items-center justify-between border border-line px-3 py-2">
              <span className="text-stark">{app.app}</span>
              <span className={app.connected ? "text-cursor-glow" : "text-muted"}>
                {app.connected ? "Connected" : "Not connected"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-sans text-xs text-muted">
          Bridges ingest via eno2 when configured — vitals never leave the appliance unless you opt in.
        </p>
      </AppSection>

      <AppSection title="Active longevity protocol" subtitle="Generated locally — adjust via chat or Update Protocol skill">
        <ul className="space-y-3">
          {protocol.map((step: LongevityProtocolStep) => (
            <li key={step.id} className="border border-line bg-void p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-sm font-medium text-stark">{step.title}</span>
                <span className="font-mono text-[10px] uppercase text-muted">{step.frequency}</span>
              </div>
              <p className="mt-2 font-sans text-xs text-muted">{step.detail}</p>
            </li>
          ))}
        </ul>
      </AppSection>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={syncing}
          onClick={() => void syncMesh()}
          className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Publish to Claw Context mesh"}
        </button>
      </div>
    </div>
  );
}
