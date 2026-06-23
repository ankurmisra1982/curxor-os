"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import { PreviewModuleBanner } from "@/components/app-shared/PreviewModuleBanner";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { SwarmCafeXpPanel } from "@/components/apps/swarm/SwarmCafeXpPanel";
import { SwarmLevelBadge } from "@/components/apps/swarm/SwarmLevelBadge";
import { SwarmRobotaxiVisionPanel } from "@/components/apps/swarm/SwarmRobotaxiVisionPanel";
import { SwarmWorkloadPanel } from "@/components/apps/swarm/SwarmWorkloadPanel";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { getOotbApp } from "@/lib/ootb-apps";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { isGrowthLevel } from "@/lib/os-growth-level";
import { resolveSwarmGrowthLevel } from "@/lib/swarm-growth";
import { swarmSectionVisible } from "@/lib/swarm-level-gates";
import {
  SWARM_GRID,
  applyRecall,
  applyRoute,
  pickDispatchUnit,
  rebalanceFleet,
  swarmConfigFromFre,
  type SwarmGridCell,
  type SwarmUnit,
} from "@/lib/swarm-fleet";
import type { SwarmWorkloadItem } from "@/lib/swarm-workload-types";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

interface SwarmGoLiveStep {
  id: string;
  label: string;
  status: string;
  detail: string;
}

interface SwarmBootstrap {
  fleet: SwarmUnit[];
  forgeRoster: Array<{
    id: string;
    name: string;
    intent: string;
    meshConnected: boolean;
    forgedAppSlug: string | null;
    provisioningMode: string | null;
  }>;
  meshLinked: number;
  activeClawId: string | null;
  profileSource: "forge" | "mock";
  workloads?: SwarmWorkloadItem[];
  xpEvents?: Array<{ id: string; kind: string; at: string }>;
  xpStreak?: number;
  cafeBonus?: { eligible: boolean; reason: string; bonusXp: number };
  goLive?: {
    demoReady: boolean;
    fleetReady: boolean;
    steps: SwarmGoLiveStep[];
  };
  gamificationOptOut?: boolean;
}

function cellFromConfig(raw: unknown): SwarmGridCell | null {
  if (typeof raw !== "string") return null;
  return SWARM_GRID.includes(raw as SwarmGridCell) ? (raw as SwarmGridCell) : null;
}

