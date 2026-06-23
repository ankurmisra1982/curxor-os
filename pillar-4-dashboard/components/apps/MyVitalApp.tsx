"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { VitalAnalyticsPanel } from "@/components/apps/vital/VitalAnalyticsPanel";
import { VitalBridgesPanel } from "@/components/apps/vital/VitalBridgesPanel";
import { PreviewModuleBanner } from "@/components/app-shared/PreviewModuleBanner";
import { KinCrossLink } from "@/components/app-shared/KinCrossLink";
import { VitalGoLivePanel, type VitalGoLiveReportRow } from "@/components/apps/vital/VitalGoLivePanel";
import { VitalLevelBadge } from "@/components/apps/vital/VitalLevelBadge";
import { VitalLongevityLabPanel } from "@/components/apps/vital/VitalLongevityLabPanel";
import { VitalLevelUpNudge } from "@/components/apps/vital/VitalLevelUpNudge";
import { VitalOverviewPanel } from "@/components/apps/vital/VitalOverviewPanel";
import { VitalProtocolPanel } from "@/components/apps/vital/VitalProtocolPanel";
import { VitalReportsPanel } from "@/components/apps/vital/VitalReportsPanel";
import {
  VitalWorkspaceTabs,
  defaultVitalTab,
  vitalFeatureVisible,
  type VitalWorkspaceTab,
} from "@/components/apps/vital/VitalWorkspaceTabs";
import { getOotbApp } from "@/lib/ootb-apps";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { isGrowthLevel } from "@/lib/os-growth-level";
import { resolveVitalGrowthLevel } from "@/lib/vital-growth";
import { vitalDeskSubtitle } from "@/lib/vital-level-copy";
import type { VitalHealthState } from "@/lib/vital-health-types";

export function MyVitalApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { level } = useExperienceLevel();
  const [state, setState] = useState<VitalHealthState | null>(null);
  const [goLive, setGoLive] = useState<VitalGoLiveReportRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [demoTourRunning, setDemoTourRunning] = useState(false);
  const [meshPublished, setMeshPublished] = useState(false);
  const [growthProfile, setGrowthProfile] = useState<{
    growthLevel: GrowthLevel;
    growthLabel: string;
  } | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<VitalWorkspaceTab>(() =>
    defaultVitalTab(resolveVitalGrowthLevel(config, level)),
  );

  const growthLevel = useMemo((): GrowthLevel => {
    const fromProfile = growthProfile?.growthLevel;
    if (fromProfile && isGrowthLevel(fromProfile)) return fromProfile;
    return resolveVitalGrowthLevel(config, level);
  }, [config, level, growthProfile?.growthLevel]);

  useEffect(() => {
    setWorkspaceTab(defaultVitalTab(growthLevel));
  }, [growthLevel]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vital/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as VitalHealthState & {
        growthProfile?: { growthLevel?: GrowthLevel; growthLabel?: string };
        goLive?: VitalGoLiveReportRow;
      };
      setState(data);
      if (data.goLive) setGoLive(data.goLive);
      if (data.meta?.lastMeshPublishedAt) setMeshPublished(true);
      if (data.growthProfile?.growthLevel && isGrowthLevel(data.growthProfile.growthLevel)) {
        setGrowthProfile({
          growthLevel: data.growthProfile.growthLevel,
          growthLabel: data.growthProfile.growthLabel ?? "",
        });
      }
    } catch {
      /* retry on poll */
    }
  }, []);

  const postVital = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/vital/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as VitalHealthState & { goLive?: VitalGoLiveReportRow; tour?: { ok?: boolean } };
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
    if (
      lastSkillId === "sync_wearables" ||
      lastSkillId === "publish_context" ||
      lastSkillId === "ingest_report" ||
      lastSkillId === "update_protocol" ||
      lastSkillId === "ask_longevity"
    ) {
      void load();
    }
  }, [skillTick, lastSkillId, load]);

  const syncMesh = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await postVital({ action: "sync_mesh" });
      if (data?.goLive) setGoLive(data.goLive);
      setMeshPublished(true);
      await load();
    } finally {
      setSyncing(false);
    }
  }, [load, postVital]);

  const runDemoTour = useCallback(async () => {
    setDemoTourRunning(true);
    try {
      const data = await postVital({ action: "run_demo_tour" });
      if (data?.goLive) setGoLive(data.goLive);
      setMeshPublished(true);
      await load();
    } finally {
      setDemoTourRunning(false);
    }
  }, [load, postVital]);

  const connectApp = useCallback(
    async (app: string) => {
      await postVital({ action: "connect", app });
      await load();
    },
    [load, postVital],
  );

  const connectedBridges = state?.healthAppSync.filter((a) => a.connected).length ?? 0;
  const stats = {
    connectedBridges,
    reportCount: state?.reports.length ?? 0,
    protocolSteps: state?.protocol.length ?? 0,
    meshPublished,
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">
          {getOotbApp("my-vital").name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="font-sans text-xl font-semibold text-stark">Longevity protocol desk</h2>
          <VitalLevelBadge growthLevel={growthLevel} />
        </div>
        <p className="mt-2 font-sans text-sm text-muted">{vitalDeskSubtitle(growthLevel)}</p>
      </header>

      {vitalFeatureVisible(growthLevel, "level-up-nudge") ? (
        <VitalLevelUpNudge growthLevel={growthLevel} stats={stats} />
      ) : null}

      <PreviewModuleBanner appId="my-vital" />

      <section className="border border-line bg-panel p-4">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted">Go Live</h3>
        <p className="mt-1 font-sans text-xs text-muted">Lab · vitals · mesh — honest preview for bridges</p>
        <div className="mt-3">
          <VitalGoLivePanel
            report={goLive}
            onRefresh={() => void postVital({ action: "go_live" }).then((j) => j?.goLive && setGoLive(j.goLive))}
            onRunDemoTour={() => void runDemoTour()}
            demoTourRunning={demoTourRunning}
          />
        </div>
      </section>

      <KinCrossLink variant="vital" />

      <VitalWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} growthLevel={growthLevel} />

      {workspaceTab === "lab" ? (
        <VitalLongevityLabPanel
          longevityFocus={typeof config.longevityFocus === "string" ? config.longevityFocus : undefined}
          onLabUsed={() => void load()}
        />
      ) : null}

      {state && workspaceTab === "overview" ? (
        <VitalOverviewPanel
          state={state}
          syncing={syncing}
          meshPublishVisible={vitalFeatureVisible(growthLevel, "mesh-publish")}
          onSyncMesh={() => void syncMesh()}
        />
      ) : null}

      {state && workspaceTab === "protocol" ? <VitalProtocolPanel protocol={state.protocol} /> : null}

      {state && workspaceTab === "reports" ? <VitalReportsPanel reports={state.reports} /> : null}

      {state && workspaceTab === "bridges" ? (
        <VitalBridgesPanel
          healthAppSync={state.healthAppSync}
          dietSync={state.dietSync}
          dietSyncVisible={vitalFeatureVisible(growthLevel, "diet-sync")}
          onConnectApp={connectApp}
          onReload={load}
        />
      ) : null}

      {state && workspaceTab === "analytics" ? (
        <VitalAnalyticsPanel
          vitals={state.vitals}
          dietSync={state.dietSync}
          protocolStepCount={state.protocol.length}
          analyticsLite={growthLevel === "L4"}
        />
      ) : null}

      {!state ? <p className="font-sans text-sm text-muted">Loading Vital desk…</p> : null}
    </div>
  );
}