export function RobotaxiApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { frame } = useVisionStream();
  const { command } = useMotorStream();
  const { level: experienceLevel } = useExperienceLevel();

  const [settingsGrowth, setSettingsGrowth] = useState<GrowthLevel | null>(null);
  const swarmConfig = useMemo(() => swarmConfigFromFre(config), [config]);
  const growthLevel = useMemo(
    () => resolveSwarmGrowthLevel(config, experienceLevel, settingsGrowth),
    [config, experienceLevel, settingsGrowth],
  );

  const [bootstrap, setBootstrap] = useState<SwarmBootstrap | null>(null);
  const [fleet, setFleet] = useState<SwarmUnit[]>([]);
  const [selected, setSelected] = useState("");
  const [targetCell, setTargetCell] = useState<SwarmGridCell>("B3");
  const [audit, setAudit] = useState<string[]>([]);
  const [roundRobin, setRoundRobin] = useState(0);
  const [lastPing, setLastPing] = useState<{ rttMs: number; source: string } | null>(null);
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const logAudit = useCallback((line: string) => {
    setAudit((prev) => [line, ...prev].slice(0, 8));
  }, []);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const g = data?.settings?.appearance?.swarmGrowthLevel;
        if (isGrowthLevel(g)) setSettingsGrowth(g);
      })
      .catch(() => undefined);
  }, []);

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await fetch("/api/swarm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard_bootstrap" }),
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as SwarmBootstrap;
      setBootstrap(data);
      setFleet(data.fleet);
      setSelected((prev) => prev || data.fleet[0]?.id || "");
    } catch {
      /* dev offline */
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    const unitId = typeof config.selectedUnitId === "string" ? config.selectedUnitId : null;
    const cell = cellFromConfig(config.targetCell);
    if (unitId) setSelected(unitId);
    if (cell) setTargetCell(cell);
  }, [config.selectedUnitId, config.targetCell]);

  useEffect(() => {
    if (typeof config.lastPingRttMs === "number") {
      setLastPing({
        rttMs: config.lastPingRttMs,
        source: typeof config.lastPingSource === "string" ? config.lastPingSource : "mesh",
      });
    }
  }, [config.lastPingRttMs, config.lastPingSource]);

  useEffect(() => {
    updateWorkspaceContext({
      selectedUnitId: selected,
      targetCell,
      dispatchPolicy: swarmConfig.dispatchPolicy,
    });
  }, [selected, targetCell, swarmConfig.dispatchPolicy, updateWorkspaceContext]);

  const runPing = useCallback(
    async (unitId: string) => {
      try {
        const res = await fetch("/api/swarm/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ping_unit", unitId }),
          cache: "no-store",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          ok: boolean;
          fleet?: SwarmUnit[];
          ping?: { rttMs: number; source: string };
        };
        if (data.fleet) setFleet(data.fleet);
        if (data.ping) {
          setLastPing(data.ping);
          updateWorkspaceContext({
            lastPingRttMs: data.ping.rttMs,
            lastPingSource: data.ping.source,
          });
        }
        return data.ping ?? null;
      } catch {
        return null;
      }
    },
    [updateWorkspaceContext],
  );

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;

    if (lastSkillId === "assign_route") {
      const unitId = typeof config.selectedUnitId === "string" ? config.selectedUnitId : selected;
      const cell = cellFromConfig(config.targetCell) ?? targetCell;
      setFleet((prev) => {
        const next = applyRoute(prev, unitId, cell);
        logAudit(`Assign Route · ${unitId} → ${cell} · policy ${swarmConfig.dispatchPolicy}`);
        return next;
      });
      void fetch("/api/swarm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "emit_xp", kind: "dispatch_completed" }),
      }).then(() => loadBootstrap());
      return;
    }

    if (lastSkillId === "recall_vehicle") {
      const unitId = typeof config.selectedUnitId === "string" ? config.selectedUnitId : selected;
      setFleet((prev) => {
        const next = applyRecall(prev, unitId, swarmConfig.depotGrid);
        logAudit(`Recall · ${unitId} → depot ${swarmConfig.depotGrid}`);
        return next;
      });
      return;
    }

    if (lastSkillId === "ping_unit") {
      const unitId = typeof config.selectedUnitId === "string" ? config.selectedUnitId : selected;
      void runPing(unitId).then((ping) => {
        logAudit(`Ping · ${unitId} · RTT ${ping?.rttMs ?? "—"}ms (${ping?.source ?? "local"})`);
      });
      return;
    }

    if (lastSkillId === "rebalance") {
      setFleet((prev) => {
        const next = rebalanceFleet(prev, swarmConfig.dispatchPolicy, swarmConfig.depotGrid);
        logAudit(`Rebalance · policy ${swarmConfig.dispatchPolicy} · ${next.length} units`);
        return next;
      });
      setRoundRobin((n) => n + 1);
      void fetch("/api/swarm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "emit_xp", kind: "rebalance" }),
      }).then(() => loadBootstrap());
    }
  }, [skillTick, lastSkillId, selected, targetCell, swarmConfig, logAudit, config, runPing, loadBootstrap]);

  const suggestedUnit = useMemo(
    () => pickDispatchUnit(fleet, swarmConfig.dispatchPolicy, roundRobin),
    [fleet, swarmConfig.dispatchPolicy, roundRobin],
  );

  const profileLabel = bootstrap?.profileSource === "forge" ? "Forge fleet" : "Demo fleet";
  const workloads = bootstrap?.workloads ?? [];

  const routeWorkload = useCallback(
    async (item: SwarmWorkloadItem) => {
      const unit = pickDispatchUnit(fleet, swarmConfig.dispatchPolicy, roundRobin) ?? fleet[0];
      if (!unit) return;
      setActionLoading(true);
      try {
        setSelected(unit.id);
        setTargetCell(item.targetCell);
        setSelectedWorkloadId(item.id);
        updateWorkspaceContext({ selectedUnitId: unit.id, targetCell: item.targetCell });
        await fetch("/api/swarm/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign_workload",
            workloadId: item.id,
            unitId: unit.id,
          }),
        });
        await loadBootstrap();
        logAudit(`Workload ${item.id} → ${unit.label} @ ${item.targetCell}`);
      } finally {
        setActionLoading(false);
      }
    },
    [fleet, swarmConfig.dispatchPolicy, roundRobin, updateWorkspaceContext, loadBootstrap, logAudit],
  );

  const completeWorkload = useCallback(
    async (item: SwarmWorkloadItem) => {
      setActionLoading(true);
      try {
        await fetch("/api/swarm/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete_workload", workloadId: item.id }),
        });
        await loadBootstrap();
        logAudit(`Workload ${item.id} complete`);
      } finally {
        setActionLoading(false);
      }
    },
    [loadBootstrap, logAudit],
  );

  const runExitDemo = useCallback(async () => {
    setActionLoading(true);
    try {
      await fetch("/api/swarm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_exit_demo" }),
      });
      await loadBootstrap();
      logAudit("Exit-demo fleet scenario seeded");
    } finally {
      setActionLoading(false);
    }
  }, [loadBootstrap, logAudit]);

  const depotCells = useMemo(() => {
    const cells = [swarmConfig.depotGrid];
    if (swarmConfig.secondaryDepotGrid) cells.push(swarmConfig.secondaryDepotGrid);
    return cells;
  }, [swarmConfig.depotGrid, swarmConfig.secondaryDepotGrid]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("robotaxi-fleet-manager").name}
          <PreviewModuleBanner appId="robotaxi-fleet-manager" compact />
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Swarm Command</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
          <span>
            depot {swarmConfig.depotGrid}
            {swarmConfig.secondaryDepotGrid ? ` + ${swarmConfig.secondaryDepotGrid}` : ""} · policy{" "}
            {swarmConfig.dispatchPolicy} · {profileLabel} · vision seq {frame?.seq ?? "—"}
          </span>
          <SwarmLevelBadge growthLevel={growthLevel} />
        </p>
      </header>

      <PreviewModuleBanner appId="robotaxi-fleet-manager" />

      <ExperienceAppSection
        appId="robotaxi-fleet-manager"
        sectionId="robotaxi-vision"
        minLevel="beginner"
        title="Robotaxi fleet horizon"
        subtitle="Acquire many Tesla Robotaxis · autonomous ops — preview until fleet bridge ships"
      >
        <SwarmRobotaxiVisionPanel />
      </ExperienceAppSection>

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric label="Active Unit" value={selected || "—"} unit="click row or cell" highlight />
        <AppMetric label="Target Cell" value={targetCell} unit="dispatch destination" />
        <AppMetric
          label="Suggested"
          value={suggestedUnit?.label ?? "—"}
          unit={`${swarmConfig.dispatchPolicy} pick`}
        />
        <AppMetric
          label="Mesh RTT"
          value={lastPing ? `${lastPing.rttMs}ms` : "—"}
          unit={lastPing?.source ?? "ping unit skill"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {swarmSectionVisible("grid", growthLevel) ? (
          <ExperienceAppSection
            appId="robotaxi-fleet-manager"
            sectionId="grid"
            minLevel="beginner"
            className="lg:col-span-3"
            title="Geospatial Grid"
            subtitle="Click cell to set dispatch target · chat auto-dispatch when you say “dispatch to B3”"
          >
            <div className="grid grid-cols-4 gap-1">
              {SWARM_GRID.map((cell) => {
                const occupied = fleet.find((v) => v.grid === cell);
                const isTarget = cell === targetCell;
                const isDepot = depotCells.includes(cell);
                return (
                  <button
                    key={cell}
                    type="button"
                    onClick={() => setTargetCell(cell)}
                    className={`aspect-square border p-1 font-mono text-[10px] ${
                      isTarget
                        ? "border-cursor-glow bg-surface text-cursor-glow"
                        : occupied
                          ? "border-cursor-glow/50 bg-panel text-stark"
                          : "border-line bg-void text-muted"
                    }`}
                  >
                    {cell}
                    {isDepot ? <div className="text-[8px] text-muted">depot</div> : null}
                    {occupied ? <div className="text-[8px] text-cursor-glow">{occupied.label}</div> : null}
                  </button>
                );
              })}
            </div>
          </ExperienceAppSection>
        ) : null}

        {swarmSectionVisible("fleet", growthLevel) ? (
          <ExperienceAppSection
            appId="robotaxi-fleet-manager"
            sectionId="fleet"
            minLevel="standard"
            className="lg:col-span-2"
            title="Fleet Status"
            subtitle="Select unit before dispatch skills"
          >
            <div className="space-y-2 font-mono text-xs">
              {fleet.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelected(v.id)}
                  className={`grid w-full grid-cols-5 gap-2 border px-3 py-2 text-left ${
                    selected === v.id ? "border-cursor-glow bg-surface" : "border-line bg-panel"
                  }`}
                >
                  <span className="text-cursor-glow">{v.label}</span>
                  <span>{v.grid}</span>
                  <span className="text-muted">{v.latency}ms</span>
                  <span className={v.charge < 40 ? "text-stark" : "text-cursor-glow"}>{v.charge}%</span>
                  <span className="truncate text-[10px] text-muted">{v.status}</span>
                </button>
              ))}
            </div>
          </ExperienceAppSection>
        ) : null}
      </div>

      {swarmSectionVisible("forge-roster", growthLevel) && bootstrap && bootstrap.forgeRoster.length > 0 ? (
        <AppSection
          title="Forge Roster"
          subtitle="Claws minted in The Forge — linked as swarm units when fleet size allows"
        >
          <div className="space-y-2 font-mono text-xs">
            {bootstrap.forgeRoster.slice(0, swarmConfig.fleetSize).map((entry) => (
              <div key={entry.id} className="grid grid-cols-4 gap-2 border border-line bg-panel px-3 py-2">
                <span className="truncate text-cursor-glow">{entry.name}</span>
                <span className="truncate text-muted">{entry.forgedAppSlug ?? entry.id.slice(0, 12)}</span>
                <span>{entry.meshConnected ? "mesh" : "local"}</span>
                <span className="truncate text-muted">{entry.provisioningMode ?? "—"}</span>
              </div>
            ))}
          </div>
        </AppSection>
      ) : null}

      {swarmSectionVisible("dispatch-policy", growthLevel) ? (
        <AppSection title="Dispatch Policy" subtitle="How Swarm picks the next unit when you ask or rebalance">
          <p className="font-mono text-xs text-muted">
            {swarmConfig.dispatchPolicy === "latency" &&
              "Lowest latency first — best for real-time mesh coordination."}
            {swarmConfig.dispatchPolicy === "charge" &&
              "Highest charge first — prioritize units with headroom."}
            {swarmConfig.dispatchPolicy === "round_robin" &&
              "Round robin — spread work evenly across the fleet."}
          </p>
        </AppSection>
      ) : null}

      {swarmSectionVisible("mesh-link", growthLevel) ? (
        <AppSection title="Mesh Link" subtitle="Motor stream + mesh RTT from ping_unit">
          <div className="grid gap-4 md:grid-cols-4 font-mono text-xs">
            <div className="border border-line bg-panel px-3 py-2">
              <p className="text-muted">Mesh linked</p>
              <p className="text-cursor-glow">
                {bootstrap?.meshLinked ?? 0} / {fleet.length}
              </p>
            </div>
            <div className="border border-line bg-panel px-3 py-2">
              <p className="text-muted">Motor claw</p>
              <p className="text-stark">{command?.clawId ? String(command.clawId) : "—"}</p>
            </div>
            <div className="border border-line bg-panel px-3 py-2">
              <p className="text-muted">Vision seq</p>
              <p className="text-stark">{frame?.seq ?? "—"}</p>
            </div>
            <div className="border border-line bg-panel px-3 py-2">
              <p className="text-muted">Last ping</p>
              <p className="text-stark">
                {lastPing ? `${lastPing.rttMs}ms · ${lastPing.source}` : "—"}
              </p>
            </div>
          </div>
        </AppSection>
      ) : null}

      {swarmSectionVisible("workloads", growthLevel) ? (
        <ExperienceAppSection
          appId="robotaxi-fleet-manager"
          sectionId="workloads"
          minLevel="standard"
          title="Cross-Claw Workloads"
          subtitle="Handoffs from Work, Capital, and Creator — route to fleet units"
        >
          <SwarmWorkloadPanel
            workloads={workloads}
            selectedId={selectedWorkloadId}
            loading={actionLoading}
            onSelect={(item) => {
              setSelectedWorkloadId(item.id);
              setTargetCell(item.targetCell);
            }}
            onAssign={(item) => void routeWorkload(item)}
            onComplete={(item) => void completeWorkload(item)}
          />
        </ExperienceAppSection>
      ) : null}

      {swarmSectionVisible("cafe-xp", growthLevel) ? (
        <ExperienceAppSection
          appId="robotaxi-fleet-manager"
          sectionId="cafe-xp"
          minLevel="standard"
          title="Claw Cafe XP"
          subtitle="Fleet milestones feed ascension when gamification is on"
        >
          <SwarmCafeXpPanel
            events={bootstrap?.xpEvents ?? []}
            streak={bootstrap?.xpStreak ?? 0}
            bonusReason={
              bootstrap?.cafeBonus?.eligible
                ? `Weekly bonus +${bootstrap.cafeBonus.bonusXp} · ${bootstrap.cafeBonus.reason}`
                : bootstrap?.cafeBonus?.reason
            }
            optOut={bootstrap?.gamificationOptOut}
            loading={actionLoading}
            onRefresh={() => void loadBootstrap()}
          />
        </ExperienceAppSection>
      ) : null}

      {swarmSectionVisible("exit-demo", growthLevel) ? (
        <AppSection
          title="Exit-Demo Fleet Scenario"
          subtitle="Seed cross-claw workloads for GTM fleet narrative"
        >
          <div className="space-y-3 font-mono text-xs">
            <p className="text-muted">
              Demo ready: {bootstrap?.goLive?.demoReady ? "yes" : "no"} · Fleet ready:{" "}
              {bootstrap?.goLive?.fleetReady ? "yes" : "no"}
            </p>
            <ul className="space-y-1 text-[10px] text-muted">
              {(bootstrap?.goLive?.steps ?? []).map((s) => (
                <li key={s.id}>
                  {s.label} · {s.status} — {s.detail}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void runExitDemo()}
              className="border border-cursor-glow px-3 py-1.5 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
            >
              Run exit-demo scenario
            </button>
            <p className="text-[10px] text-muted">
              Verify: <code className="text-cursor-glow">npm run verify:swarm-exit-demo-scaffold</code>
            </p>
          </div>
        </AppSection>
      ) : null}

      {swarmSectionVisible("audit-log", growthLevel) && audit.length > 0 ? (
        <AppSection title="Dispatch Audit" subtitle="Local log of fleet skills — no cloud egress">
          <ul className="space-y-1 font-mono text-[10px] text-muted">
            {audit.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </AppSection>
      ) : null}
    </div>
  );
}
